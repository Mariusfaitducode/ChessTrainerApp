#!/bin/bash

# Script de vérification du déploiement beta
# Usage: ./scripts/check-deployment.sh

set -e

echo "🔍 Vérification du déploiement beta..."
echo ""

# Couleurs
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Variables (à configurer)
BACKEND_URL="${EXPO_PUBLIC_ANALYSIS_API_URL:-http://localhost:8000}"
SUPABASE_URL="${EXPO_PUBLIC_SUPABASE_URL:-}"

echo "📡 Backend URL: $BACKEND_URL"
echo "🗄️  Supabase URL: ${SUPABASE_URL:-Non configuré}"
echo ""

# Test Backend Health
echo "1️⃣  Test Backend Health Check..."
if curl -f -s "$BACKEND_URL/health" > /dev/null; then
    echo -e "${GREEN}✅ Backend health check OK${NC}"
else
    echo -e "${RED}❌ Backend health check FAILED${NC}"
    exit 1
fi

# Test Backend Analysis
echo ""
echo "2️⃣  Test Backend Analysis..."
RESPONSE=$(curl -s -X POST "$BACKEND_URL/analyze-position" \
  -H "Content-Type: application/json" \
  -d '{"fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1", "depth": 10}')

if echo "$RESPONSE" | grep -q "best_move"; then
    echo -e "${GREEN}✅ Backend analysis OK${NC}"
    echo "   Réponse: $(echo $RESPONSE | jq -r '.best_move // "N/A"')"
else
    echo -e "${RED}❌ Backend analysis FAILED${NC}"
    echo "   Réponse: $RESPONSE"
    exit 1
fi

# Test Supabase (si configuré)
if [ -n "$SUPABASE_URL" ]; then
    echo ""
    echo "3️⃣  Test Supabase Connection..."
    if curl -f -s "$SUPABASE_URL/rest/v1/" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Supabase connection OK${NC}"
    else
        echo -e "${YELLOW}⚠️  Supabase connection check failed (peut être normal si RLS est activé)${NC}"
    fi
fi

echo ""
echo -e "${GREEN}✅ Tous les tests sont passés !${NC}"

