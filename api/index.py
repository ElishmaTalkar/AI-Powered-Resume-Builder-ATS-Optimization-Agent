"""
Vercel Serverless Function Entry Point
Wraps the FastAPI app for Vercel's Python runtime.
"""
import sys
import os

# Add backend directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

# Load environment variables (Vercel sets them via dashboard)
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), '..', 'backend', '.env'), override=True)

# Import the FastAPI app
from main import app
