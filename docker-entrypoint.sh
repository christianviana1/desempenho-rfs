#!/bin/sh
set -e

echo "Aplicando migrations pendentes (prisma migrate deploy)..."
npx prisma migrate deploy

echo "Iniciando servidor Next.js..."
exec node server.js
