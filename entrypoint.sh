#!/bin/sh
set -e

# Seed default users/groups into the data volume on first boot
for f in users.json groups.json; do
  if [ ! -f "/app/data/$f" ]; then
    cp "/app/seed/$f" "/app/data/$f"
    echo "Seeded /app/data/$f"
  fi
done

exec node server.js
