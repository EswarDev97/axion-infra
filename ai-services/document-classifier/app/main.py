from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict, Any
from enum import Enum
import re
from PyPDF2 import PdfReader
from docx import Document
import io

app = FastAPI(
    title="AxionPCS Document Classifier",
    description="AI service for classifying HR documents",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class DocumentType(str, Enum):
    RESUME = "RESUME"
    OFFER_LETTER = "OFFER_LETTER"
    APPOINTMENT_LETTER = "APPOINTMENT_LETTER"
    PAYSLIP = "PAYSLIP"
    TAX_DOCUMENT = "TAX_DOCUMENT"
    ID_PROOF = "ID_PROOF"
    ADDRESS_PROOF = "ADDRESS_PROOF"
    EDUCATION_CERTIFICATE = "EDUCATION_CERTIFICATE"
    EXPERIENCE_CERTIFICATE = "EXPERIENCE_CERTIFICATE"
    CONTRACT = "CONTRACT"
    POLICY = "POLICY"
    OTHER = "OTHER"


class ClassificationResult(BaseModel):
    type: DocumentType
    confidence: float
    extractedData: Optional[Dict[str, Any]] = None
    keywords: list[str] = []


# Keywords for classification
DOCUMENT_KEYWORDS = {
    DocumentType.RESUME: [
        "resume", "curriculum vitae", "cv", "experience", "skills",
        "education", "objective", "career", "employment history"
    ],
    DocumentType.OFFER_LETTER: [
        "offer letter", "job offer", "we are pleased to offer",
        "compensation", "joining date", "start date", "position offered"
    ],
    DocumentType.APPOINTMENT_LETTER: [
        "appointment letter", "letter of appointment", "hereby appointed",
        "terms of employment", "probation period"
    ],
    DocumentType.PAYSLIP: [
        "payslip", "salary slip", "earnings", "deductions", "net pay",
        "gross salary", "basic salary", "allowance", "provident fund"
    ],
    DocumentType.TAX_DOCUMENT: [
        "form 16", "income tax", "tax deducted", "tds", "pan",
        "assessment year", "financial year", "tax return"
    ],
    DocumentType.ID_PROOF: [
        "aadhaar", "passport", "voter id", "driving license",
        "pan card", "identity card", "government of india"
    ],
    DocumentType.ADDRESS_PROOF: [
        "utility bill", "bank statement", "electricity bill",
        "water bill", "rental agreement", "lease agreement"
    ],
    DocumentType.EDUCATION_CERTIFICATE: [
        "certificate", "degree", "diploma", "university", "college",
        "bachelor", "master", "graduation", "marksheet", "transcript"
    ],
    DocumentType.EXPERIENCE_CERTIFICATE: [
        "experience certificate", "service certificate", "relieving letter",
        "worked with us", "employment tenure", "hereby certify"
    ],
    DocumentType.CONTRACT: [
        "agreement", "contract", "terms and conditions", "parties",
        "whereas", "hereby agree", "signed and sealed"
    ],
    DocumentType.POLICY: [
        "policy", "guidelines", "rules and regulations", "procedure",
        "compliance", "effective date", "applicable to"
    ],
}


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "document-classifier"}


@app.post("/classify", response_model=ClassificationResult)
async def classify_document(file: UploadFile = File(...)):
    """Classify an uploaded document and extract metadata."""

    # Read file content
    content = await file.read()

    # Extract text based on file type
    text = ""
    if file.content_type == "application/pdf":
        text = extract_text_from_pdf(content)
    elif file.content_type in [
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ]:
        text = extract_text_from_docx(content)
    elif file.content_type and file.content_type.startswith("image/"):
        # For images, we'd use OCR - simplified for now
        text = file.filename or ""
    else:
        text = file.filename or ""

    # Classify the document
    doc_type, confidence, keywords = classify_text(text)

    # Extract relevant data based on type
    extracted_data = extract_data(text, doc_type)

    return ClassificationResult(
        type=doc_type,
        confidence=confidence,
        extractedData=extracted_data,
        keywords=keywords,
    )


def extract_text_from_pdf(content: bytes) -> str:
    """Extract text from PDF file."""
    try:
        reader = PdfReader(io.BytesIO(content))
        text = ""
        for page in reader.pages:
            text += page.extract_text() + "\n"
        return text
    except Exception:
        return ""


def extract_text_from_docx(content: bytes) -> str:
    """Extract text from DOCX file."""
    try:
        doc = Document(io.BytesIO(content))
        text = ""
        for para in doc.paragraphs:
            text += para.text + "\n"
        return text
    except Exception:
        return ""


def classify_text(text: str) -> tuple[DocumentType, float, list[str]]:
    """Classify text into document type."""
    text_lower = text.lower()

    best_type = DocumentType.OTHER
    best_score = 0
    matched_keywords = []

    for doc_type, keywords in DOCUMENT_KEYWORDS.items():
        score = 0
        matches = []
        for keyword in keywords:
            if keyword in text_lower:
                score += 1
                matches.append(keyword)

        if score > best_score:
            best_score = score
            best_type = doc_type
            matched_keywords = matches

    # Calculate confidence (0-1)
    max_keywords = max(len(kw) for kw in DOCUMENT_KEYWORDS.values())
    confidence = min(best_score / 3, 1.0)  # 3 matches = 100% confidence

    return best_type, confidence, matched_keywords


def extract_data(text: str, doc_type: DocumentType) -> Dict[str, Any]:
    """Extract relevant data based on document type."""
    data = {}

    # Extract email
    email_pattern = r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}"
    emails = re.findall(email_pattern, text)
    if emails:
        data["email"] = emails[0]

    # Extract dates
    date_pattern = r"\d{1,2}[-/]\d{1,2}[-/]\d{2,4}"
    dates = re.findall(date_pattern, text)
    if dates:
        data["dates"] = dates[:5]  # First 5 dates

    # Extract amounts (for payslips, tax documents)
    if doc_type in [DocumentType.PAYSLIP, DocumentType.TAX_DOCUMENT]:
        amount_pattern = r"[₹$]?\s*[\d,]+\.?\d*"
        amounts = re.findall(amount_pattern, text)
        if amounts:
            data["amounts"] = amounts[:10]

    return data


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)
