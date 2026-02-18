import os
import time
import logging
import openai
from google import genai
from groq import Groq

# Set up logging
logger = logging.getLogger(__name__)

class AIEnhancer:
    def __init__(self):
        self.openai_api_key = os.getenv("OPENAI_API_KEY")
        self.gemini_api_key = os.getenv("GEMINI_API_KEY")
        self.groq_api_key = os.getenv("GROQ_API_KEY")
        
        # OpenAI
        if self.openai_api_key:
            openai.api_key = self.openai_api_key
            logger.info("✅ OpenAI API key loaded")
        else:
            logger.warning("⚠️  OpenAI API key NOT found")
        
        # Gemini
        if self.gemini_api_key:
            self.gemini_client = genai.Client(api_key=self.gemini_api_key)
            logger.info("✅ Gemini API key loaded")
        else:
            self.gemini_client = None
            logger.warning("⚠️  Gemini API key NOT found")
        
        # Groq (FREE - Llama 3.3 70B)
        if self.groq_api_key:
            self.groq_client = Groq(api_key=self.groq_api_key)
            logger.info("✅ Groq API key loaded (FREE tier)")
        else:
            self.groq_client = None
            logger.warning("⚠️  Groq API key NOT found")

    def _get_best_provider(self):
        """Auto-select the best available provider. Priority: Groq > Gemini > OpenAI."""
        if self.groq_client:
            return "groq"
        elif self.gemini_client:
            return "gemini"
        elif self.openai_api_key:
            return "openai"
        return None

    def enhance_content(self, text: str, provider: str = "auto", type: str = "general", job_description: str = "") -> str:
        """
        Enhances the resume text using the specified AI provider and enhancement type.
        """
        # Auto-select provider if needed
        if provider == "auto" or provider == "openai":
            provider = self._get_best_provider() or provider
        
        logger.info(f"📝 enhance_content called | provider={provider} | type={type} | text_length={len(text)}")
        
        if type == "keywords" and job_description:
             prompt = f"""You are an ATS optimization expert. Rewrite the following text to include relevant keywords from the Job Description provided below.
Maintain the original meaning but ensure high keyword density for ATS matching.
IMPORTANT: Return ONLY the optimized text. Do not include any introductory or concluding remarks.

Job Description:
{job_description}

Original Text:
{text}

Optimized Text:"""
        elif type == "grammar":
             prompt = f"""You are a professional editor. Correct any grammar, spelling, and punctuation errors in the following text.
Improve sentence structure for clarity and flow, but keep the tone professional.
IMPORTANT: Return ONLY the corrected text. Do not include any introductory or concluding remarks.

Original Text:
{text}

Corrected Text:"""
        elif type == "summary":
             prompt = f"""You are a professional resume writer. Create a compelling professional summary (3-4 sentences) based on the following resume content.
Highlight key achievements, skills, and experience relevant to the role.
IMPORTANT: Return ONLY the summary. Do not include any introductory or concluding remarks.

Resume Content:
{text}

Professional Summary:"""
        elif type == "bullet_points":
             prompt = f"""You are a professional resume writer. Rewrite the following work experience or project description into strong, ATS-friendly bullet points.
Use action verbs, quantify achievements where possible, and keep each bullet concise.
IMPORTANT: Return ONLY the bullet points. Do not include any introductory or concluding remarks.

Original Text:
{text}

Enhanced Bullet Points:"""
        else: # general / professional tone
            prompt = f"""You are a professional resume writer. Rewrite the following text to be more professional, 
concise, and ATS-friendly. Use action verbs and quantify achievements where possible.
IMPORTANT: Return ONLY the enhanced text. Do not include any introductory or concluding remarks.

Original Text:
{text}

Enhanced Text:"""
        
        return self._call_provider(provider, prompt)

    def evaluate_resume(self, resume_text: str, job_description: str = "", provider: str = "auto") -> str:
        """
        Evaluates the resume against a job description and returns a JSON string with score and feedback.
        """
        # Auto-select provider
        if provider == "auto" or provider == "openai":
            provider = self._get_best_provider() or provider
        
        logger.info(f"🔍 evaluate_resume called | provider={provider} | resume_length={len(resume_text)} | jd_length={len(job_description)}")
        
        gd_context = f"Job Description: {job_description}" if job_description else "General Professional Standards"
        
        prompt = f"""Your task is to analyze the resume using Advanced Keyword Optimization criteria:

1. Weighted Keyword Analysis:
   - Critical Skills: Must-have requirements from the Context (JD). Heavy penalty if missing.
   - Recommended Skills: Nice-to-have keywords. Moderate impact.
   - Hard vs Soft Skills: Separate skills into Technical/Hard vs Soft. Prioritize Hard Skills.

2. Keyword Optimization Checks:
   - Placement: Are keywords in Headers/Summary (High Impact) or just Body?
   - Density & Stuffing: Flag if a keyword is repeated unnaturally (>5 times). Ideal density is 1-3%.
   - Acronyms: Check if acronyms are defined (e.g., "ML (Machine Learning)").
   - Synonyms: meaningful variations (e.g., JD says "Python", Resume says "Pythonic" -> Match).

3. Section-Level Scoring:
   - Experience (40%): Action Verbs, Metrics/Quantification.
   - Skills (30%): Relevance to JD.
   - Education (15%): Recency, GPA, Coursework.
   - Formatting (15%): Readability.

4. Content Quality & Structure:
   - Action Verbs: Strong start? Flag passive voice.
   - Quantification: Numbers?
   - Grammar & Spelling: Flag errors.
   - Logic & Flow: Is experience in Reverse Chronological Order?
   - Buzzwords: "Hard worker" vs specific traits.

Context: 
{gd_context}

Resume Content:
{resume_text}

Provide the output in this STRICT JSON format:
{{
    "score": <0-100>,
    "section_scores": {{ "experience": <0-100>, "skills": <0-100>, "education": <0-100>, "formatting": <0-100> }},
    "keywords": {{
        "critical_missing": ["<must_have>"],
        "recommended_missing": ["<nice_to_have>"],
        "hard_skills": ["<tech_skill>"],
        "soft_skills": ["<soft_skill>"],
        "keyword_stuffing_detected": ["<word>"],
        "acronym_warnings": ["<acronym>"]
    }},
    "content_analysis": {{
        "action_verbs": "<Strong/Weak>",
        "quantification_score": <0-10>,
        "buzzwords_found": ["<cliche>"],
        "education_feedback": ["<point>"],
        "skill_proficiency": {{ "expert": [], "intermediate": [], "beginner": [] }},
        "keyword_placement_score": <0-10>,
        "spelling_errors": ["<typo_1>", "<typo_2>"],
        "reverse_chronological_check": "<Pass/Fail - Details>"
    }},
    "feedback": ["<point_1>", "Grammar: <issue>", "Flow: <issue>"]
}}"""
        
        return self._call_provider(provider, prompt)

    def chat_with_context(self, message: str, context: str, provider: str = "auto") -> str:
        """
        Chat with the AI about the resume context.
        """
        # Auto-select provider
        if provider == "auto" or provider == "openai":
            provider = self._get_best_provider() or provider
        
        logger.info(f"💬 chat_with_context called | provider={provider} | message_length={len(message)}")
        
        prompt = f"""You are a helpful AI Resume Consultant. The user has questions about their resume.
User Question: {message}

Resume Context:
{context}

Provide a helpful, professional, and concise answer."""

        return self._call_provider(provider, prompt)

    def _call_provider(self, provider: str, prompt: str) -> str:
        """Route to the correct provider with fallback chain."""
        logger.info(f"📤 Routing to provider: {provider} (prompt: {len(prompt)} chars)")
        
        # Try requested provider first, then fallback chain
        providers_to_try = []
        if provider == "groq":
            providers_to_try = ["groq", "gemini", "openai"]
        elif provider == "gemini":
            providers_to_try = ["gemini", "groq", "openai"]
        elif provider == "openai":
            providers_to_try = ["openai", "groq", "gemini"]
        else:
            providers_to_try = ["groq", "gemini", "openai"]
        
        for p in providers_to_try:
            if p == "groq" and self.groq_client:
                result = self._enhance_groq(prompt)
                if not result.startswith("Error:"):
                    return result
                logger.warning(f"🔄 Groq failed, trying next provider...")
            elif p == "gemini" and self.gemini_client:
                result = self._enhance_gemini(prompt)
                if not result.startswith("Error:") and not result.startswith("Gemini Error:"):
                    return result
                logger.warning(f"🔄 Gemini failed, trying next provider...")
            elif p == "openai" and self.openai_api_key:
                result = self._enhance_openai(prompt)
                if not result.startswith("OpenAI Error:"):
                    return result
                logger.warning(f"🔄 OpenAI failed, trying next provider...")
        
        logger.error("❌ All providers failed!")
        return "Error: All AI providers failed. Please check your API keys and try again."

    def _enhance_groq(self, prompt: str) -> str:
        """Call Groq API (FREE - Llama 3.3 70B)."""
        logger.info("🤖 Calling Groq (Llama 3.3 70B)...")
        try:
            response = self.groq_client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[
                    {"role": "system", "content": "You are a professional resume writing and ATS optimization expert."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                max_tokens=4096
            )
            result = response.choices[0].message.content.strip()
            logger.info(f"✅ Groq response received ({len(result)} chars)")
            return result
        except Exception as e:
            logger.error(f"❌ Groq Error: {str(e)}")
            return f"Error: Groq - {str(e)}"

    def _enhance_openai(self, prompt: str) -> str:
        """Call OpenAI API."""
        logger.info("🤖 Calling OpenAI GPT-3.5-Turbo...")
        try:
            response = openai.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "You are a helpful assistant."},
                    {"role": "user", "content": prompt}
                ]
            )
            result = response.choices[0].message.content.strip()
            logger.info(f"✅ OpenAI response received ({len(result)} chars)")
            return result
        except Exception as e:
            logger.error(f"❌ OpenAI Error: {str(e)}")
            return f"OpenAI Error: {str(e)}"

    def _enhance_gemini(self, prompt: str) -> str:
        """Call Google Gemini API with retry on rate limiting."""
        max_retries = 2
        
        for attempt in range(1, max_retries + 1):
            logger.info(f"🤖 Calling Gemini 2.0 Flash (attempt {attempt}/{max_retries})...")
            try:
                response = self.gemini_client.models.generate_content(
                    model="gemini-2.0-flash",
                    contents=prompt
                )
                result = response.text.strip()
                logger.info(f"✅ Gemini response received ({len(result)} chars)")
                return result
            except Exception as e:
                error_str = str(e)
                if "429" in error_str or "RESOURCE_EXHAUSTED" in error_str:
                    wait_time = 15 * attempt
                    logger.warning(f"⏳ Gemini rate limited. Waiting {wait_time}s...")
                    time.sleep(wait_time)
                else:
                    logger.error(f"❌ Gemini Error: {error_str}")
                    return f"Gemini Error: {error_str}"
        
        return "Error: Gemini rate limit exceeded."
