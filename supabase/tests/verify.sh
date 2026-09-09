#!/usr/bin/env bash
# verify.sh — aplica as migrations num Postgres local descartável e roda o
# teste de RLS. Prova que a fundação funciona antes de tocar no Supabase.
#
# Uso:  ./supabase/tests/verify.sh
# Saída esperada na última linha:  RLS TEST: PASS
#
# Por que existe: aplicar migration direto em banco real e descobrir o erro lá
# é caro e deixa rastro. Aqui o banco é criado, verificado e jogado fora. Foi
# assim que a regra "NOW = 1" foi pega errada antes de existir qualquer dado.

set -euo pipefail

PGBIN=${PGBIN:-/usr/lib/postgresql/16/bin}
PGDATA=${PGDATA:-/tmp/pgdata}
PGSOCK=${PGSOCK:-/tmp/pgrun}
PGPORT=${PGPORT:-5433}
DB=verify_$$

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

export PGHOST="$PGSOCK" PGPORT PGUSER=postgres

# Sobe o cluster se ainda não estiver de pé
if ! "$PGBIN/pg_isready" -h "$PGSOCK" -p "$PGPORT" >/dev/null 2>&1; then
  echo "→ subindo Postgres local em $PGDATA"
  id postgres >/dev/null 2>&1 || useradd -m postgres
  mkdir -p "$PGDATA" "$PGSOCK"
  chown -R postgres:postgres "$PGDATA" "$PGSOCK"
  [ -f "$PGDATA/PG_VERSION" ] || \
    su postgres -c "$PGBIN/initdb -D $PGDATA -A trust -U postgres" >/dev/null
  su postgres -c "$PGBIN/pg_ctl -D $PGDATA -o '-k $PGSOCK -p $PGPORT -c listen_addresses=' -l /tmp/pg.log start" >/dev/null
  sleep 2
fi

cleanup() { psql -q -c "drop database if exists $DB;" >/dev/null 2>&1 || true; }
trap cleanup EXIT

psql -q -c "create database $DB;"

run() {
  echo "→ $1"
  psql -q -d "$DB" -v ON_ERROR_STOP=1 -f "$ROOT/$1"
}

run supabase/tests/_supabase_stub.sql

# As migrations eram listadas à mão aqui, e a 0006 passou despercebida pelo
# teste inteiro por causa disso — a mesma armadilha do bug de 2026-09-02:
# passo novo acrescentado a um fluxo antigo nunca roda para quem já existia.
# Agora a lista se mantém sozinha, em ordem lexicográfica (que é a ordem real
# de aplicação, porque os arquivos são numerados com zero à esquerda).
for m in "$ROOT"/supabase/migrations/*.sql; do
  run "supabase/migrations/$(basename "$m")"
done

echo "→ supabase/tests/rls_test.sql"
psql -q -d "$DB" -v ON_ERROR_STOP=1 -f "$ROOT/supabase/tests/rls_test.sql"
