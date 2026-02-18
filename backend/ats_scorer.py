import json
import re
from collections import Counter
from ai_enhancer import AIEnhancer

class ATSScorer:
    REQUIRED_SECTIONS = ["education", "experience", "skills", "projects", "summary"]
    
    @staticmethod
    def calculate_score(resume_text: str, job_description: str = "", metadata: dict = None) -> dict:
        """
        Orchestrates the full Resume Analysis:
        1. Mechanical/Compliance Checks (ATSAnalyzer)
        2. Advanced AI Scoring (AIEnhancer)
        3. Combines results into a single comprehensive report.
        """
        # 1. Mechanical Checks
        from ats_analyzer import ATSAnalyzer # Local import to avoid circular dependency
        analyzer = ATSAnalyzer()
        mechanical_results = analyzer.analyze_mechanical_compliance(resume_text, metadata)
        
        # 0. Fail Fast Validation
        if not mechanical_results["parsing_valid"]:
             return {
                "score": 0,
                "summary": "Content too short or unreadable.",
                "section_scores": {
                    "experience": 0,
                    "skills": 0,
                    "education": 0,
                    "formatting": 0,
                    "mechanical_compliance": 0
                },
                "keywords": {"critical_missing": [], "recommended_missing": []},
                "content_analysis": {},
                "compliance": mechanical_results,
                "feedback": ["Input is too short to analyze.", "Please upload a valid resume with at least 50 words."]
            }

        # 2. AI Scoring
        ai_results = {}
        try:
            enhancer = AIEnhancer()
            # Let AIEnhancer auto-select the best available provider (Groq > Gemini > OpenAI)
            ai_response = enhancer.evaluate_resume(resume_text, job_description, "auto")
            if ai_response and ai_response.startswith("{"):
                # Clean up potential markdown code blocks
                clean_json = ai_response.replace("```json", "").replace("```", "").strip()
                ai_results = json.loads(clean_json)
        except Exception as e:
            print(f"AI Scoring failed: {e}")
            # Fallback to empty AI results
        
        # 3. Combine Results
        
        # Scenario A: AI Scored Successfully
        if ai_results:
            # Weighted combination: AI Score * 0.8 + Mechanical Score * 0.2
            ai_score = ai_results.get("score", 0)
            mech_score = mechanical_results.get("mechanical_score", 0)
            combined_score = (ai_score * 0.8) + (mech_score * 0.2)
            
            return {
                "score": int(combined_score),
                "summary": ai_results.get("summary", "Analysis complete."),
                "section_scores": {
                    **ai_results.get("section_scores", {}),
                    "mechanical_compliance": mech_score
                },
                "keywords": ai_results.get("keywords", {}),
                "content_analysis": ai_results.get("content_analysis", {}),
                "compliance": mechanical_results,
                "feedback": ai_results.get("feedback", [])
            }

        # Scenario B: AI Failed (Fallback to Heuristics + Mechanical)
        heuristic_score = ATSScorer._heuristic_score(resume_text, job_description)
        mech_score = mechanical_results.get("mechanical_score", 0)
        final_score = (mech_score * 0.4) + (heuristic_score * 0.6)
        
        return {
            "score": int(final_score),
            "summary": "AI Analysis Unavailable. Score based on mechanical checks and heuristics.",
            "section_scores": {
                "mechanical_compliance": mech_score,
                "heuristic_keywords": heuristic_score 
            },
            "compliance": mechanical_results,
            "feedback": ["Configure AI keys for detailed analysis.", "Ensure standard section headers are used."],
            "keywords": {"critical_missing": [], "recommended_missing": []}, # Empty scaffolding
            "content_analysis": {}
        }

    @staticmethod
    def _heuristic_score(resume_text: str, job_description: str) -> int:
        score = 50
        text_lower = resume_text.lower()
        
        # Keywords
        if job_description:
            keywords = ATSScorer._extract_keywords(job_description)
            matched = [k for k in keywords if k in text_lower]
            if keywords:
                score += (len(matched) / len(keywords)) * 30
        
        # Sections
        found_sections = sum(1 for s in ATSScorer.REQUIRED_SECTIONS if s in text_lower)
        score += (found_sections / len(ATSScorer.REQUIRED_SECTIONS)) * 20
        
        return min(int(score), 100)

    @staticmethod
    def _extract_keywords(text: str) -> list:
        # Simple extraction: find capitalized words or common tech terms
        words = re.findall(r'\b[A-Z][a-zA-Z]+\b', text)
        common = {"The", "A", "An", "In", "On", "To", "For", "Of", "With", "At", "By", "From"}
        return list(set([w for w in words if w not in common]))
