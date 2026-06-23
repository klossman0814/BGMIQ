# ---- Build Stage ----
FROM node:20-alpine AS builder
WORKDIR /app

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl

COPY package.json package-lock.json ./
RUN npm ci

COPY prisma/ ./prisma/
RUN npx prisma generate

COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build

# ---- Production Stage ----
FROM node:20-alpine
WORKDIR /app

RUN apk add --no-cache openssl postgresql-client curl

# Install tsx globally for Prisma seed (TypeScript)
RUN npm install -g tsx

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/dist ./dist

# Entrypoint: wait for DB, run migrations + seed, then start server
COPY <<'SCRIPT' /usr/local/bin/entrypoint.sh
#!/bin/sh
set -e

echo "⏳ Waiting for PostgreSQL at ${DB_HOST:-db}:${DB_PORT:-5432}..."
until pg_isready -h "${DB_HOST:-db}" -p "${DB_PORT:-5432}" -U "${DB_USER:-postgres}" 2>/dev/null; do
  sleep 1
done
echo "✅ PostgreSQL is ready"

echo "📦 Running Prisma migrations..."
# Remove duplicate glucose readings before adding unique constraint
PGPASSWORD="${DB_PASSWORD:-postgres}" psql -h "${DB_HOST:-db}" -p "${DB_PORT:-5432}" -U "${DB_USER:-postgres}" -d bgmiq -t -c "
DELETE FROM \"GlucoseReading\" g1 USING (
  SELECT MIN(id) as id, \"userId\", \"readingDatetime\", \"glucoseValue\"
  FROM \"GlucoseReading\"
  GROUP BY \"userId\", \"readingDatetime\", \"glucoseValue\"
  HAVING COUNT(*) > 1
) g2 WHERE g1.\"userId\" = g2.\"userId\"
  AND g1.\"readingDatetime\" = g2.\"readingDatetime\"
  AND g1.\"glucoseValue\" = g2.\"glucoseValue\"
  AND g1.id != g2.id;
" 2>&1 || echo "⚠️ Dedup cleanup skipped"
npx prisma db push --accept-data-loss 2>&1

echo "🌱 Seeding database (if empty)..."
USER_EXISTS=$(PGPASSWORD="${DB_PASSWORD:-postgres}" psql -h "${DB_HOST:-db}" -p "${DB_PORT:-5432}" -U "${DB_USER:-postgres}" -d bgmiq -t -c "SELECT count(*) FROM \"User\" WHERE email='demo@bgmiq.com';" 2>/dev/null | tr -d ' ')
if [ "$USER_EXISTS" != "0" ] && [ -n "$USER_EXISTS" ]; then
  echo "✅ Database already seeded — skipping"
else
  npx prisma db seed 2>&1 || echo "⚠️ Seed failed (continuing)"
fi

echo "🚀 Starting BGMIQ API server on port ${PORT:-3013}"
exec node dist/index.js
SCRIPT

RUN chmod +x /usr/local/bin/entrypoint.sh

EXPOSE ${PORT:-3013}

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]