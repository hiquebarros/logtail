FROM node:20-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS dev
ENV NODE_ENV=development
COPY tsconfig.json ./
COPY prisma ./prisma
COPY src ./src
EXPOSE 3001
CMD ["npm", "run", "dev"]

FROM deps AS build
COPY tsconfig.json ./
COPY prisma ./prisma
COPY src ./src
RUN npm run prisma:generate
RUN npm run build

FROM base AS runner
ENV NODE_ENV=production
WORKDIR /app
USER node
COPY --chown=node:node package.json package-lock.json ./
COPY --chown=node:node --from=deps /app/node_modules ./node_modules
COPY --chown=node:node --from=build /app/dist ./dist
COPY --chown=node:node --from=build /app/prisma ./prisma
EXPOSE 3001
CMD ["npm", "run", "start"]
