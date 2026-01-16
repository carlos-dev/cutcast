# Use uma imagem base do Node que permite instalar pacotes do sistema (Debian)
FROM node:20

# Atualiza o sistema e instala Python3, PIP e FFmpeg (Necessários para youtube-dl)
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Define o diretório de trabalho
WORKDIR /app

# Copia os arquivos de dependência primeiro (para cache do Docker)
COPY package*.json ./

# Instala as dependências do Node
RUN npm install

# Copia o restante do código do backend
COPY . .

# Gera o cliente do Prisma (necessário para o banco de dados)
RUN npx prisma generate

# Compila o TypeScript para JavaScript
RUN npm run build

# Expõe a porta que o Fastify usa
EXPOSE 3000

# Comando para iniciar a aplicação
CMD ["npm", "start"]