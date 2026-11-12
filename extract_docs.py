import os
import re
import json
import win32com.client

DOCS_DIR = 'Shri Sai Satcharitra Docs'

def roman_to_int(s):
    roman = {'I': 1, 'V': 5, 'X': 10, 'L': 50, 'C': 100, 'D': 500, 'M': 1000}
    val = 0
    s = s.upper().strip()
    for i in range(len(s)):
        if i + 1 < len(s) and roman.get(s[i], 0) < roman.get(s[i+1], 0):
            val -= roman.get(s[i], 0)
        else:
            val += roman.get(s[i], 0)
    return val

def sort_key(fn):
    base = os.path.splitext(fn)[0]
    if 'Epilogue' in base:
        return 999
    m = re.search(r'Chapter[s]?\s+([IVXLCDM]+)', base, re.I)
    return roman_to_int(m.group(1)) if m else 1000

files = [f for f in os.listdir(DOCS_DIR) if f.endswith('.doc')]
sorted_files = sorted(files, key=sort_key)

print(f"Total files found: {len(sorted_files)}")

word = win32com.client.Dispatch('Word.Application')
word.Visible = False

raw_data = []
try:
    for idx, fn in enumerate(sorted_files):
        p = os.path.abspath(os.path.join(DOCS_DIR, fn))
        doc = word.Documents.Open(p, ReadOnly=True)
        paras = []
        for i in range(1, doc.Paragraphs.Count + 1):
            t = doc.Paragraphs(i).Range.Text.strip()
            t = t.replace('\r', '').replace('\x07', '').replace('\x0c', '').strip()
            if t:
                bold = doc.Paragraphs(i).Range.Font.Bold
                size = doc.Paragraphs(i).Range.Font.Size
                align = doc.Paragraphs(i).Alignment
                paras.append({
                    'text': t,
                    'bold': bold,
                    'size': size,
                    'align': align
                })
        doc.Close(False)
        raw_data.append({
            'filename': fn,
            'index': idx + 1,
            'paras': paras
        })
        print(f"[{idx+1:02d}/48] Read: {fn} ({len(paras)} paragraphs)")
finally:
    word.Quit()

print("All files read successfully! Processing structure...")

# Let's save raw extraction to scratch directory
with open('raw_extracted_docs.json', 'w', encoding='utf-8') as f:
    json.dump(raw_data, f, ensure_ascii=False, indent=2)

print("Saved raw_extracted_docs.json")
