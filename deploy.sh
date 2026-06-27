#!/usr/bin/env bash
set -euo pipefail

COMMAND="${1:-up}"
ENV="${2:-dev}"

case "$ENV" in
  dev)  PORT="${PORT:-3050}" ;;
  uat)  PORT="${PORT:-4050}" ;;
  prod) PORT="${PORT:-5050}" ;;
  *)
    echo "Unknown environment: $ENV"
    echo "Usage: $0 {up|down|restart|logs} {dev|uat|prod}"
    exit 1
    ;;
esac

export PORT

case "$COMMAND" in
  up)
    echo "[$ENV] Building and starting containers..."
    docker compose up --build -d
    echo "[$ENV] App running at http://localhost:$PORT"
    ;;
  down)
    echo "[$ENV] Stopping containers..."
    docker compose down
    ;;
  restart)
    echo "[$ENV] Restarting containers..."
    docker compose down
    docker compose up --build -d
    echo "[$ENV] App running at http://localhost:$PORT"
    ;;
  logs)
    docker compose logs -f
    ;;
  *)
    echo "Usage: $0 {up|down|restart|logs} {dev|uat|prod}"
    exit 1
    ;;
esac
