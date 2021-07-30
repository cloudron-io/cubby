#!/bin/bash

set -eu

# create the same postgres server version to test with
CONTAINER_NAME="postgres-server-cubby"

export CLOUDRON_POSTGRESQL_USERNAME="postgres"
export CLOUDRON_POSTGRESQL_PASSWORD="password"
export CLOUDRON_POSTGRESQL_DATABASE="cubby"
export CLOUDRON_POSTGRESQL_PORT=5432

OUT=`docker inspect ${CONTAINER_NAME}` || true
if [[ "${OUT}" = "[]" ]]; then
    echo "=> Run ./develop.sh first to create and the database container"
    exit 1
fi

export CLOUDRON_POSTGRESQL_HOST=`docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' ${CONTAINER_NAME}`

export PGPASSWORD="${CLOUDRON_POSTGRESQL_PASSWORD}"

echo "=> Open database"
psql -h "${CLOUDRON_POSTGRESQL_HOST}" -U ${CLOUDRON_POSTGRESQL_USERNAME} -d ${CLOUDRON_POSTGRESQL_DATABASE} -t
