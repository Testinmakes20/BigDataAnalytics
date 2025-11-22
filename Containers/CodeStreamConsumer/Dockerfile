FROM node:18-alpine
RUN npm install -g nodemon
EXPOSE 3000
WORKDIR /app
COPY . .
COPY ./src /app/src
RUN ls -la /app
RUN npm install
ENV DEBUG='csconsumer:*'
ENTRYPOINT ["npm", "run", "dev"]
