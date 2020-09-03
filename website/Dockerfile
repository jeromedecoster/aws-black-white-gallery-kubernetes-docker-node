FROM softonic/node-prune AS prune

FROM node:14.5-alpine AS build
# With `NODE_ENV=production` npm install will skip devDependencies packages
ENV NODE_ENV production
WORKDIR /app
COPY --from=prune /go/bin/node-prune /usr/local/bin/
ADD . .
RUN npm install --quiet
RUN node-prune

FROM node:14.5-alpine
ENV NODE_ENV production
WORKDIR /app
COPY --from=build /app .
CMD ["node", "server.js"]