"""
OCR Service — High-performance multi-engine OCR for legal documents.

Primary Engine:  RapidOCR (ONNX-based — ultra-fast, local, handles images, scans, IDs)
Fallback Engine: Tesseract OCR (if system binary exists)

Supports English + Indian Languages (Hindi, Malayalam, Tamil, Telugu, Kannada, Bengali, etc.)
"""

import io
import os
import platform
import logging
import json
import re
from dotenv import load_dotenv
from PIL import Image

logger = logging.getLogger(__name__)

# ── 1. RapidOCR (Primary Engine) ──────────────────────────────────────────────
_RAPID_OCR_ENGINE = None
_RAPID_OCR_AVAILABLE = False

try:
    from rapidocr_onnxruntime import RapidOCR  # type: ignore # pyright: ignore
    _RAPID_OCR_AVAILABLE = True
except Exception:
    _RAPID_OCR_AVAILABLE = False


def _get_rapid_ocr():
    """Lazy initialize RapidOCR engine instance."""
    global _RAPID_OCR_ENGINE
    if _RAPID_OCR_ENGINE is None and _RAPID_OCR_AVAILABLE:
        try:
            _RAPID_OCR_ENGINE = RapidOCR()
        except Exception as e:
            logger.error(f"RapidOCR initialization error: {e}")
            _RAPID_OCR_ENGINE = None
    return _RAPID_OCR_ENGINE


# ── 2. Tesseract OCR (Secondary Fallback Engine) ─────────────────────────────
try:
    import pytesseract  # type: ignore # pyright: ignore
except Exception:
    pytesseract = None  # type: ignore

TESSERACT_PATHS = [
    r"C:\Program Files\Tesseract-OCR\tesseract.exe",
    r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
    r"E:\Tesseract-OCR\tesseract.exe",
    r"C:\Tesseract-OCR\tesseract.exe",
]

def _init_tesseract():
    if pytesseract and platform.system() == "Windows":
        for p in TESSERACT_PATHS:
            if os.path.exists(p):
                try:
                    pytesseract.pytesseract.tesseract_cmd = p
                    return p
                except Exception:
                    pass
    return None

TESSERACT_EXE = _init_tesseract()
ALL_LANGUAGES = "eng+mal+hin+tam+tel+kan+ben+guj+pan+ori+urd+mar+san"


# ── 3. Image Preprocessing ───────────────────────────────────────────────────

def _preprocess(pil_image: Image.Image) -> Image.Image:
    """Preprocess image for optimal OCR extraction."""
    return pil_image.convert("RGB")


# ── 4. Core OCR Engine Dispatcher ────────────────────────────────────────────

def _ocr_image(pil_image: Image.Image, lang: str = ALL_LANGUAGES) -> str:
    """
    Run OCR on a PIL image.
    Uses RapidOCR first (ONNX), falls back to Tesseract if needed.
    """
    img_rgb = _preprocess(pil_image)

    # 1. Primary: RapidOCR Engine (ONNX based - fast & accurate)
    rapid_engine = _get_rapid_ocr()
    if rapid_engine is not None:
        try:
            buf = io.BytesIO()
            img_rgb.save(buf, format="PNG")
            img_bytes = buf.getvalue()
            result, _ = rapid_engine(img_bytes)
            if result:
                lines = [box[1] for box in result if box and len(box) >= 2 and box[1]]
                extracted = "\n".join(lines).strip()
                if extracted:
                    return extracted
        except Exception as e:
            logger.warning(f"RapidOCR processing failed: {e}")

    # 2. Secondary: Tesseract OCR (if installed)
    if pytesseract and TESSERACT_EXE and os.path.exists(TESSERACT_EXE):
        try:
            config = "--oem 3 --psm 3"
            text = pytesseract.image_to_string(img_rgb, lang=lang, config=config)  # type: ignore
            if text and text.strip():
                return text.strip()
        except Exception as e:
            logger.warning(f"Tesseract OCR processing failed: {e}")

    return "(No readable text detected in this document)"


# ── 5. Public API ────────────────────────────────────────────────────────────

def extract_text_from_image(file_bytes: bytes, lang: str = ALL_LANGUAGES) -> dict:
    """Extract text from a single image (JPG / PNG / TIFF / BMP / WEBP)."""
    image = Image.open(io.BytesIO(file_bytes))
    text = _ocr_image(image, lang=lang)
    return {
        "extracted_text": text,
        "page_count": 1,
        "languages_used": lang,
    }


def extract_text_from_pdf(file_bytes: bytes, lang: str = ALL_LANGUAGES) -> dict:
    """Convert each PDF page to image via pypdfium2 or pdf2image, then run OCR."""
    pages = []

    # 1. Primary Engine: pypdfium2 (zero-dependency local PDF renderer)
    try:
        import pypdfium2 as pdfium  # type: ignore # pyright: ignore
        pdf = pdfium.PdfDocument(file_bytes)
        for page in pdf:
            pil_img = page.render(scale=2).to_pil().convert("RGB")
            pages.append(pil_img)
    except Exception as e:
        logger.warning(f"pypdfium2 extraction failed, trying pdf2image fallback: {e}")

    # 2. Secondary Engine: pdf2image
    if not pages:
        try:
            from pdf2image import convert_from_bytes  # type: ignore # pyright: ignore
            pages = convert_from_bytes(file_bytes, dpi=200)
        except Exception as e:
            return {
                "extracted_text": f"PDF Conversion Error: {e}",
                "page_count": 0,
                "languages_used": lang,
                "error": f"PDF Rendering Failed: {e}",
            }

    if not pages:
        return {
            "extracted_text": "Could not render PDF pages.",
            "page_count": 0,
            "languages_used": lang,
        }

    page_texts = []
    for i, page in enumerate(pages, start=1):
        text = _ocr_image(page, lang=lang)
        page_texts.append(f"--- Page {i} ---\n{text}")

    return {
        "extracted_text": "\n\n".join(page_texts),
        "page_count": len(pages),
        "languages_used": lang,
    }


def digitize_document_layout(extracted_text: str, filename: str = "") -> dict:
    """
    Reconstructs OCR text into an exact formatted digital replica HTML layout.
    Preserves centered headers, underline blanks, VERSUS sections, paragraph margins, and signature blocks.
    Uses Gemini AI if configured, with a smart fallback template engine.
    """
    if not extracted_text or not extracted_text.strip():
        return {
            "document_type": "Empty",
            "digitized_html": "<div style='text-align:center; padding:40px; color:#64748b;'>No text detected in document.</div>",
            "structured_fields": "{}"
        }

    load_dotenv()
    api_key = os.environ.get("GEMINI_API_KEY", "")

    if api_key:
        try:
            import google.generativeai as genai  # type: ignore # pyright: ignore
            genai.configure(api_key=api_key)
            model = genai.GenerativeModel("gemini-2.0-flash")

            prompt = f"""You are an expert legal document digitalizer. Reconstruct the following OCR text from a legal document or ID card into an exact, visually authentic HTML replica that preserves its original document layout and formatting.

Document Filename: {filename}
Raw OCR Text:
{extracted_text}

CRITICAL INSTRUCTIONS FOR HTML OUTPUT:
1. PRESERVE EXACT VISUAL LAYOUT:
   - Centered document titles (e.g. VAKALATNAMA, ELECTION COMMISSION OF INDIA, IN THE COURT OF...) using centered bold headings (<h2 style="text-align: center; font-weight: bold; margin: 15px 0;">...</h2>).
   - Underlined fill-in blanks: Replace underscores or blank lines with underlined fillable spans like `<u style="text-decoration: underline; display: inline-block; min-width: 120px;">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</u>` or pre-filled value if text was extracted.
   - For Court Petitions/Forms: Center `VERSUS` on its own line.
   - For Signature / Attestation Blocks at bottom: Place them in side-by-side flex boxes (<div style="display: flex; justify-content: space-between; margin-top: 40px; border-top: 1px dashed #cbd5e1; padding-top: 15px;">...</div>) e.g. "Signature of Executant(s)", "Left Thumb Impression(s)", "Advocate", "Date".
2. FOR ID CARDS (Election ID / Aadhaar / Driving License / PAN):
   - Wrap in a clean digital ID card badge container with header "ELECTION COMMISSION OF INDIA" / "GOVERNMENT OF INDIA", card number highlighted, photo placeholder box, and structured key-value grid (Name, Father's Name, Gender, DOB/Age).
3. Do NOT invent false case facts, but polish minor OCR spelling typos into proper legal terms (e.g., 'Vakalalnama' -> 'VAKALATNAMA', 'VERSUS' -> 'VERSUS').

Return ONLY this exact JSON object:
{{
  "document_type": "<e.g., Vakalatnama | ID Card | Court Petition | Affidavit | Legal Notice | General>",
  "digitized_html": "<clean inline-styled HTML string>",
  "structured_fields": {{ "<key1>": "<val1>", "<key2>": "<val2>" }}
}}
"""
            resp = model.generate_content(prompt)
            resp_text = resp.text.strip()
            if resp_text.startswith("```json"):
                resp_text = resp_text.replace("```json", "").replace("```", "").strip()
            parsed = json.loads(resp_text)
            if "digitized_html" in parsed and "document_type" in parsed:
                return {
                    "document_type": parsed.get("document_type", "Legal Document"),
                    "digitized_html": parsed.get("digitized_html", ""),
                    "structured_fields": json.dumps(parsed.get("structured_fields", {}))
                }
        except Exception as e:
            logger.warning(f"Gemini document digitalization error: {e}")

    # Fallback Template-based Digitalizer
    return _template_digitize_fallback(extracted_text, filename)


def _template_digitize_fallback(text: str, filename: str) -> dict:
    """Smart fallback document layout reconstruction engine."""
    text_lower = text.lower()
    lines = [line.strip() for line in text.split("\n") if line.strip()]

    # 1. Detect ID Card (e.g. Election ID / Aadhaar / PAN)
    if "election" in text_lower or "identity card" in text_lower or "elector" in text_lower or "voter" in text_lower or "wmb" in text_lower:
        card_no = ""
        name = ""
        father_name = ""
        gender = ""
        dob = ""

        for l in lines:
            if re.search(r"WMB\d+|[A-Z]{3}\d{7}", l, re.I):
                match = re.search(r"[A-Z0-9]{10}", l, re.I)
                card_no = match.group(0) if match else l
            elif "name:" in l.lower() or "name :" in l.lower():
                name = l.split(":")[-1].strip()
            elif "father" in l.lower() or "husband" in l.lower():
                father_name = l.split(":")[-1].strip()
            elif "gender" in l.lower() or "female" in l.lower() or "male" in l.lower():
                gender = "Female" if "female" in l.lower() else "Male" if "male" in l.lower() else l
            elif "dob" in l.lower() or "date" in l.lower() or "age" in l.lower() or re.search(r"\d{2}[\/\-]\d{2}[\/\-]\d{4}", l):
                dob = l.split(":")[-1].strip() if ":" in l else l

        html = f"""
        <div style="max-width: 480px; margin: 20px auto; border: 2px solid #2563eb; border-radius: 16px; padding: 20px; background: #ffffff; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1); font-family: sans-serif;">
          <div style="text-align: center; border-bottom: 2px solid #2563eb; padding-bottom: 12px; margin-bottom: 16px;">
            <div style="font-size: 11px; font-weight: bold; color: #64748b; text-transform: uppercase;">ELECTION COMMISSION OF INDIA</div>
            <div style="font-size: 14px; font-weight: 800; color: #0f172a; margin-top: 2px;">ELECTOR'S PHOTO IDENTITY CARD</div>
            {f'<div style="display:inline-block; background:#eff6ff; color:#1d4ed8; font-weight:bold; font-size:12px; padding:3px 10px; border-radius:6px; margin-top:6px;">{card_no}</div>' if card_no else ''}
          </div>
          <div style="display: flex; gap: 16px; align-items: flex-start;">
            <div style="width: 90px; height: 110px; border: 1.5px dashed #94a3b8; border-radius: 8px; background: #f8fafc; display: flex; align-items: center; justify-content: center; color: #94a3b8; font-size: 10px; text-align: center;">
              [ Holder Photo ]
            </div>
            <div style="flex: 1; font-size: 13px; color: #1e293b; line-height: 1.7;">
              <div><strong>Name:</strong> {name or '<u style="display:inline-block; min-width:140px;">&nbsp;</u>'}</div>
              <div><strong>Father's Name:</strong> {father_name or '<u style="display:inline-block; min-width:140px;">&nbsp;</u>'}</div>
              <div><strong>Gender:</strong> {gender or '<u style="display:inline-block; min-width:100px;">&nbsp;</u>'}</div>
              <div><strong>Date of Birth / Age:</strong> {dob or '<u style="display:inline-block; min-width:120px;">&nbsp;</u>'}</div>
            </div>
          </div>
        </div>
        """
        return {
            "document_type": "Election ID Card",
            "digitized_html": html,
            "structured_fields": json.dumps({"card_no": card_no, "name": name, "father_name": father_name, "gender": gender, "dob": dob})
        }

    # 2. Detect Vakalatnama (Matching user's Image 3 & Image 4)
    elif "vakalatnama" in text_lower or "appoint" in text_lower or "executant" in text_lower:
        html_lines = []
        html_lines.append('<div style="font-family: Georgia, serif; max-width: 650px; margin: 0 auto; padding: 30px; background: #fffdf5; border: 1px solid #e2e8f0; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); color: #0f172a; line-height: 1.8;">')
        html_lines.append('<h1 style="text-align: center; font-size: 22px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 24px; color: #0f172a;">VAKALATNAMA</h1>')
        
        for l in lines:
            l_strip = l.strip()
            if l_strip.upper() == "VAKALATNAMA":
                continue
            elif "in the court of" in l_strip.lower():
                court_val = l_strip.replace("IN THE COURT OF", "").replace("In the Court of", "").strip()
                html_lines.append(f'<div style="font-weight: bold; margin-bottom: 12px;">IN THE COURT OF <u style="min-width: 250px; display: inline-block;">{court_val or "&nbsp;" * 30}</u></div>')
            elif "versus" in l_strip.lower():
                html_lines.append('<div style="text-align: center; font-weight: 800; font-size: 14px; letter-spacing: 1px; margin: 18px 0;">VERSUS</div>')
            elif "known all men" in l_strip.lower() or "appoint" in l_strip.lower():
                html_lines.append(f'<p style="text-align: justify; text-indent: 20px; margin: 12px 0;">{l_strip}</p>')
            else:
                formatted = re.sub(r"_{2,}", '<u style="display:inline-block; min-width:140px;">&nbsp;</u>', l_strip)
                html_lines.append(f'<div style="margin: 8px 0;">{formatted}</div>')

        html_lines.append('''
        <div style="margin-top: 40px; padding-top: 20px; border-top: 1.5px solid #cbd5e1;">
          <div style="display: flex; justify-content: space-between; text-align: center; margin-bottom: 30px;">
            <div style="flex: 1; padding: 10px;">
              <div style="border-bottom: 1px dashed #94a3b8; height: 35px;"></div>
              <div style="font-weight: bold; font-size: 12px; margin-top: 6px;">Signature of the Executant(s)</div>
            </div>
            <div style="flex: 1; padding: 10px;">
              <div style="border-bottom: 1px dashed #94a3b8; height: 35px;"></div>
              <div style="font-weight: bold; font-size: 12px; margin-top: 6px;">Left Thumb Impression(s)</div>
            </div>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 12px; font-weight: bold; margin-top: 20px;">
            <div>Advocate: <u style="display:inline-block; min-width:140px;">&nbsp;</u><br/>Date: <u style="display:inline-block; min-width:140px;">&nbsp;</u></div>
            <div style="text-align: right;">Client: <u style="display:inline-block; min-width:140px;">&nbsp;</u><br/>Date: <u style="display:inline-block; min-width:140px;">&nbsp;</u></div>
          </div>
        </div>
        ''')
        html_lines.append('</div>')

        return {
            "document_type": "Vakalatnama",
            "digitized_html": "".join(html_lines),
            "structured_fields": json.dumps({"type": "Vakalatnama"})
        }

    # 3. General Legal Form / Petition Fallback
    else:
        html_lines = []
        html_lines.append('<div style="font-family: Georgia, serif; max-width: 680px; margin: 0 auto; padding: 30px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; color: #0f172a; line-height: 1.8;">')
        
        first_line = lines[0] if lines else "DIGITIZED LEGAL DOCUMENT"
        html_lines.append(f'<h2 style="text-align: center; font-size: 18px; font-weight: bold; text-transform: uppercase; margin-bottom: 20px; color: #1e293b;">{first_line}</h2>')

        for l in lines[1:]:
            l_strip = l.strip()
            if l_strip.lower() in ("versus", "vs", "vs."):
                html_lines.append('<div style="text-align: center; font-weight: bold; font-size: 14px; margin: 16px 0;">VERSUS</div>')
            elif re.search(r"_{2,}", l_strip):
                formatted = re.sub(r"_{2,}", '<u style="display:inline-block; min-width:120px;">&nbsp;</u>', l_strip)
                html_lines.append(f'<div style="margin: 10px 0;">{formatted}</div>')
            else:
                html_lines.append(f'<p style="margin: 10px 0; text-align: justify;">{l_strip}</p>')

        html_lines.append('''
        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; font-size: 12px; font-weight: bold;">
          <div>Advocate / Deponent<br/>Date: <u>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</u></div>
          <div style="text-align: right;">Signature / Verification<br/>Place: <u>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</u></div>
        </div>
        ''')
        html_lines.append('</div>')

        return {
            "document_type": "Legal Document",
            "digitized_html": "".join(html_lines),
            "structured_fields": json.dumps({})
        }


def run_ocr(file_bytes: bytes, content_type: str, lang: str = ALL_LANGUAGES, filename: str = "") -> dict:
    """Main OCR dispatcher."""
    pdf_types = {"application/pdf"}
    image_types = {
        "image/jpeg", "image/jpg", "image/png",
        "image/tiff", "image/bmp", "image/webp",
    }

    if content_type in pdf_types:
        res = extract_text_from_pdf(file_bytes, lang=lang)
    elif content_type in image_types or content_type.startswith("image/"):
        res = extract_text_from_image(file_bytes, lang=lang)
    else:
        return {
            "extracted_text": "",
            "page_count": 0,
            "languages_used": "",
            "error": f"Unsupported file type: {content_type}",
        }

    # Automatically generate digitized layout format
    if res and res.get("extracted_text"):
        digitized = digitize_document_layout(res["extracted_text"], filename=filename)
        res["digitized_html"] = digitized.get("digitized_html", "")
        res["document_type"] = digitized.get("document_type", "Legal Document")
        res["structured_fields"] = digitized.get("structured_fields", "{}")

    return res
