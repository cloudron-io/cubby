#!/bin/bash

set -eu

HELP_MESSAGE="
This script allows easier local development with a dockerized database

 Options:
   --fresh         Start with a fresh database
   --help          Show this message
"

fresh="false"

args=$(getopt -o "" -l "help,fresh" -n "$0" -- "$@")
eval set -- "${args}"

while true; do
    case "$1" in
    --help) echo -e "${HELP_MESSAGE}"; exit 0;;
    --fresh) fresh="true"; shift;;
    --) break;;
    *) echo "Unknown option $1"; exit 1;;
    esac
done

# create the same postgres server version to test with
CONTAINER_NAME="postgres-server-cubby"

export CLOUDRON_POSTGRESQL_USERNAME="postgres"
export CLOUDRON_POSTGRESQL_PASSWORD="password"
export CLOUDRON_POSTGRESQL_DATABASE="cubby"
export CLOUDRON_POSTGRESQL_PORT=5432

if [[ "${fresh}" == "true" ]]; then
    echo "=> Removing postgres container ${CONTAINER_NAME} if exists..."
    docker rm -f ${CONTAINER_NAME} || true
fi

OUT=`docker inspect ${CONTAINER_NAME}` || true
if [[ "${OUT}" = "[]" ]]; then
    echo "=> Starting ${CONTAINER_NAME}..."
    docker run --name ${CONTAINER_NAME} -e POSTGRES_PASSWORD=${CLOUDRON_POSTGRESQL_PASSWORD} -d postgres:12
else
    echo "=> ${CONTAINER_NAME} already created, just restarting. If you want to start fresh, run 'docker rm --force ${CONTAINER_NAME}'"
    docker restart ${CONTAINER_NAME}
fi

export CLOUDRON_POSTGRESQL_HOST=`docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' ${CONTAINER_NAME}`

export PGPASSWORD="${CLOUDRON_POSTGRESQL_PASSWORD}"
echo "=> Waiting for postgres server to be ready..."
while ! psql -h "${CLOUDRON_POSTGRESQL_HOST}" -U ${CLOUDRON_POSTGRESQL_USERNAME} -c "SELECT 1"; do
    sleep 1
done

echo "=> Ensure database"
psql -h "${CLOUDRON_POSTGRESQL_HOST}" -U ${CLOUDRON_POSTGRESQL_USERNAME} -tc "SELECT 1 FROM pg_database WHERE datname = '${CLOUDRON_POSTGRESQL_DATABASE}'" | grep -q 1 | psql -h "${CLOUDRON_POSTGRESQL_HOST}" -U postgres -c "CREATE DATABASE cubby" || true

export DEBUG="cubby*"

echo "=> Run database migrations"
DATABASE_URL="postgres://${CLOUDRON_POSTGRESQL_USERNAME}:${CLOUDRON_POSTGRESQL_PASSWORD}@${CLOUDRON_POSTGRESQL_HOST}/${CLOUDRON_POSTGRESQL_DATABASE}" ./node_modules/.bin/db-migrate up

echo "=> Ensure admin account with admin:admin"
./cli.js user-add --username admin --password admin --email admin@server.local --display-name Admin || true

echo "=> Start cubby"
./app.js