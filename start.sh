#!/bin/bash

set -eu

export NODE_ENV=production

echo "=> Ensure permissions"
chown -R cloudron:cloudron /app/data

echo "=> Run db-migration"
DATABASE_URL=${CLOUDRON_POSTGRESQL_URL} /app/code/node_modules/.bin/db-migrate up

echo "=> Ensure admin account with admin:admin"
/app/code/cli.js user-add --username admin --password admin --email admin@server.local --display-name Admin || true

echo "=> Start the server"
exec /usr/local/bin/gosu cloudron:cloudron node /app/code/app.js
