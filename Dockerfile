FROM cloudron/base:3.2.0@sha256:ba1d566164a67c266782545ea9809dc611c4152e27686fd14060332dd88263ea


ENV CLOUDRON_POSTGRESQL_USERNAME="postgres" \
    CLOUDRON_POSTGRESQL_PASSWORD="password" \
    CLOUDRON_POSTGRESQL_DATABASE="cubby" \
    CLOUDRON_POSTGRESQL_PORT=5432 \
    CONTAINER_NAME="postgres-server-cubby" \
    CLOUDRON_POSTGRESQL_HOST="postgres-server-cubby" \
    PGPASSWORD="${CLOUDRON_POSTGRESQL_PASSWORD}" \
    DEBUG="cubby*"

RUN mkdir -p /app/code \
    && mkdir /app/data

WORKDIR /app/code

COPY frontend /app/code/frontend
COPY public /app/code/public
COPY migrations /app/code/migrations
COPY backend /app/code/backend
COPY package.json package-lock.json \
     start.sh vue.config.js babel.config.js app.js cli.js \
     /app/code/

RUN npm install \
    && npm run build

CMD [ "/app/code/start.sh" ]

