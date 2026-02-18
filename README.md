# 🚀 AI-Powered Resume Builder & ATS Optimization Agent

<div align="center">

![Python](https://img.shields.io/badge/Python-3.10+-3776AB?style=for-the-badge&logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![Groq](https://img.shields.io/badge/Groq-Llama_3.3-F55036?style=for-the-badge&logo=meta&logoColor=white)
![Gemini](https://img.shields.io/badge/Gemini-2.0_Flash-4285F4?style=for-the-badge&logo=google&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

**An intelligent resume building platform that optimizes your resume for Applicant Tracking Systems (ATS) using multi-provider AI analysis.**

[Features](#-features) • [Architecture](#-architecture) • [Quick Start](#-quick-start) • [API Reference](#-api-reference) • [Screenshots](#-screenshots)

</div>

---

## 📋 Features

### 🎯 Core Features
- **📄 Resume Parsing** — Upload PDF or DOCX resumes for automatic text extraction
- **📊 ATS Scoring** — Comprehensive ATS compliance scoring (0-100) with detailed feedback
- **✨ AI Enhancement** — Rewrite resume content for maximum impact using AI
- **📝 Manual Resume Builder** — Full-featured form with dynamic sections for building resumes from scratch
- **💬 AI Resume Consultant** — Chat with AI about your resume for personalized advice

### 🤖 Multi-Provider AI System
The system uses a **smart fallback chain** that automatically selects the best available AI provider:

| Priority | Provider | Model | Cost |
|----------|----------|-------|------|
| 1st 🥇 | **Groq** | Llama 3.3 70B | **FREE** (14,400 req/day) |
| 2nd 🥈 | **Google Gemini** | Gemini 2.0 Flash | Free tier available |
| 3rd 🥉 | **OpenAI** | GPT-3.5 Turbo | Paid |

> If one provider fails or is rate-limited, the system automatically tries the next one.

### 📊 ATS Analysis Engine
The scoring system combines **mechanical compliance checks** with **AI-powered content analysis**:

- **Keyword Optimization** — Critical/recommended keyword matching against job descriptions
- **Hard vs Soft Skills** — Separates technical skills from interpersonal skills
- **Keyword Density & Stuffing Detection** — Flags unnatural keyword repetition
- **Acronym Expansion Check** — Ensures acronyms are properly defined (e.g., "ML (Machine Learning)")
- **Synonym/Semantic Matching** — Recognizes variations (e.g., "Python" ↔ "Pythonic")
- **Section-Level Scoring** — Experience (40%), Skills (30%), Education (15%), Formatting (15%)
- **Content Quality** — Action verbs, quantification, grammar, reverse chronological order

### 🎨 Resume Builder Form
- **Dynamic Sections** — Add/remove Education, Experience, Projects entries
- **Date Pickers** — Start/End dates with "Currently Working Here" toggle
- **Categorized Skills** — Organize skills by category (Languages, Frameworks, Tools, etc.)
- **AI Enhancement Buttons** — One-click AI rewriting for summaries, experience, and projects
- **Smart CGPA Toggle** — Optional CGPA/GPA field with conditional display
- **Character Counters** — Track length of professional summary
- **Required Field Indicators** — Red asterisks on mandatory fields
- **Inline Validation** — Real-time error messages for invalid inputs

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (React + Vite)               │
│                                                         │
│  ┌──────────┐  ┌───────────┐  ┌──────────┐  ┌────────┐│
│  │ Upload   │  │  Resume   │  │Dashboard │  │  Live  ││
│  │  Form    │  │  Builder  │  │& Scoring │  │ Editor ││
│  └────┬─────┘  └─────┬─────┘  └────┬─────┘  └───┬────┘│
│       │              │             │             │      │
│       └──────────────┴──────┬──────┴─────────────┘      │
│                             │ API Calls (axios)         │
└─────────────────────────────┼───────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────┐
│                   Backend (FastAPI)                      │
│                                                         │
│  ┌──────────┐  ┌───────────┐  ┌──────────┐  ┌────────┐│
│  │  /parse  │  │  /score   │  │ /enhance │  │ /chat  ││
│  │  /generate│  │           │  │          │  │        ││
│  └────┬─────┘  └─────┬─────┘  └────┬─────┘  └───┬────┘│
│       │              │             │             │      │
│  ┌────▼─────┐  ┌─────▼─────┐  ┌───▼─────────────▼────┐│
│  │ Resume   │  │   ATS     │  │    AI Enhancer       ││
│  │ Parser   │  │  Scorer   │  │  (Multi-Provider)    ││
│  │(PDF/DOCX)│  │+ Analyzer │  │ Groq→Gemini→OpenAI  ││
│  └──────────┘  └───────────┘  └──────────────────────┘│
│                                                         │
│  ┌────────────────────────────────────────────────────┐│
│  │            PDF Generator (LaTeX Templates)         ││
│  │          Classic  |  Modern  |  Minimal            ││
│  └────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────┘
```

---

## ⚡ Quick Start

### Prerequisites
- **Python 3.10+**
- **Node.js 18+**
- At least **one** AI API key (Groq is free and recommended)

### 1. Clone the Repository
```bash
git clone https://github.com/ElishmaTalkar/AI-Powered-Resume-Builder-ATS-Optimization-Agent.git
cd AI-Powered-Resume-Builder-ATS-Optimization-Agent
```

### 2. Backend Setup
```bash
# Create and activate virtual environment
cd backend
python3 -m venv venv
source venv/bin/activate        # macOS/Linux
# venv\Scripts\activate         # Windows

# Install dependencies
pip install -r requirements.txt

# Configure API keys
cp .env.example .env
# Edit .env and add your API key(s)
```

#### Get Your Free API Key
| Provider | Link | Key Format |
|----------|------|------------|
| **Groq** (Recommended) | [console.groq.com/keys](https://console.groq.com/keys) | `gsk_...` |
| Google Gemini | [aistudio.google.com/apikey](https://aistudio.google.com/apikey) | `AIza...` |
| OpenAI | [platform.openai.com/api-keys](https://platform.openai.com/api-keys) | `sk-...` |

```bash
# Start the backend server
uvicorn main:app --reload
```
The API will be running at `http://localhost:8000`

### 3. Frontend Setup
```bash
# In a new terminal, from the project root
cd frontend
npm install
npm run dev
```
The app will be running at `http://localhost:5173`

---

## 📡 API Reference

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Health check |
| `/parse` | POST | Upload and parse a resume (PDF/DOCX) |
| `/score` | POST | Get ATS score with detailed feedback |
| `/enhance` | POST | AI-enhance resume text |
| `/chat` | POST | Chat with AI resume consultant |
| `/generate` | POST | Generate formatted resume (PDF) |

### Example: Score a Resume
```bash
curl -X POST http://localhost:8000/score \
  -H "Content-Type: application/json" \
  -d '{
    "resume_text": "Your resume content here...",
    "job_description": "Optional job description for keyword matching"
  }'
```

### Example Response
```json
{
  "score": 78,
  "section_scores": {
    "experience": 82,
    "skills": 75,
    "education": 80,
    "formatting": 70,
    "mechanical_compliance": 85
  },
  "keywords": {
    "critical_missing": ["Docker", "Kubernetes"],
    "hard_skills": ["Python", "React", "FastAPI"],
    "soft_skills": ["Leadership", "Communication"]
  },
  "feedback": [
    "Add quantified achievements to experience bullets",
    "Include missing critical keywords: Docker, Kubernetes"
  ]
}
```

---

## 📁 Project Structure

```
AI-Powered-Resume-Builder-ATS-Optimization-Agent/
├── backend/
│   ├── main.py               # FastAPI app & endpoints
│   ├── ai_enhancer.py        # Multi-provider AI (Groq/Gemini/OpenAI)
│   ├── ats_scorer.py         # ATS scoring orchestrator
│   ├── ats_analyzer.py       # Mechanical compliance analysis
│   ├── resume_parser.py      # PDF/DOCX text extraction
│   ├── pdf_generator.py      # LaTeX-based resume generation
│   ├── requirements.txt      # Python dependencies
│   ├── .env.example          # API key template
│   └── templates/
│       ├── classic.tex       # Classic resume template
│       ├── modern.tex        # Modern resume template
│       └── minimal.tex       # Minimal resume template
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx           # Main application component
│   │   ├── api.js            # API service layer
│   │   ├── index.css         # Global styles
│   │   └── components/
│   │       ├── UploadForm.jsx    # Resume builder form
│   │       ├── Dashboard.jsx     # Scoring & enhancement dashboard
│   │       ├── JobAnalysis.jsx   # Job description analysis
│   │       └── LiveEditor.jsx    # Live resume editor
│   ├── package.json
│   └── vite.config.js
│
├── .gitignore
└── README.md
```

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, Vite, Axios |
| **Backend** | Python, FastAPI, Uvicorn |
| **AI Providers** | Groq (Llama 3.3 70B), Google Gemini 2.0 Flash, OpenAI GPT-3.5 |
| **Resume Parsing** | PyPDF, python-docx |
| **PDF Generation** | Jinja2 + LaTeX templates |
| **Environment** | python-dotenv |

---

## 🔧 Configuration

All configuration is done via the `backend/.env` file:

```env
# At least one key is required. Groq is FREE!
GROQ_API_KEY=gsk_your_key_here
GEMINI_API_KEY=AIzaSy_your_key_here
OPENAI_API_KEY=sk-your_key_here

# Optional
PORT=8000
```

The system will automatically use the best available provider based on which keys are configured.

---

## 🚀 Deployment

### Backend (e.g., Render / Railway)
```bash
# Procfile is included
web: uvicorn main:app --host 0.0.0.0 --port $PORT
```

### Frontend (e.g., Vercel)
```bash
# vercel.json is included
cd frontend && npm run build
```

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

## 👤 Author

**Elishma Talkar**

- GitHub: [@ElishmaTalkar](https://github.com/ElishmaTalkar)

---

<div align="center">

⭐ **Star this repo if you found it useful!** ⭐

</div>
