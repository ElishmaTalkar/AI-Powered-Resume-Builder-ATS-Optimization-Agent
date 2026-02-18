import os
import re
from pypdf import PdfReader
from docx import Document

class ResumeParser:
    @staticmethod
    def extract_data(file_path: str) -> dict:
        """Extracts text and basic metadata from a file."""
        text = ResumeParser.extract_text(file_path)
        email = re.search(r'[\w\.-]+@[\w\.-]+', text)
        phone = re.search(r'\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}', text)
        
        return {
            "text": text,
            "email": email.group(0) if email else "",
            "phone": phone.group(0) if phone else "",
            "name": "Candidate", # Placeholder, hard to extract reliably without NLP
            "skills": {},
            "dt": []
        }

    @staticmethod
    def extract_text(file_path: str) -> str:
        """Extracts text from a file (PDF or DOCX)."""
        ext = os.path.splitext(file_path)[1].lower()
        
        if ext == ".pdf":
            return ResumeParser._parse_pdf(file_path)
        elif ext == ".docx":
            return ResumeParser._parse_docx(file_path)
        else:
            raise ValueError(f"Unsupported file format: {ext}")

    @staticmethod
    def _parse_pdf(file_path: str) -> str:
        text = ""
        try:
            reader = PdfReader(file_path)
            for page in reader.pages:
                text += page.extract_text() + "\n"
        except Exception as e:
            raise ValueError(f"Error reading PDF: {str(e)}")
        return text.strip()

    @staticmethod
    def _parse_docx(file_path: str) -> str:
        text = ""
        try:
            doc = Document(file_path)
            for para in doc.paragraphs:
                text += para.text + "\n"
        except Exception as e:
            raise ValueError(f"Error reading DOCX: {str(e)}")
        return text.strip()
