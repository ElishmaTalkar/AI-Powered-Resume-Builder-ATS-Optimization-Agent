import re

class ATSAnalyzer:
    def __init__(self):
        self.required_sections = ["experience", "education", "skills"]
        self.risky_fonts = ["Comic Sans", "Papyrus", "Impact"] # Placeholder, real font check needs PDF analysis complexity
        self.buzzwords = ["team player", "hard worker", "fast learner", "go-getter", "synergy"]

    def analyze_mechanical_compliance(self, text: str, metadata: dict = None) -> dict:
        results = {
            "parsing_valid": self._validate_parsing(text),
            "section_headers": self._check_section_headers(text),
            "contact_info": self._validate_contact_info(text),
            "formatting": self._analyze_formatting(text),
            "buzzwords": self._check_buzzwords(text),
            "page_check": self._estimate_page_count(text),
            "date_consistency": self._check_date_consistency(text),
            "complex_layout": self._detect_tables_columns(text),
            "special_chars": self._check_special_chars(text),
            "file_size_check": self._check_file_size(metadata.get("file_size", 0) if metadata else 0)
        }
        
        # Calculate a mechanical score (0-100)
        score = 0
        if results["parsing_valid"]: score += 15
        
        headers_found = sum(1 for v in results["section_headers"].values() if v)
        score += (headers_found / len(self.required_sections)) * 15 
        
        if results["contact_info"]["email"]: score += 5
        if results["contact_info"]["phone"]: score += 5
        
        if results["formatting"]["bullet_points_detected"]: score += 10
        
        # Penalties/Bonuses
        if results["page_check"]["is_appropriate_length"]: score += 10
        if results["date_consistency"]["is_consistent"]: score += 5
        if not results["complex_layout"]["potential_tables"]: score += 5 
        
        # New Checks
        if not results["special_chars"]["has_special_chars"]: score += 10
        if results["file_size_check"]["is_valid"]: score += 5
        
        # Penalty for key buzzwords
        buzzword_count = len(results["buzzwords"])
        score -= min(buzzword_count * 2, 10) 
        
        results["mechanical_score"] = max(0, min(int(score + 15), 100))
        return results

    def _validate_parsing(self, text: str) -> bool:
        # Simple check: needs at least 50 words to be considered a valid parse
        return len(text.split()) > 50

    def _check_section_headers(self, text: str) -> dict:
        text_lower = text.lower()
        return {
            section: section in text_lower 
            for section in self.required_sections
        }

    def _validate_contact_info(self, text: str) -> dict:
        email_pattern = r'\b[A-Za-z0-9._%+-]+@(?:[A-Za-z0-9-]+\.)+[A-Za-z]{2,}\b'
        phone_pattern = r'(\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}'
        linkedin_pattern = r'linkedin\.com\/in\/[a-zA-Z0-9_-]+'
        github_pattern = r'github\.com\/[a-zA-Z0-9_-]+'
        
        email_match = re.search(email_pattern, text)
        phone_match = re.search(phone_pattern, text)
        
        email_feedback = "Not found"
        if email_match:
            email = email_match.group(0)
            # Heuristic for unprofessional email: contains year (dob), too many digits, or slang words
            # slang words list is hard, but we can check for digit density
            digit_count = sum(c.isdigit() for c in email.split('@')[0])
            if digit_count > 4:
                 email_feedback = "Professionalism warning (digits)"
            else:
                 email_feedback = "Looks professional"

        phone_feedback = "Not found"
        if phone_match:
            phone = phone_match.group(0)
            # Check for international format (+ or 10-12 digits)
            if not phone.startswith('+') and len(re.sub(r'\D', '', phone)) < 10:
                phone_feedback = "Missing Country Code/Format?"
            else:
                phone_feedback = "Standard Format"

        return {
            "email": bool(email_match),
            "phone": bool(phone_match),
            "linkedin": bool(re.search(linkedin_pattern, text)),
            "github": bool(re.search(github_pattern, text)),
            "email_feedback": email_feedback,
            "phone_feedback": phone_feedback
        }

    def _analyze_formatting(self, text: str) -> dict:
        lines = text.split('\n')
        bullet_points = [line for line in lines if line.strip().startswith(('•', '-', '*', '➢', '·'))]
        
        # Heuristic: If we have reasonable text length but no bullets, might be a block of text
        bullet_ratio = len(bullet_points) / len(lines) if lines else 0
        
        return {
            "bullet_points_detected": len(bullet_points) > 3, # arbitrary threshold
            "bullet_ratio": round(bullet_ratio, 2)
        }
    
    def _estimate_page_count(self, text: str) -> dict:
        word_count = len(text.split())
        # Avg words per page ~400-600 for resumes
        estimated_pages = word_count / 400
        
        is_appropriate = 0.5 <= estimated_pages <= 2.5 # 1-2 pages ideally
        
        return {
            "word_count": word_count,
            "estimated_pages": round(estimated_pages, 1),
            "is_appropriate_length": is_appropriate,
            "feedback": "Review length" if not is_appropriate else "Good length"
        }

    def _check_date_consistency(self, text: str) -> dict:
        # Regex for common date formats
        # MM/YYYY or MM-YYYY
        fmt_slash = r'\b\d{1,2}/\d{4}\b'
        # MMM YYYY (Jan 2020)
        fmt_text = r'\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{4}\b'
        
        count_slash = len(re.findall(fmt_slash, text))
        count_text = len(re.findall(fmt_text, text, re.IGNORECASE))
        
        # Consider consistent if one dominates significantly (>80%)
        total = count_slash + count_text
        if total == 0:
             return {"is_consistent": False, "dominant_format": "None found"}
             
        ratio_slash = count_slash / total
        is_consistent = ratio_slash > 0.8 or ratio_slash < 0.2
        
        dominant = "MM/YYYY" if ratio_slash > 0.5 else "Month YYYY"
        
        return {
            "is_consistent": is_consistent,
            "dominant_format": dominant,
            "mixed_usage_warning": not is_consistent
        }

    def _detect_tables_columns(self, text: str) -> dict:
        # Heuristic: Short lines alternating frequently or lots of spacing gaps
        # Hard to detect strictly from string without layout coordinates (which parsing libraries lose)
        # But we can check for "Column-like" artifacts:
        # e.g., "Skill 1      Skill 2" -> multiple tabs/spaces in lines
        
        lines = text.split('\n')
        # Check lines with internal gaps (more than 4 spaces in the middle)
        lines_with_gaps = [l for l in lines if re.search(r'\S\s{4,}\S', l)]
        
        potential_tables = len(lines_with_gaps) > 3
        
        return {
            "potential_tables": potential_tables,
            "lines_with_gaps": len(lines_with_gaps)
        }

    def _check_buzzwords(self, text: str) -> list:
        found = []
        text_lower = text.lower()
        for word in self.buzzwords:
            if word in text_lower:
                found.append(word)
        return found
        
    def _check_special_chars(self, text: str) -> dict:
        # Check for emojis and non-standard symbols
        # Range for emojis and symbols
        emoji_pattern = re.compile(r'[^\x00-\x7F\u0080-\u00FF\u0100-\u017F\u2000-\u206F]') 
        # Above is a heuristic for "Non-Latin/Common punctuation". 
        # Strictly, emojis are high unicode.
        
        # Count non-ascii
        non_ascii = [c for c in text if ord(c) > 127]
        ratio = len(non_ascii) / len(text) if text else 0
        
        # Check specific PUA (Private Use Area) often used by Icon Fonts (e.g. FontAwesome)
        # PUA: E000-F8FF
        pua_chars = [c for c in text if 0xE000 <= ord(c) <= 0xF8FF]
        
        has_issue = ratio > 0.05 or len(pua_chars) > 0 # >5% non-ascii is suspicious for a resume (unless local language, but ATS usually wants EN)
        
        return {
            "has_special_chars": has_issue,
            "non_ascii_ratio": round(ratio, 2),
            "pua_chars_found": len(pua_chars),
            "feedback": "Remove icons or emojis" if has_issue else "Clean text"
        }
        
    def _check_file_size(self, size_bytes: int) -> dict:
        if size_bytes == 0: 
            return {"is_valid": True, "feedback": "Skipped (Text input)"}
            
        mb_size = size_bytes / (1024 * 1024)
        is_valid = mb_size <= 2.0
        
        return {
            "size_mb": round(mb_size, 2),
            "is_valid": is_valid,
            "feedback": "File size OK" if is_valid else "File too large (>2MB)"
        }
