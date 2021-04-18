#!/bin/bash

set -eu

export NODE_ENV=production

echo "=> Ensure permissions"
chown -R cloudron:cloudron /app/data

echo "=> Run db-migration"
DATABASE_URL=${CLOUDRON_MYSQL_URL} /app/code/node_modules/.bin/db-migrate up

echo "=> Start the server"
exec /usr/local/bin/gosu cloudron:cloudron node /app/code/app.js
