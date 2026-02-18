from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import uvicorn
import os
import shutil
import json
import logging
from pydantic import BaseModel
from typing import List, Optional
from dotenv import load_dotenv

# --- Load .env file FIRST ---
load_dotenv(override=True)

# --- Set up logging ---
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-7s | %(name)-20s | %(message)s",
    datefmt="%H:%M:%S"
)
logger = logging.getLogger("main")

# --- Startup checks ---
logger.info("🚀 Starting AI Resume Builder API...")
logger.info(f"📁 Working directory: {os.getcwd()}")
logger.info(f"🔑 OPENAI_API_KEY: {'✅ Set' if os.getenv('OPENAI_API_KEY') else '❌ Not set'}")
logger.info(f"🔑 GEMINI_API_KEY: {'✅ Set' if os.getenv('GEMINI_API_KEY') else '❌ Not set'}")
logger.info(f"🔑 GROQ_API_KEY:   {'✅ Set' if os.getenv('GROQ_API_KEY') else '❌ Not set'}")

# Import local modules
from resume_parser import ResumeParser
from ats_scorer import ATSScorer
from ai_enhancer import AIEnhancer
from pdf_generator import PDFGenerator

app = FastAPI(title="AI Resume Builder & ATS Scorer")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ensure data directories exist
UPLOAD_DIR = "uploads"
OUTPUT_DIR = "output"
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Mount output directory to serve generated files
app.mount("/output", StaticFiles(directory=OUTPUT_DIR), name="output")

# --- Pydantic Models ---
class ResumeData(BaseModel):
    name: Optional[str] = "Your Name"
    email: Optional[str] = "email@example.com"
    phone: Optional[str] = "+1 234 567 890"
    location: Optional[str] = "City, Country"
    linkedin: Optional[str] = ""
    github: Optional[str] = ""
    summary: Optional[str] = "Professional summary..."
    education: List[dict] = []
    experience: List[dict] = []
    skills: dict = {}
    projects: List[dict] = []

class ScoreRequest(BaseModel):
    resume_text: str
    job_description: Optional[str] = ""
    metadata: Optional[dict] = {}

class EnhanceRequest(BaseModel):
    text: str
    provider: Optional[str] = "openai"
    type: Optional[str] = "general"
    job_description: Optional[str] = ""

class GenerateRequest(BaseModel):
    data: ResumeData
    format: Optional[str] = "pdf"
    template: Optional[str] = "classic"

# --- Endpoints ---

@app.get("/")
def read_root():
    logger.info("📍 GET / - Health check")
    return {"message": "AI Resume Builder API is running"}

@app.post("/parse")
async def parse_resume(file: UploadFile = File(...)):
    logger.info(f"📄 POST /parse - Parsing file: {file.filename}")
    try:
        file_path = os.path.join(UPLOAD_DIR, file.filename)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        file_size = os.path.getsize(file_path)
        logger.info(f"   📦 File saved: {file_path} ({file_size} bytes)")
        
        data = ResumeParser.extract_data(file_path)
        logger.info(f"   ✅ Parsing complete. Text length: {len(data.get('text', ''))}")
        
        return {
            "filename": file.filename, 
            "text": data["text"],
            "parsed_data": data,
            "metadata": {"file_size": file_size}
        }
    except Exception as e:
        logger.error(f"   ❌ Parse error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/score")
def score_resume(req: ScoreRequest):
    logger.info(f"📊 POST /score - Resume length: {len(req.resume_text)} chars | JD length: {len(req.job_description)} chars")
    try:
        result = ATSScorer.calculate_score(req.resume_text, req.job_description, req.metadata)
        logger.info(f"   ✅ Scoring complete. Final score: {result.get('score', 'N/A')}")
        return result
    except Exception as e:
        logger.error(f"   ❌ Score error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/enhance")
def enhance_text(req: EnhanceRequest):
    logger.info(f"✨ POST /enhance - Provider: {req.provider} | Type: {req.type} | Text length: {len(req.text)}")
    try:
        enhancer = AIEnhancer()
        enhanced_text = enhancer.enhance_content(req.text, req.provider, req.type, req.job_description)
        logger.info(f"   ✅ Enhancement complete. Result length: {len(enhanced_text)}")
        return {"original": req.text, "enhanced": enhanced_text, "type": req.type}
    except Exception as e:
        logger.error(f"   ❌ Enhance error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

class ChatRequest(BaseModel):
    message: str
    context: str
    provider: Optional[str] = "openai"

@app.post("/chat")
def chat_resume(req: ChatRequest):
    logger.info(f"💬 POST /chat - Provider: {req.provider} | Message: {req.message[:50]}...")
    try:
        enhancer = AIEnhancer()
        reply = enhancer.chat_with_context(req.message, req.context, req.provider)
        logger.info(f"   ✅ Chat reply generated ({len(reply)} chars)")
        return {"reply": reply}
    except Exception as e:
        logger.error(f"   ❌ Chat error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/generate")
def generate_resume(req: GenerateRequest):
    logger.info(f"📝 POST /generate - Format: {req.format} | Template: {req.template}")
    try:
        generator = PDFGenerator()
        data = req.data.dict()
        
        file_path = generator.generate_resume(data, req.format, req.template)
        filename = os.path.basename(file_path)
        logger.info(f"   ✅ Resume generated: {filename}")
        
        return {
            "message": "Resume generated successfully",
            "filename": filename,
            "url": f"/output/{filename}"
        }
    except Exception as e:
        logger.error(f"   ❌ Generate error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
