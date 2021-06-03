#!/bin/bash

set -eu

export NODE_ENV=production

if [[ ! -f "/app/data/config.json" ]]; then
    echo "=> Create initial config.json"
    echo "{}" > "/app/data/config.json"
fi

echo "=> Ensure permissions"
chown -R cloudron:cloudron /app/data

echo "=> Run db-migration"
DATABASE_URL=${CLOUDRON_POSTGRESQL_URL} /app/code/node_modules/.bin/db-migrate up

echo "=> Start the server"
export DEBUG="cubby:*"
exec /usr/local/bin/gosu cloudron:cloudron node /app/code/app.js
