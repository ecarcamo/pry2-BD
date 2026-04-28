#!/usr/bin/env bash
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"
BACKEND="$ROOT/backend"
FRONTEND="$ROOT/frontend"
BACKEND_PORT=4000
FRONTEND_PORT=5500

# ---------- colores ----------
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RESET='\033[0m'

cleanup() {
  echo -e "\n${YELLOW}Deteniendo servidores...${RESET}"
  kill "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null || true
  wait "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null || true
  echo -e "${GREEN}Listo.${RESET}"
}
trap cleanup INT TERM

# ---------- backend ----------
echo -e "${CYAN}Iniciando backend en :${BACKEND_PORT}...${RESET}"
cd "$BACKEND"
node src/server.js &
BACKEND_PID=$!

# Esperar hasta que el backend responda (máx 15 s)
for i in $(seq 1 30); do
  if curl -sf "http://localhost:${BACKEND_PORT}/ping" > /dev/null 2>&1; then
    echo -e "${GREEN}Backend listo.${RESET}"
    break
  fi
  sleep 0.5
done

# ---------- frontend ----------
echo -e "${CYAN}Sirviendo frontend en http://localhost:${FRONTEND_PORT}${RESET}"
cd "$FRONTEND"

# Usar npx serve si está disponible, si no python3 http.server
if command -v npx &> /dev/null && npx --yes serve --version &> /dev/null; then
  npx serve -l "$FRONTEND_PORT" . &
elif command -v python3 &> /dev/null; then
  python3 -m http.server "$FRONTEND_PORT" &
elif command -v python &> /dev/null; then
  python -m http.server "$FRONTEND_PORT" &
else
  echo "No se encontró un servidor HTTP. Abre frontend/NeoLab.html manualmente."
fi
FRONTEND_PID=$!

echo -e "\n${GREEN}Todo corriendo:${RESET}"
echo -e "  Backend  → http://localhost:${BACKEND_PORT}/ping"
echo -e "  Frontend → http://localhost:${FRONTEND_PORT}/NeoLab.html"
echo -e "\n${YELLOW}Presiona Ctrl+C para detener ambos.${RESET}\n"

wait
