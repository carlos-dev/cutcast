import { S3Client } from '@aws-sdk/client-s3';

// Valida que as variáveis de ambiente necessárias estão configuradas
if (!process.env.R2_S3_API) {
  throw new Error('R2_S3_API não está configurado no .env');
}

if (!process.env.R2_ACCESS_KEY_ID) {
  throw new Error('R2_ACCESS_KEY_ID não está configurado no .env');
}

if (!process.env.R2_SECRET_ACCESS_KEY) {
  throw new Error('R2_SECRET_ACCESS_KEY não está configurado no .env');
}

if (!process.env.R2_BUCKET_NAME) {
  throw new Error('R2_BUCKET_NAME não está configurado no .env');
}

if (!process.env.R2_PUBLIC_DOMAIN) {
  throw new Error('R2_PUBLIC_DOMAIN não está configurado no .env');
}

/**
 * Cliente S3 configurado para Cloudflare R2
 *
 * Documentação:
 * - AWS SDK v3: https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-s3/
 * - Cloudflare R2: https://developers.cloudflare.com/r2/api/s3/api/
 */
export const r2Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_S3_API,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

/**
 * Nome do bucket R2
 */
export const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;

/**
 * Domínio público do R2 (sem barra no final)
 * Exemplo: https://pub-xxxxxxxxxxxxx.r2.dev
 */
export const R2_PUBLIC_DOMAIN = process.env.R2_PUBLIC_DOMAIN;

/**
 * Helper: Gera URL pública para um arquivo no R2
 * @param fileName Nome do arquivo no bucket
 * @returns URL pública completa
 */
export function getPublicUrl(fileName: string): string {
  return `${R2_PUBLIC_DOMAIN}/${fileName}`;
}

/**
 * Helper: Extrai o nome do arquivo de uma URL pública do R2
 * @param url URL pública do R2
 * @returns Nome do arquivo ou null se URL inválida
 */
export function extractFileNameFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/');
    const fileName = pathParts[pathParts.length - 1];
    return fileName || null;
  } catch {
    return null;
  }
}
