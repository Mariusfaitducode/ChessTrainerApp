#!/bin/bash
# Script de build pour Vercel
# Installe Stockfish dans le projet

set -e

echo "🔧 Building backend for Vercel..."

# Créer le répertoire bin si nécessaire
mkdir -p backend/bin

# Vérifier si Stockfish existe déjà
if [ ! -f "backend/bin/stockfish" ]; then
    echo "📦 Downloading Stockfish..."
    
    # Télécharger Stockfish pour Linux x64 (AVX2)
    STOCKFISH_URL="https://github.com/official-stockfish/Stockfish/releases/download/sf_16/stockfish_16_linux_x64_avx2.zip"
    
    # Télécharger dans un répertoire temporaire
    TEMP_DIR=$(mktemp -d)
    cd "$TEMP_DIR"
    
    curl -L -o stockfish.zip "$STOCKFISH_URL" || {
        echo "❌ Failed to download Stockfish"
        exit 1
    }
    
    unzip -q stockfish.zip || {
        echo "❌ Failed to extract Stockfish"
        exit 1
    }
    
    # Trouver le binaire Stockfish
    STOCKFISH_BIN=$(find . -name "stockfish_*" -type f -executable | head -1)
    
    if [ -z "$STOCKFISH_BIN" ]; then
        echo "❌ Could not find Stockfish binary"
        exit 1
    fi
    
    # Copier vers le projet
    cp "$STOCKFISH_BIN" "$OLDPWD/backend/bin/stockfish"
    chmod +x "$OLDPWD/backend/bin/stockfish"
    
    echo "✅ Stockfish installed to backend/bin/stockfish"
    
    # Nettoyer
    cd "$OLDPWD"
    rm -rf "$TEMP_DIR"
else
    echo "✅ Stockfish already exists"
fi

# Installer les dépendances Python
echo "📦 Installing Python dependencies..."
pip install -r backend/requirements.txt

echo "✅ Build complete"

