FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --no-audit --no-fund

COPY tsconfig*.json ./
COPY src ./src
RUN npm run build

ENV NODE_ENV=production
ENV PORT=3001
ENV SEED_ON_START=true
EXPOSE 3001

CMD ["node", "dist/main.js"]
