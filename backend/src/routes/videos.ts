import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import os from 'os';
import youtubedl from 'youtube-dl-exec';
import { getVideoDurationInSeconds } from 'get-video-duration';

// Constantes de limite
const MAX_FILE_SIZE_BYTES = 1024 * 1024 * 1024; // 1GB

// Calcula custo em créditos baseado na duração (1 crédito a cada 30 minutos ou fração)
// 0-30min: 1 crédito, 31-60min: 2 créditos, 61min+: 3 créditos
function calculateCreditCost(durationSeconds: number): number {
  const cost = Math.ceil(durationSeconds / 1800); // 1800s = 30min
  return cost > 0 ? cost : 1; // Mínimo de 1 crédito
}

// Usa o binário do sistema se disponível (mais atualizado no Docker), senão usa o bundled
const ytdlp = fs.existsSync('/usr/local/bin/yt-dlp')
  ? youtubedl.create('/usr/local/bin/yt-dlp')
  : youtubedl;

import { PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { prisma } from '../lib/prisma';
import { r2Client, R2_BUCKET_NAME, getPublicUrl, extractKeyFromUrl } from '../lib/r2';

// Prefixo para uploads de vídeos originais
const R2_UPLOADS_PREFIX = 'uploads';
import { MultipartFile } from '@fastify/multipart';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import {
  createVideoJobSchema,
  listJobsSchema,
  deleteVideoJobSchema,
  getVideoJobSchema
} from '../schemas/videos.schemas';

export async function videosRoutes(
  fastify: FastifyInstance,
  options: FastifyPluginOptions
) {
  // Endpoint POST /videos
  fastify.post('/videos', {
    preHandler: requireAuth,
    schema: createVideoJobSchema
  }, async (request, reply) => {
    try {
      // Pega o userId do token autenticado
      const { userId } = request as AuthenticatedRequest;

      // Busca créditos do usuário (verificação detalhada será feita após calcular duração)
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { credits: true }
      });

      if (!user) {
        return reply.code(404).send({
          error: 'user_not_found',
          message: 'Usuário não encontrado.'
        });
      }

      let videoUrl: string;
      let withSubtitles: boolean = true; // Valor padrão
      let videoDurationSeconds: number = 0; // Duração do vídeo em segundos
      let creditCost: number = 1; // Custo em créditos (calculado baseado na duração)

      // Verifica se a requisição é multipart (upload de arquivo)
      if (request.isMultipart()) {
        const parts = request.parts();
        let fileData: MultipartFile | undefined;

        // Processa todas as partes do multipart
        for await (const part of parts) {
          if (part.type === 'file') {
            fileData = part as MultipartFile;
          } else if (part.type === 'field') {
            // Captura o campo withSubtitles do FormData
            if (part.fieldname === 'withSubtitles') {
              withSubtitles = part.value === 'true';
            }
          }
        }

        if (!fileData) {
          return reply.code(400).send({
            error: 'Nenhum arquivo foi enviado'
          });
        }

        // Gera um nome único para o arquivo
        const fileExtension = fileData.filename.split('.').pop() || 'mp4';
        const uniqueFileName = `${uuidv4()}.${fileExtension}`;

        // Salva temporariamente no disco para usar stream (otimiza memória)
        const tempFilePath = path.join(os.tmpdir(), uniqueFileName);

        try {
          // Salva o arquivo no disco temporário
          const writeStream = fs.createWriteStream(tempFilePath);
          await new Promise((resolve, reject) => {
            fileData.file.pipe(writeStream);
            fileData.file.on('end', resolve);
            fileData.file.on('error', reject);
            writeStream.on('error', reject);
          });

          fastify.log.info(`Arquivo salvo temporariamente em: ${tempFilePath}`);

          // Pega tamanho do arquivo
          const fileStats = fs.statSync(tempFilePath);
          fastify.log.info(`Tamanho do arquivo: ${(fileStats.size / 1024 / 1024).toFixed(2)} MB`);

          // Valida tamanho máximo do arquivo (1GB)
          if (fileStats.size > MAX_FILE_SIZE_BYTES) {
            // Remove arquivo temporário antes de retornar erro
            if (fs.existsSync(tempFilePath)) {
              fs.unlinkSync(tempFilePath);
            }
            return reply.code(413).send({
              error: 'file_too_large',
              message: 'O arquivo excede o limite de 1GB.'
            });
          }

          // ========== CALCULA DURAÇÃO E CUSTO ==========
          try {
            videoDurationSeconds = await getVideoDurationInSeconds(tempFilePath);
            fastify.log.info(`Duração do vídeo: ${(videoDurationSeconds / 60).toFixed(2)} minutos`);
          } catch (durationError) {
            fastify.log.warn(`Não foi possível calcular duração: ${durationError}. Assumindo custo mínimo.`);
            videoDurationSeconds = 1800; // Assume 30 min se não conseguir calcular (1 crédito)
          }

          creditCost = calculateCreditCost(videoDurationSeconds);
          fastify.log.info(`Custo calculado: ${creditCost} crédito(s)`);

          // Verifica se tem créditos suficientes
          if (user.credits < creditCost) {
            // Remove arquivo temporário antes de retornar erro
            if (fs.existsSync(tempFilePath)) {
              fs.unlinkSync(tempFilePath);
            }
            return reply.code(402).send({
              error: 'insufficient_credits',
              message: `Créditos insuficientes. Este vídeo custa ${creditCost} crédito(s), você tem ${user.credits}.`
            });
          }
          // =============================================

          // Cria stream de leitura para upload
          const fileStream = fs.createReadStream(tempFilePath);

          // Faz upload para o Cloudflare R2 usando Stream
          const r2Key = `${R2_UPLOADS_PREFIX}/${uniqueFileName}`;
          const putCommand = new PutObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: r2Key,
            Body: fileStream,
            ContentType: fileData.mimetype,
            ContentLength: fileStats.size
          });

          await r2Client.send(putCommand);

          // Gera a URL pública do arquivo
          videoUrl = getPublicUrl(r2Key);
          fastify.log.info(`Arquivo enviado com sucesso para R2: ${videoUrl}`);

        } catch (error) {
          fastify.log.error(`Erro ao fazer upload para R2: ${error}`);
          return reply.code(500).send({
            error: 'Erro ao processar upload do arquivo'
          });
        } finally {
          // Limpa o arquivo temporário
          try {
            if (fs.existsSync(tempFilePath)) {
              fs.unlinkSync(tempFilePath);
              fastify.log.info(`Arquivo temporário removido: ${tempFilePath}`);
            }
          } catch (cleanupError) {
            fastify.log.warn(`Erro ao limpar arquivo temporário: ${cleanupError}`);
          }
        }

      } else {
        // Requisição JSON com videoUrl
        const body = request.body as { videoUrl?: string; withSubtitles?: boolean };

        if (!body || !body.videoUrl) {
          return reply.code(400).send({
            error: 'O campo videoUrl é obrigatório ou envie um arquivo via multipart/form-data'
          });
        }

        // Valida se é uma URL válida
        try {
          new URL(body.videoUrl);
        } catch {
          return reply.code(400).send({
            error: 'videoUrl deve ser uma URL válida'
          });
        }

        // Faz download da URL e upload para R2 usando youtube-dl-exec
        const tempJobId = uuidv4(); // ID temporário para nome do arquivo
        const tempFilePath = path.join(os.tmpdir(), `${tempJobId}.mp4`);

        try {
          fastify.log.info(`Baixando vídeo de: ${body.videoUrl}`);

          // Usa youtube-dl-exec para baixar o vídeo (suporta YouTube, Instagram, TikTok, etc.)
          fastify.log.info(`Iniciando download com yt-dlp para: ${tempFilePath}`);

          try {
            const result = await ytdlp(body.videoUrl, {
              output: tempFilePath,
              format: 'best[ext=mp4]/best', // Prioriza MP4, mas aceita outros formatos
              noCheckCertificates: true,
              noWarnings: true,
              preferFreeFormats: true,
              // Headers mais realistas
              addHeader: [
                'referer:https://www.youtube.com/',
                'user-agent:Mozilla/5.0 (Linux; Android 14; Pixel 8 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
                'accept-language:en-US,en;q=0.9'
              ],
              verbose: true,
              // Usa player clients alternativos que têm menos restrições
              ...({
                extractorArgs: 'youtube:player_client=android,ios,mweb',
                extractorRetries: 3
              } as Record<string, unknown>)
            });
            fastify.log.info(`yt-dlp resultado: ${JSON.stringify(result)}`);
          } catch (ytdlError) {
            fastify.log.error(`yt-dlp erro detalhado: ${ytdlError}`);
            throw ytdlError;
          }

          fastify.log.info(`Vídeo baixado com sucesso em: ${tempFilePath}`);

          // Verifica se o arquivo foi criado
          if (!fs.existsSync(tempFilePath)) {
            throw new Error('Arquivo não foi baixado corretamente');
          }

          // Pega informações do arquivo e verifica se não está vazio
          const fileStats = fs.statSync(tempFilePath);
          if (fileStats.size === 0) {
            throw new Error('O arquivo baixado está vazio. O vídeo pode estar protegido ou indisponível.');
          }
          fastify.log.info(`Tamanho do vídeo: ${(fileStats.size / 1024 / 1024).toFixed(2)} MB`);

          // ========== CALCULA DURAÇÃO E CUSTO ==========
          try {
            videoDurationSeconds = await getVideoDurationInSeconds(tempFilePath);
            fastify.log.info(`Duração do vídeo: ${(videoDurationSeconds / 60).toFixed(2)} minutos`);
          } catch (durationError) {
            fastify.log.warn(`Não foi possível calcular duração: ${durationError}. Assumindo custo mínimo.`);
            videoDurationSeconds = 1800; // Assume 30 min se não conseguir calcular (1 crédito)
          }

          creditCost = calculateCreditCost(videoDurationSeconds);
          fastify.log.info(`Custo calculado: ${creditCost} crédito(s)`);

          // Verifica se tem créditos suficientes
          if (user.credits < creditCost) {
            // Remove arquivo temporário antes de retornar erro
            if (fs.existsSync(tempFilePath)) {
              fs.unlinkSync(tempFilePath);
            }
            return reply.code(402).send({
              error: 'insufficient_credits',
              message: `Créditos insuficientes. Este vídeo custa ${creditCost} crédito(s), você tem ${user.credits}.`
            });
          }
          // =============================================

          // Gera nome único para o arquivo no R2
          const uniqueFileName = `${uuidv4()}.mp4`;
          const r2Key = `${R2_UPLOADS_PREFIX}/${uniqueFileName}`;

          // Cria stream de leitura do arquivo (otimiza memória)
          const fileStream = fs.createReadStream(tempFilePath);

          // Faz upload para R2 usando Stream
          const putCommand = new PutObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: r2Key,
            Body: fileStream,
            ContentType: 'video/mp4',
            ContentLength: fileStats.size
          });

          await r2Client.send(putCommand);

          // Gera URL pública do R2
          videoUrl = getPublicUrl(r2Key);
          fastify.log.info(`Vídeo enviado para R2: ${videoUrl}`);

        } catch (error) {
          fastify.log.error(`Erro ao processar URL do vídeo: ${error}`);
          return reply.code(500).send({
            error: 'Erro ao baixar ou fazer upload do vídeo da URL fornecida. Verifique se a URL é válida e acessível.'
          });
        } finally {
          // Limpa o arquivo temporário
          try {
            if (fs.existsSync(tempFilePath)) {
              fs.unlinkSync(tempFilePath);
              fastify.log.info(`Arquivo temporário removido: ${tempFilePath}`);
            }
          } catch (cleanupError) {
            fastify.log.warn(`Erro ao limpar arquivo temporário: ${cleanupError}`);
          }
        }

        // Captura withSubtitles do body JSON (default true se não fornecido)
        withSubtitles = body.withSubtitles !== undefined ? body.withSubtitles : true;
      }

      // Verifica se o webhook do n8n está configurado
      const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL;

      if (!n8nWebhookUrl) {
        fastify.log.error('N8N_WEBHOOK_URL não configurada no .env');
        return reply.code(500).send({
          error: 'Serviço de processamento de vídeo não configurado. Configure N8N_WEBHOOK_URL no .env'
        });
      }

      // Gera um ID único para o job
      const jobId = uuidv4();

      // Log dos parâmetros que serão enviados ao n8n
      fastify.log.info(`Chamando webhook n8n - jobId: ${jobId}, withSubtitles: ${withSubtitles}`);

      // Tenta chamar o webhook do n8n ANTES de criar o job no banco
      try {
        const response = await fetch(n8nWebhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            videoUrl: videoUrl,
            jobId,
            withSubtitles
          })
        });

        if (!response.ok) {
          fastify.log.error(`Webhook n8n retornou status ${response.status}`);
          return reply.code(502).send({
            error: `Serviço de processamento indisponível (status ${response.status}). Verifique se o workflow do n8n está ativo.`
          });
        }

        fastify.log.info(`Webhook n8n chamado com sucesso para job ${jobId}`);
      } catch (error) {
        fastify.log.error(`Erro ao chamar webhook n8n: ${error}`);
        return reply.code(503).send({
          error: 'Serviço de processamento de vídeo indisponível. Verifique se o n8n está rodando e o webhook está ativo.'
        });
      }

      // Só cria o job no banco se o n8n respondeu com sucesso
      // Usa transação para criar job E decrementar créditos atomicamente
      const job = await prisma.$transaction(async (tx) => {
        // Decrementa créditos do usuário baseado na duração do vídeo
        await tx.user.update({
          where: { id: userId },
          data: {
            credits: { decrement: creditCost }
          }
        });

        // Cria o job
        return tx.job.create({
          data: {
            id: jobId,
            userId: userId,
            inputUrl: videoUrl,
            status: 'PENDING'
          }
        });
      });

      // Retorna os dados do job criado
      return reply.code(201).send({
        job_id: job.id,
        status: job.status,
        videoUrl: videoUrl
      });

    } catch (error) {
      fastify.log.error(error as Error);
      return reply.code(500).send({
        error: 'Erro ao processar requisição'
      });
    }
  });

  // Endpoint GET /jobs para listar jobs do usuário autenticado
  fastify.get('/jobs', {
    preHandler: requireAuth,
    schema: listJobsSchema
  }, async (request, reply) => {
    const { userId } = request as AuthenticatedRequest;

    // Busca todos os jobs do usuário, ordenados por data de criação (mais recente primeiro)
    const jobs = await prisma.job.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });

    return reply.send({
      jobs: jobs.map(job => ({
        id: job.id,
        status: job.status,
        inputUrl: job.inputUrl,
        outputUrls: job.outputUrls,
        results: job.results,
        errorMessage: job.errorMessage,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt
      }))
    });
  });

  // Endpoint DELETE /videos/:id para deletar job e arquivo
  fastify.delete('/videos/:id', {
    preHandler: requireAuth,
    schema: deleteVideoJobSchema
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { userId } = request as AuthenticatedRequest;

    try {
      // Busca o job no banco
      const job = await prisma.job.findUnique({
        where: { id }
      });

      if (!job) {
        return reply.code(404).send({
          error: 'Job não encontrado'
        });
      }

      // Verifica se o usuário é o dono do job
      if (job.userId !== userId) {
        return reply.code(403).send({
          error: 'Acesso negado. Você não pode deletar jobs de outros usuários.'
        });
      }

      // Extrai a key completa da URL do R2 e deleta do storage
      if (job.inputUrl) {
        try {
          const r2Key = extractKeyFromUrl(job.inputUrl);

          if (r2Key) {
            // Deleta o arquivo do Cloudflare R2
            const deleteCommand = new DeleteObjectCommand({
              Bucket: R2_BUCKET_NAME,
              Key: r2Key,
            });

            await r2Client.send(deleteCommand);
            fastify.log.info(`Arquivo ${r2Key} deletado do R2`);
          }
        } catch (error) {
          fastify.log.warn(`Erro ao deletar arquivo do R2: ${error}`);
          // Continua mesmo se falhar ao deletar do storage
        }
      }

      // Deleta o job do banco (CASCADE deleta callbacks relacionados)
      await prisma.job.delete({
        where: { id }
      });

      fastify.log.info(`Job ${id} deletado com sucesso pelo usuário ${userId}`);

      return reply.send({
        message: 'Job e vídeo deletados com sucesso',
        jobId: id
      });

    } catch (error) {
      fastify.log.error(error as Error);
      return reply.code(500).send({
        error: 'Erro ao deletar job'
      });
    }
  });

  
  // Endpoint GET /videos/:id para consultar status
  fastify.get('/videos/:id', {
    schema: getVideoJobSchema
  }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const job = await prisma.job.findUnique({
      where: { id }
    });

    if (!job) {
      return reply.code(404).send({
        error: 'Job não encontrado'
      });
    }

    return reply.send({
      jobId: job.id,
      status: job.status,
      inputUrl: job.inputUrl,
      outputUrls: job.outputUrls,
      results: job.results,
      errorMessage: job.errorMessage,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt
    });
  });
}

