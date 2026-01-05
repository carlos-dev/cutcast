# CutCast Backend - MVP

Backend para geração automática de cortes verticais a partir de vídeos longos.

## Como rodar

1. **Instale as dependências:**
```bash
npm install
```

2. **Inicie o servidor em modo desenvolvimento:**
```bash
npm run dev
```

O servidor estará disponível em `http://localhost:3000`

## Documentação da API

A documentação completa da API está disponível via **Swagger UI** em:

**http://localhost:3000/docs**

Através do Swagger você pode:
- Visualizar todos os endpoints disponíveis
- Ver os schemas de request e response
- Testar os endpoints diretamente pelo navegador

## Como testar

### Upload de vídeo

```bash
curl -X POST http://localhost:3000/videos \
  -F "file=@/caminho/para/seu/video.mp4"
```

**Resposta esperada:**
```json
{
  "job_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "UPLOADED"
}
```

### Consultar status de um job

```bash
curl http://localhost:3000/videos/550e8400-e29b-41d4-a716-446655440000
```

**Resposta esperada:**
```json
{
  "job_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "UPLOADED",
  "originalFilename": "video.mp4",
  "createdAt": "2025-01-05T14:30:00.000Z"
}
```

## Estrutura do projeto

```
cutcast/
├── src/
│   ├── index.ts      # Servidor Fastify e endpoints
│   └── types.ts      # Tipos TypeScript (VideoJob, JobStatus)
├── package.json
├── tsconfig.json
└── README.md
```

## Status do Job

- `UPLOADED`: Vídeo recebido, aguardando processamento
- `PROCESSING`: Em processamento
- `DONE`: Processamento concluído
- `FAILED`: Erro no processamento

## Próximos passos

- [ ] Salvar arquivo no sistema de arquivos ou S3
- [ ] Integrar com n8n para processamento
- [ ] Implementar callback de status
