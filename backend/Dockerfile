# Usa uma imagem base leve do Node 20
FROM node:20-slim

# 1. Instala Python 3 e FFmpeg (Obrigatórios para baixar do YouTube)
RUN apt-get update && \
    apt-get install -y python3 python3-pip ffmpeg && \
    rm -rf /var/lib/apt/lists/*

# Configura diretório de trabalho
WORKDIR /app

# 2. Copia arquivos de dependência
COPY package*.json ./

# Instala dependências do Node
RUN npm install

# 3. Copia o resto do código
COPY . .

# 4. Gera o cliente do Prisma
RUN npx prisma generate

# 5. Builda o projeto TypeScript
RUN npm run build

# Expõe a porta
EXPOSE 3000

# Comando para iniciar
CMD ["npm", "start"]