FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
# Note: In dev, you might want to include devDeps for the watch flag
RUN npm install 

COPY src ./src

ENV PORT=3000
EXPOSE 3000

# Changed from start:backend to dev:backend to enable node --watch
CMD ["npm", "run", "dev:backend"]