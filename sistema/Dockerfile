FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
COPY shared/package.json shared/package.json
COPY server/package.json server/package.json
COPY client/package.json client/package.json
RUN npm ci

COPY . .
RUN npm run build

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=4000

COPY --from=build /app/package.json /app/package-lock.json ./
COPY --from=build /app/shared/package.json /app/shared/package.json
COPY --from=build /app/server/package.json /app/server/package.json
COPY --from=build /app/client/package.json /app/client/package.json
RUN npm ci --omit=dev

COPY --from=build /app/server/dist /app/server/dist
COPY --from=build /app/client/dist /app/client/dist

EXPOSE 4000
CMD ["npm", "run", "start", "-w", "server"]
