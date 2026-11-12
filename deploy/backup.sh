#!/usr/bin/env bash
# Backup consistente do SQLite + uploads. Uso: ./deploy/backup.sh [destino]
set -euo pipefail
DEST="${1:-./backups}"
STAMP="$(date +%Y%m%d-%H%M%S)"
mkdir -p "$DEST"
docker compose exec -T api node -e "
  const Database = require('better-sqlite3');
  new Database('/data/swiftmarket.db').backup('/data/backup.db').then(() => process.exit(0));
"
docker compose cp api:/data/backup.db "$DEST/swiftmarket-$STAMP.db"
docker compose cp api:/data/uploads "$DEST/uploads-$STAMP"
echo "Backup salvo em $DEST (swiftmarket-$STAMP.db + uploads-$STAMP)"
