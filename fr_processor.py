#!/usr/bin/env python3
import sys
import os
import json
import re
import glob
from pathlib import Path

try:
    from docx import Document
    from docx.opc.exceptions import PackageNotFoundError
    DOCX_AVAILABLE = True
except ImportError:
    DOCX_AVAILABLE = False

DOC_CONVERTERS = []

try:
    import subprocess
    DOC_CONVERTERS.append("antiword")
except:
    pass

try:
    import win32com.client
    DOC_CONVERTERS.append("win32com")
except ImportError:
    pass


def find_fr_file(fr_number, fr_folder):
    fr_num = int(fr_number)
    folder_base = (fr_num // 100) * 100
    subfolder_name = f"FR{folder_base}s"
    
    patterns = [
        os.path.join(fr_folder, subfolder_name, f"FR{fr_number}.docx"),
        os.path.join(fr_folder, subfolder_name, f"FR{fr_number}.doc"),
        os.path.join(fr_folder, f"FR{fr_number}.docx"),
        os.path.join(fr_folder, f"FR{fr_number}.doc"),
    ]
    
    for pattern in patterns:
        if os.path.exists(pattern):
            return pattern
    
    for ext in [".docx", ".doc"]:
        matches = glob.glob(os.path.join(fr_folder, "**", f"*FR{fr_number}*{ext}"), recursive=True)
        if matches:
            return matches[0]
    
    return None


def escape_html(text):
    return text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace('"', "&quot;")


def read_docx(file_path):
    if not DOCX_AVAILABLE:
        raise ImportError("python-docx not installed. Run: pip install python-docx")
    
    doc = Document(file_path)
    content_parts = []
    headings = []
    title = ""
    status = ""
    html_parts = []
    
    for para in doc.paragraphs:
        text = para.text.strip()
        if not text:
            continue
        style_name = para.style.name.lower() if para.style else ""
        
        if not title and ("heading" in style_name or "title" in style_name):
            title = text
            headings.append(text)
            html_parts.append(f"<h1>{escape_html(text)}</h1>")
        elif "heading" in style_name:
            headings.append(text)
            html_parts.append(f"<h2>{escape_html(text)}</h2>")
        else:
            content_parts.append(text)
            html_parts.append(f"<p>{escape_html(text)}</p>")
        
        if not status and "status" in text.lower():
            match = re.search(r"status[:\s]+(\w+)", text, re.IGNORECASE)
            if match:
                status = match.group(1).strip()
    
    return {
        "title": title,
        "status": status,        "content": "\n\n".join(content_parts),
        "headings": headings,
        "html": "\n".join(html_parts),
        "filePath": file_path
    }


def read_doc_with_win32(file_path):
    import win32com.client
    import pythoncom
    
    pythoncom.CoInitialize()
    try:
        word = win32com.client.Dispatch("Word.Application")
        word.Visible = False
        doc = word.Documents.Open(os.path.abspath(file_path))
        content = doc.Content.Text
        doc.Close()
        word.Quit()
        
        lines = content.split("\n")
        title = lines[0].strip() if lines else ""
        
        return {
            "title": title,
            "status": "",
            "content": content,
            "headings": [title] if title else [],
            "html": "<p>" + escape_html(content).replace("\n", "</p><p>") + "</p>",
            "filePath": file_path
        }
    finally:
        pythoncom.CoUninitialize()


def read_doc(file_path):
    if "win32com" in DOC_CONVERTERS:
        try:
            return read_doc_with_win32(file_path)
        except Exception as e:
            pass
    raise ValueError("Cannot read .doc file. Install pywin32: pip install pywin32")


def get_preview(fr_number, fr_folder):
    file_path = find_fr_file(fr_number, fr_folder)
    if not file_path:
        return None
    
    ext = os.path.splitext(file_path)[1].lower()
    if ext == ".docx":
        data = read_docx(file_path)
    elif ext == ".doc":
        data = read_doc(file_path)
    else:
        return None
    
    return {"title": data["title"], "status": data["status"], "content": data["content"], "filePath": data["filePath"]}


def get_full_content(fr_number, fr_folder):
    file_path = find_fr_file(fr_number, fr_folder)
    if not file_path:
        return None
    
    ext = os.path.splitext(file_path)[1].lower()
    if ext == ".docx":
        return read_docx(file_path)
    elif ext == ".doc":
        return read_doc(file_path)
    return None


def main():
    if len(sys.argv) < 4:
        print(json.dumps({"error": "Usage: fr_processor.py <preview|full> <fr_number> <fr_folder>"}))
        sys.exit(1)
    
    command, fr_number, fr_folder = sys.argv[1], sys.argv[2], sys.argv[3]
    
    try:
        if command == "preview":
            result = get_preview(fr_number, fr_folder)
        elif command == "full":
            result = get_full_content(fr_number, fr_folder)
        else:
            result = {"error": "Unknown command"}
        
        if result:
            print(json.dumps(result))
        else:
            print(json.dumps({"error": "FR not found"}))
            sys.exit(1)
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)


if __name__ == "__main__":
    main()
