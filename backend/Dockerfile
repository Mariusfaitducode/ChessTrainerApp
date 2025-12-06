FROM python:3.11-slim

# Installer Stockfish
RUN apt-get update && \
    apt-get install -y stockfish && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Installer les dépendances Python
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copier le code
COPY app/ ./app/

# Exposer le port
EXPOSE 8000

# Variables d'environnement par défaut
# Utiliser le chemin complet pour être sûr
ENV STOCKFISH_PATH=/usr/games/stockfish
ENV MAX_DEPTH=25
ENV DEFAULT_DEPTH=15

# Commande de démarrage
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

