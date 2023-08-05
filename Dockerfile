FROM cloudron/base:4.0.0@sha256:31b195ed0662bdb06a6e8a5ddbedb6f191ce92e8bee04c03fb02dd4e9d0286df

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

