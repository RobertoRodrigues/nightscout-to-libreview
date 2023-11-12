# Use a imagem oficial do Node.js como base
FROM node:20-slim

# Defina o diretório de trabalho no containerinstall
WORKDIR /app

# Copie o restante dos arquivos do projeto para o diretório de trabalho
COPY . .

# Copie o arquivo package.json e package-lock.json para o diretório de trabalho
COPY package*.json ./

# Instale as dependências do projeto
RUN npm install