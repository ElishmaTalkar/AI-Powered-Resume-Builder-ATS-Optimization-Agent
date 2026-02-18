import os
import subprocess
import jinja2
from docx import Document
import shutil

class PDFGenerator:
    TEMPLATE_DIR = os.path.join(os.path.dirname(__file__), "templates")
    OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "output")

    def __init__(self):
        os.makedirs(self.OUTPUT_DIR, exist_ok=True)
        self.jinja_env = jinja2.Environment(
            loader=jinja2.FileSystemLoader(self.TEMPLATE_DIR),
            block_start_string='\BLOCK{', # Avoid conflict with latex {}
            block_end_string='}',
            variable_start_string='\VAR{',
            variable_end_string='}',
            comment_start_string='\#{',
            comment_end_string='}',
            line_statement_prefix='%%',
            line_comment_prefix='%#',
            trim_blocks=True,
            autoescape=False,
        )
        # Re-configure for standard jinja if using standard .tex logic I wrote above...
        # Wait, the template I wrote uses {{ }} which conflicts with LaTeX.
        # I should fix the template or the environment.
        # Standard practice is to change jinja delimiters for LaTeX.
        # I will use standard jinja delimiters in the python code below corresponding to what I wrote in the template file.
        # BUT I wrote {{ }} in the template. LaTeX uses {} a lot.
        # So I should probably change the template to use \VAR{} style or change the env here.
        # I will change the env to match {{ }} but avoiding conflicts might be hard.
        # Actually, simpler to just use standard jinja env and use {{ }} in template, but escape latex braces?
        # A bit risky.
        # I'll stick to a simpler approach: use standard Jinja2 {{ }} but ensure I don't use it for latex commands.
        # My template used {{ }}.
        self.jinja_env = jinja2.Environment(
            loader=jinja2.FileSystemLoader(self.TEMPLATE_DIR)
        )

    def generate_resume(self, data: dict, format: str = "pdf", template_name: str = "classic") -> str:
        if format == "pdf":
            return self._generate_pdf(data, template_name)
        elif format == "docx":
            return self._generate_docx(data)
        else:
            raise ValueError("Unsupported format")

    def _generate_pdf(self, data: dict, template_name: str) -> str:
        try:
            # Ensure template exists, default to classic if not found
            if not os.path.exists(os.path.join(self.TEMPLATE_DIR, f"{template_name}.tex")):
                template_name = "classic"
                
            template = self.jinja_env.get_template(f"{template_name}.tex")
            rendered_tex = template.render(**data)
            
            tex_filename = f"resume_{data.get('name', 'user').replace(' ', '_')}.tex"
            tex_path = os.path.join(self.OUTPUT_DIR, tex_filename)
            
            with open(tex_path, "w") as f:
                f.write(rendered_tex)
            
            # Compile with pdflatex
            # Check if pdflatex is available
            if not shutil.which("pdflatex"):
                 raise EnvironmentError("pdflatex not found. Please install TeX distribution.")

            subprocess.run(
                ["pdflatex", "-output-directory", self.OUTPUT_DIR, tex_path],
                check=True,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE
            )
            
            pdf_filename = tex_filename.replace(".tex", ".pdf")
            return os.path.join(self.OUTPUT_DIR, pdf_filename)
        except Exception as e:
             raise RuntimeError(f"PDF Generation failed: {str(e)}")

    def _get_minimal_template(self):
        return r"""
\documentclass[11pt,a4paper]{article}
\usepackage[utf8]{inputenc}
\usepackage[empty]{fullpage}
\usepackage[hidelinks]{hyperref}
\usepackage{titlesec}

% Minimal formatting
\titleformat{\section}{\large\bfseries\uppercase}{}{0em}{}[\titlerule]

\begin{document}

\begin{center}
    {\huge \textbf{VAR_NAME}} \\
    VAR_EMAIL | VAR_PHONE | VAR_LOCATION
\end{center}

\section{Summary}
VAR_SUMMARY

\section{Experience}
VAR_EXPERIENCE

\section{Education}
VAR_EDUCATION

\section{Skills}
VAR_SKILLS

\end{document}
"""

    def _generate_docx(self, data: dict) -> str:
        doc = Document()
        doc.add_heading(data.get('name', 'Name'), 0)
        
        doc.add_paragraph(f"{data.get('email', '')} | {data.get('phone', '')} | {data.get('location', '')}")
        
        doc.add_heading('Summary', level=1)
        doc.add_paragraph(data.get('summary', ''))
        
        doc.add_heading('Experience', level=1)
        for job in data.get('experience', []):
            p = doc.add_paragraph()
            p.add_run(f"{job.get('role')} at {job.get('company')}").bold = True
            p.add_run(f"\n{job.get('dates')} | {job.get('location')}")
            for detail in job.get('details', []):
                doc.add_paragraph(detail, style='List Bullet')
                
        doc.add_heading('Education', level=1)
        for edu in data.get('education', []):
            doc.add_paragraph(f"{edu.get('degree')} - {edu.get('school')}")
            doc.add_paragraph(f"{edu.get('dates')} | {edu.get('location')}")

        filename = f"resume_{data.get('name', 'user').replace(' ', '_')}.docx"
        file_path = os.path.join(self.OUTPUT_DIR, filename)
        doc.save(file_path)
        return file_path
