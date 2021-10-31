FROM cloudron/base:3.0.0@sha256:455c70428723e3a823198c57472785437eb6eab082e79b3ff04ea584faf46e92

RUN mkdir -p /app/code
WORKDIR /app/code

ADD package.json package-lock.json /app/code/
RUN npm install

ADD backend /app/code/backend
ADD migrations /app/code/migrations
ADD public /app/code/public

ADD frontend /app/code/frontend
ADD start.sh vue.config.js babel.config.js app.js cli.js /app/code/
RUN npm run build

CMD [ "/app/code/start.sh" ]
