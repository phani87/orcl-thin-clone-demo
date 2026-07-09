FROM node:22-slim AS deps
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev

FROM node:22-slim
ENV NODE_ENV=production
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY src ./src
EXPOSE 3000
CMD ["node", "./src/server.js"]
