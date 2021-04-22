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

# create the same mysql server version to test with
CONTAINER_NAME="mysql-server-cubby"

if [[ "${fresh}" == "true" ]]; then
    echo "=> Removing mysql container ${CONTAINER_NAME} if exists..."
    docker rm -f ${CONTAINER_NAME} || true
fi

OUT=`docker inspect ${CONTAINER_NAME}` || true
if [[ "${OUT}" = "[]" ]]; then
    echo "=> Starting ${CONTAINER_NAME}..."
    docker run --name ${CONTAINER_NAME} -e MYSQL_ROOT_PASSWORD=password -d mysql:5.6.34
else
    echo "=> ${CONTAINER_NAME} already running. If you want to start fresh, run 'docker rm --force ${CONTAINER_NAME}'"
fi

export MYSQL_IP=`docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' ${CONTAINER_NAME}`

echo "=> Waiting for mysql server to be ready..."
while ! mysqladmin ping -h"${MYSQL_IP}" --silent; do
    sleep 1
done

echo "=> Ensure database"
mysql -h"${MYSQL_IP}" -uroot -ppassword -e 'CREATE DATABASE IF NOT EXISTS cubby'

export DEBUG="cubby*"

echo "=> Run database migrations"
DATABASE_URL="mysql://root:password@${MYSQL_IP}/cubby" ./node_modules/.bin/db-migrate up

echo "=> Ensure admin account with admin:admin"
./cli.js user-add --username admin --password admin --email admin@server.local --display-name Admin || true

echo "=> Start cubby"
./app.js