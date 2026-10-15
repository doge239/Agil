FROM node:24

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

EXPOSE 4004

CMD ["npm", "run", "dev"]
