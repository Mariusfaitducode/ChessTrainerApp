#!/bin/bash
# Script de build pour Vercel
# Installe Stockfish si nécessaire

set -e

echo "🔧 Building backend for Vercel..."

# Vérifier si Stockfish est installé
if ! command -v stockfish &> /dev/null; then
    echo "📦 Stockfish not found, installing..."
    
    # Télécharger Stockfish pour Linux x64
    # Vercel utilise Linux x64 pour les fonctions serverless
    STOCKFISH_URL="https://github.com/official-stockfish/Stockfish/releases/download/sf_16/stockfish_16_linux_x64_avx2.zip"
    
    # Créer un répertoire temporaire
    TEMP_DIR=$(mktemp -d)
    cd "$TEMP_DIR"
    
    # Télécharger et extraire Stockfish
    curl -L -o stockfish.zip "$STOCKFISH_URL"
    unzip -q stockfish.zip
    
    # Trouver le binaire Stockfish
    STOCKFISH_BIN=$(find . -name "stockfish_*" -type f | head -1)
    
    if [ -z "$STOCKFISH_BIN" ]; then
        echo "❌ Could not find Stockfish binary"
        exit 1
    fi
    
    # Copier vers /usr/local/bin (nécessite sudo, mais on essaie)
    # Sur Vercel, on peut le mettre dans le répertoire du projet
    mkdir -p "$VERCEL_BUILD_DIR/backend/bin"
    cp "$STOCKFISH_BIN" "$VERCEL_BUILD_DIR/backend/bin/stockfish"
    chmod +x "$VERCEL_BUILD_DIR/backend/bin/stockfish"
    
    echo "✅ Stockfish installed to backend/bin/stockfish"
    
    # Nettoyer
    cd -
    rm -rf "$TEMP_DIR"
else
    echo "✅ Stockfish already installed"
fi

echo "✅ Build complete"

