# Use uma imagem base do Node (versão completa para ter as dependências de sistema)
FROM node:20

# Instala Python3 e FFmpeg (Necessários para youtube-dl)
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 1. Copia apenas os arquivos de dependência
COPY package*.json ./

# 2. 🚨 O PULO DO GATO: Copia a pasta do Prisma ANTES do npm install
# O script 'postinstall' do package.json roda 'prisma generate', que precisa desse arquivo
COPY prisma ./prisma/

# 3. Agora sim roda a instalação (vai encontrar o schema.prisma)
RUN npm install

# 4. Copia o restante do código fonte
COPY . .

# 5. Gera o cliente prisma novamente (garantia)
RUN npx prisma generate

# 6. Compila o TypeScript
RUN npm run build

# Expõe a porta
EXPOSE 3000

# Inicia
CMD ["npm", "start"]