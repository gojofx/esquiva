#!/bin/sh
# Actualiza el juego en el servidor desde GitHub. Ejecutar como root:
#   sh /var/www/html/esquiva/deploy/actualizar.sh
set -eu
DIR=/var/www/html/esquiva
cd "$DIR"
export PATH="/root/.nvm/versions/node/$(ls /root/.nvm/versions/node | sort -V | tail -1)/bin:$PATH"

git pull --ff-only
npm ci --no-audit --no-fund
npm run build

# data/ y .env son del usuario del servicio; el resto, de root y solo lectura
mkdir -p data
chown -R esquiva:esquiva data
[ -f .env ] && chown esquiva:esquiva .env && chmod 600 .env

systemctl restart esquiva
sleep 2
systemctl is-active esquiva
curl -s -o /dev/null -w "página: %{http_code}\n" -H "Host: esquiva.undubb.online" http://127.0.0.1/
