FROM cloudron/base:4.2.0@sha256:46da2fffb36353ef714f97ae8e962bd2c212ca091108d768ba473078319a47f4

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

ARG NODE_VERSION=16.14.2
RUN mkdir -p /usr/local/node-$NODE_VERSION && \
    curl -L https://nodejs.org/dist/v$NODE_VERSION/node-v$NODE_VERSION-linux-x64.tar.gz | tar zxf - --strip-components 1 -C /usr/local/node-$NODE_VERSION
ENV PATH /usr/local/node-$NODE_VERSION/bin:$PATH

COPY . /app/code

RUN npm install
RUN npm run build

# for development
# RUN ./node_modules/.bin/vite build --sourcemap=inline

CMD [ "/app/code/start.sh" ]

