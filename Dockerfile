FROM cloudron/base:3.2.0@sha256:ba1d566164a67c266782545ea9809dc611c4152e27686fd14060332dd88263ea

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
