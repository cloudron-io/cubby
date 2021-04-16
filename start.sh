#!/bin/bash

set -eu

export NODE_ENV=production

echo "=> Ensure permissions"
chown -R cloudron:cloudron /app/data

echo "=> Start the server"
exec /usr/local/bin/gosu cloudron:cloudron node /app/code/app.js
