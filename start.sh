#!/usr/bin/env bash

ROOT="$(cd "$(dirname "$0")" && pwd)"
BACKEND="$ROOT/backend"
FRONTEND="$ROOT/frontend"
BACKEND_PORT=4000
FRONTEND_PORT=5500
BACKEND_PID=""
FRONTEND_PID=""

# ---------- colores ----------
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RED='\033[0;31m'
RESET='\033[0m'

cleanup() {
  echo -e "\n${YELLOW}Deteniendo servidores...${RESET}"
  [ -n "$BACKEND_PID" ]  && kill "$BACKEND_PID"  2>/dev/null || true
  [ -n "$FRONTEND_PID" ] && kill "$FRONTEND_PID" 2>/dev/null || true
  wait 2>/dev/null || true
  echo -e "${GREEN}Listo.${RESET}"
}
trap cleanup INT TERM

# ---------- venv ----------
cd "$BACKEND"
if [ ! -d ".venv" ]; then
  echo -e "${CYAN}Creando entorno virtual en backend/.venv...${RESET}"
  python3 -m venv .venv
fi
# shellcheck disable=SC1091
source .venv/bin/activate

if ! python -c "import django" >/dev/null 2>&1; then
  echo -e "${CYAN}Instalando dependencias de Python...${RESET}"
  pip install --quiet --upgrade pip
  pip install --quiet -r requirements.txt
fi

# ---------- backend (Django) ----------
echo -e "${CYAN}Iniciando backend Django en :${BACKEND_PORT}...${RESET}"
python manage.py runserver "0.0.0.0:${BACKEND_PORT}" --noreload &
BACKEND_PID=$!

# Esperar hasta que el backend responda (máx 15s), pero continuar de todas formas
BACKEND_READY=false
for i in $(seq 1 30); do
  if curl -sf "http://localhost:${BACKEND_PORT}/api/ping/" > /dev/null 2>&1; then
    echo -e "${GREEN}Backend listo.${RESET}"
    BACKEND_READY=true
    break
  fi
  sleep 0.5
done
if [ "$BACKEND_READY" = false ]; then
  echo -e "${YELLOW}Backend tardó más de 15s (Neo4j conectando). Continuando de todas formas...${RESET}"
fi

# ---------- frontend (Vite dev server) ----------
cd "$FRONTEND"

if [ ! -d "node_modules" ]; then
  echo -e "${CYAN}Instalando dependencias npm...${RESET}"
  npm install --silent
fi

echo -e "${CYAN}Iniciando frontend Vite en http://localhost:${FRONTEND_PORT}${RESET}"
npm run dev &
FRONTEND_PID=$!

echo -e "\n${GREEN}Todo corriendo:${RESET}"
echo -e "  Backend  → http://localhost:${BACKEND_PORT}/api/ping/"
echo -e "  Frontend → http://localhost:${FRONTEND_PORT}"
echo -e "\n${YELLOW}Presiona Ctrl+C para detener ambos.${RESET}\n"

wait
