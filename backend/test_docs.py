from services.doc_parser import parse_document
from services.ai_service import generate_quiz_from_text
import json

# 1. Test document parsing
text = parse_document("test.txt", b"Python is a programming language created by Guido van Rossum in 1991.")
print("1. Parse document: OK -", len(text), "chars")

# 2. Test quiz generation from text
questions = generate_quiz_from_text(text, 3, "easy")
print("2. AI quiz generation: OK -", len(questions), "questions")
print("   First Q:", questions[0]["question_text"])

# 3. Test full flow with MD5 and doc_parser
from pypdf import PdfReader
import io
from docx import Document

# Test DOCX creation (make a temp one)
import tempfile, os
from docx import Document as DocxDoc

doc = DocxDoc()
doc.add_paragraph("Machine learning is a subset of artificial intelligence.")
doc.add_paragraph("It uses algorithms to learn from data.")
tmp_path = os.path.join(tempfile.gettempdir(), "test.docx")
doc.save(tmp_path)

with open(tmp_path, "rb") as f:
    docx_text = parse_document("test.docx", f.read())
print("3. DOCX Parsing: OK -", len(docx_text), "chars")

questions2 = generate_quiz_from_text(docx_text, 2, "medium")
print("4. DOCX Quiz gen: OK -", len(questions2), "questions")
print("   Q:", questions2[0]["question_text"])

os.remove(tmp_path)
print("\nAll tests passed!")
