from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import spacy
import re
from PyPDF2 import PdfReader
from docx import Document
import io

app = FastAPI(
    title="AxionPCS Resume Parser",
    description="AI service for parsing resumes and extracting structured data",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load spaCy model
nlp = spacy.load("en_core_web_sm")


class Experience(BaseModel):
    company: Optional[str] = None
    title: Optional[str] = None
    startDate: Optional[str] = None
    endDate: Optional[str] = None
    description: Optional[str] = None


class Education(BaseModel):
    institution: Optional[str] = None
    degree: Optional[str] = None
    field: Optional[str] = None
    year: Optional[str] = None


class ParsedResume(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    skills: List[str] = []
    experience: List[Experience] = []
    education: List[Education] = []
    totalExperienceYears: Optional[float] = None
    summary: Optional[str] = None
    rawText: str


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "resume-parser"}


@app.post("/parse", response_model=ParsedResume)
async def parse_resume(file: UploadFile = File(...)):
    """Parse a resume file and extract structured data."""

    # Validate file type
    allowed_types = [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ]

    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed: PDF, DOC, DOCX",
        )

    # Read file content
    content = await file.read()

    # Extract text based on file type
    if file.content_type == "application/pdf":
        text = extract_text_from_pdf(content)
    else:
        text = extract_text_from_docx(content)

    # Parse the extracted text
    parsed = parse_text(text)

    return parsed


def extract_text_from_pdf(content: bytes) -> str:
    """Extract text from PDF file."""
    reader = PdfReader(io.BytesIO(content))
    text = ""
    for page in reader.pages:
        text += page.extract_text() + "\n"
    return text


def extract_text_from_docx(content: bytes) -> str:
    """Extract text from DOCX file."""
    doc = Document(io.BytesIO(content))
    text = ""
    for para in doc.paragraphs:
        text += para.text + "\n"
    return text


def parse_text(text: str) -> ParsedResume:
    """Parse resume text and extract structured data."""
    doc = nlp(text)

    # Extract email
    email_pattern = r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}"
    emails = re.findall(email_pattern, text)
    email = emails[0] if emails else None

    # Extract phone
    phone_pattern = r"[\+]?[(]?[0-9]{1,3}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,4}[-\s\.]?[0-9]{1,9}"
    phones = re.findall(phone_pattern, text)
    phone = phones[0] if phones else None

    # Extract name (first PERSON entity)
    name = None
    for ent in doc.ents:
        if ent.label_ == "PERSON":
            name = ent.text
            break

    # Extract skills (common programming languages, tools, etc.)
    common_skills = [
        "python", "javascript", "typescript", "java", "c++", "c#", "ruby", "go",
        "rust", "php", "swift", "kotlin", "react", "angular", "vue", "node.js",
        "express", "django", "flask", "spring", "aws", "azure", "gcp", "docker",
        "kubernetes", "git", "sql", "postgresql", "mongodb", "redis", "graphql",
        "rest", "api", "html", "css", "sass", "tailwind", "bootstrap", "figma",
        "jira", "agile", "scrum", "ci/cd", "jenkins", "terraform", "ansible",
        "linux", "unix", "machine learning", "deep learning", "nlp", "data science",
        "pandas", "numpy", "tensorflow", "pytorch", "scikit-learn"
    ]

    text_lower = text.lower()
    skills = [skill for skill in common_skills if skill in text_lower]

    # Calculate experience (simplified)
    years_pattern = r"(\d+)\+?\s*(?:years?|yrs?)"
    years_matches = re.findall(years_pattern, text_lower)
    total_experience = float(max(years_matches)) if years_matches else None

    return ParsedResume(
        name=name,
        email=email,
        phone=phone,
        skills=skills,
        experience=[],  # Would need more sophisticated parsing
        education=[],   # Would need more sophisticated parsing
        totalExperienceYears=total_experience,
        summary=text[:500] if len(text) > 500 else text,
        rawText=text,
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
