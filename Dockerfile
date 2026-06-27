# Stage 1: build deps + Next.js (needs build tools for native modules)
FROM node:20-bookworm-slim AS builder

RUN apt-get update && apt-get install -y \
  python3 make g++ \
  libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev \
  --no-install-recommends && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Stage 2: lean runtime image
FROM node:20-bookworm-slim AS runner

# Runtime shared libs for canvas + tesseract binary
RUN apt-get update && apt-get install -y \
  libcairo2 libpango1.0-0 libjpeg62-turbo libgif7 librsvg2-2 \
  tesseract-ocr tesseract-ocr-eng \
  python3 make g++ \
  libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev \
  --no-install-recommends && rm -rf /var/lib/apt/lists/*

WORKDIR /app
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0

# Install only the production deps needed by the OCR worker scripts
# Done inside the runner so native binaries compile for Linux x64
COPY package*.json ./
RUN npm ci --omit=dev

# Next.js standalone bundle
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# OCR worker script
COPY --from=builder /app/scripts ./scripts

# Seed data — copied to /app/seed so the volume mount doesn't shadow them.
# entrypoint.sh copies them into /app/data only if not already present.
COPY --from=builder /app/data/users.json /app/seed/users.json
COPY --from=builder /app/data/groups.json /app/seed/groups.json

COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

RUN mkdir -p /app/data /app/uploads
VOLUME ["/app/data", "/app/uploads"]

EXPOSE 3000
ENTRYPOINT ["/app/entrypoint.sh"]
