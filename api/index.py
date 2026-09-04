# RAIL-BLOCK AI: Vercel Serverless Entry Point
# This file is the bridge between Vercel's Python runtime and our FastAPI app.

import sys
import os

# Add the project root to Python path so imports work
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import the FastAPI app from main.py
from main import app

# Vercel looks for an `app` variable — FastAPI is ASGI-compatible, which Vercel supports.
# No additional handler wrapping needed.
