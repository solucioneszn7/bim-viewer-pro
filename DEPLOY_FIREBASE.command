#!/bin/bash
# ══════════════════════════════════════════════════════════
#  BIM Viewer Pro v3.0 — Deploy a Firebase Hosting
#  PROYECTO NUEVO — SEPARADO de c-mide
#  Doble-click para ejecutar
# ══════════════════════════════════════════════════════════

set -e
cd "$(dirname "$0")"

GREEN='\033[0;32m'; CYAN='\033[0;36m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'

echo ""
echo -e "${CYAN}🏗️  BIM Viewer Pro — Nuevo proyecto Firebase${NC}"
echo -e "${RED}⚠️  PROYECTO SEPARADO — NO toca c-mide ni ningún proyecto existente${NC}"
echo "════════════════════════════════════════════════════════"
echo ""

# 1. Verificar Node
if ! command -v node &>/dev/null; then
  echo -e "${RED}❌ Node.js no instalado. https://nodejs.org${NC}"; exit 1
fi

# 2. Build
echo -e "${YELLOW}[1/4] Building app...${NC}"
npm install --legacy-peer-deps
npm run build
echo -e "${GREEN}✅ Build OK${NC}"

# 3. Firebase CLI
echo ""
echo -e "${YELLOW}[2/4] Verificando Firebase CLI...${NC}"
if ! command -v firebase &>/dev/null; then
  npm install -g firebase-tools
fi
echo -e "${GREEN}✅ Firebase CLI listo${NC}"

# 4. Login
echo ""
echo -e "${YELLOW}[3/4] Login Firebase...${NC}"
firebase login

# 5. Crear proyecto NUEVO
echo ""
echo -e "${YELLOW}[4/4] Creando proyecto Firebase NUEVO para BIM Viewer Pro...${NC}"
echo ""
echo -e "  Ingresa un Project ID único (ej: bim-viewer-pro-2024):"
echo -e "  ${YELLOW}(NO usar 'c-mide' ni proyectos existentes)${NC}"
echo ""
read -p "  Project ID: " PROJECT_ID

# Validar que no sea c-mide
if [[ "$PROJECT_ID" == "c-mide" ]] || [[ "$PROJECT_ID" == "c-mide"* ]]; then
  echo -e "${RED}❌ No puedes usar c-mide. Ese es otro proyecto. Usa un ID diferente.${NC}"
  exit 1
fi

echo ""
echo -e "  Creando proyecto: ${CYAN}${PROJECT_ID}${NC}"
firebase projects:create "${PROJECT_ID}" --display-name "BIM Viewer Pro"

# Actualizar .firebaserc con el proyecto correcto
echo "{\"projects\":{\"default\":\"${PROJECT_ID}\"}}" > .firebaserc

echo ""
echo -e "  🚀 Desplegando BIM Viewer Pro..."
firebase deploy --only hosting --project "${PROJECT_ID}"

echo ""
echo "════════════════════════════════════════════════════════"
echo -e "${GREEN}✅ DEPLOY COMPLETADO — Proyecto: ${PROJECT_ID}${NC}"
echo ""
echo -e "  🌐 ${CYAN}https://${PROJECT_ID}.web.app${NC}"
echo -e "  📋 ${CYAN}https://console.firebase.google.com/project/${PROJECT_ID}/hosting${NC}"
echo ""
read -p "Presiona Enter para cerrar..."
