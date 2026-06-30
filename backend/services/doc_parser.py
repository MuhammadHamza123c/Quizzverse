import io
from pypdf import PdfReader
from docx import Document

def parse_pdf(file_bytes: bytes) -> str:
    reader = PdfReader(io.BytesIO(file_bytes))
    text = ""
    for page in reader.pages:
        text += page.extract_text() + "\n"
    return text.strip()

def parse_docx(file_bytes: bytes) -> str:
    doc = Document(io.BytesIO(file_bytes))
    text = "\n".join([p.text for p in doc.paragraphs if p.text.strip()])
    return text.strip()

def parse_text(file_bytes: bytes) -> str:
    return file_bytes.decode("utf-8").strip()

def parse_json(file_bytes: bytes) -> str:
    import json
    data = json.loads(file_bytes.decode("utf-8"))
    lines = []
    if isinstance(data, dict):
        for k, v in data.items():
            if isinstance(v, (list, dict)):
                lines.append(f"{k}: {json.dumps(v, indent=2)}")
            else:
                lines.append(f"{k}: {v}")
    elif isinstance(data, list):
        for item in data:
            if isinstance(item, dict):
                lines.append(json.dumps(item, indent=2))
            else:
                lines.append(str(item))
    else:
        lines.append(str(data))
    return "\n".join(lines)

def parse_document(filename: str, file_bytes: bytes) -> str:
    ext = filename.lower().split(".")[-1]
    if ext == "pdf":
        return parse_pdf(file_bytes)
    elif ext == "docx":
        return parse_docx(file_bytes)
    elif ext == "txt":
        return parse_text(file_bytes)
    elif ext == "json":
        return parse_json(file_bytes)
    else:
        raise ValueError(f"Unsupported file type: .{ext}")
