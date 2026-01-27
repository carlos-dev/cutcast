# Use uma imagem base do Node
FROM node:20

# Instala Python3, FFmpeg e dependências para yt-dlp
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    ffmpeg \
    curl \
    unzip \
    && rm -rf /var/lib/apt/lists/*

# Instala Deno (runtime JS necessário para yt-dlp gerar PO Token do YouTube)
RUN curl -fsSL https://github.com/denoland/deno/releases/latest/download/deno-x86_64-unknown-linux-gnu.zip -o /tmp/deno.zip \
    && unzip /tmp/deno.zip -d /usr/local/bin \
    && chmod +x /usr/local/bin/deno \
    && rm /tmp/deno.zip

WORKDIR /app

# 1. Copia os arquivos de definição de dependências
COPY package*.json ./

# 2. CRÍTICO: Copia a pasta prisma ANTES de instalar as dependências
# O script 'postinstall' do package.json roda 'prisma generate', que precisa desse arquivo
COPY prisma ./prisma/

# 3. Agora é seguro rodar o install (o schema já existe lá)
RUN npm install

# 4. Copia o restante do código fonte
COPY . .

# (Opcional) Garante que o cliente está gerado mais uma vez para segurança
RUN npx prisma generate

# 5. Builda o projeto
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]