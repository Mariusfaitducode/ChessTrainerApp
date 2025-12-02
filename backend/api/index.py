"""
Handler Vercel pour FastAPI
Utilise Mangum pour adapter FastAPI (ASGI) à Vercel (AWS Lambda)
"""
import os
import sys

# Ajouter le répertoire parent au path pour importer app
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from mangum import Mangum
from app.main_vercel import app

# Wrapper Mangum pour adapter FastAPI à Vercel
# lifespan="off" car on ne peut pas utiliser startup/shutdown en serverless
handler = Mangum(app, lifespan="off")

