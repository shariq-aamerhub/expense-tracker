#!/usr/bin/env bash
set -euo pipefail

COMMAND="${1:-up}"

case "$COMMAND" in
  up)
    echo "Building and starting containers..."
    docker compose up --build -d
    echo "App running at http://localhost:3003"
    ;;
  down)
    echo "Stopping containers..."
    docker compose down
    ;;
  restart)
    echo "Restarting containers..."
    docker compose down
    docker compose up --build -d
    echo "App running at http://localhost:3003"
    ;;
  logs)
    docker compose logs -f
    ;;
  *)
    echo "Usage: $0 {up|down|restart|logs}"
    exit 1
    ;;
esac
