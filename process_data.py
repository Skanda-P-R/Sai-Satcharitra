import json
import re

with open('raw_extracted_docs.json', 'r', encoding='utf-8') as f:
    raw_data = json.load(f)

def clean_text(text):
    if not text:
        return ""
    # Normalize unicode quotes and dashes
    text = text.replace('\u2018', "'").replace('\u2019', "'")
    text = text.replace('\u201c', '"').replace('\u201d', '"')
    text = text.replace('\u2013', '-').replace('\u2014', '--')
    text = re.sub(r'\s+', ' ', text).strip()
    return text

def parse_chapter(item, chap_idx):
    fn = item['filename']
    raw_paras = item['paras']
    
    # Filter out pure blank paragraphs
    paras = []
    for p in raw_paras:
        t = clean_text(p['text'])
        if t:
            paras.append({'text': t, 'bold': p['bold'], 'size': p['size']})
            
    # Default metadata
    chapter_num_str = ""
    title = ""
    subtitle = ""
    author_byline = ""
    body_paras = []
    
    # Check if Chapter I
    if 'Chapter I.doc' in fn:
        author_byline = "Shri Dabholkar (Hemadpant)"
        chapter_num_str = "Chapter I"
        title = "Salutations & The Story of Grinding Wheat"
        subtitle = "Salutations -- The Story of Grinding Wheat and Its Philosophical Significance."
        start_idx = 4
    elif 'Epilogue' in fn:
        chapter_num_str = "Epilogue"
        title = "Concluding Remarks & Fala-Shruti (Reward of Study)"
        subtitle = "Conclusion of the Holy Work -- The Greatness of Sad-guru Sai and Reward of Study."
        start_idx = 1
    else:
        # P0 is usually "Chapter X"
        p0 = paras[0]['text']
        chapter_num_str = p0
        
        # P1 is usually title or subtitle
        p1 = paras[1]['text']
        
        # Check if P2 is subtitle or first body paragraph
        p2 = paras[2]['text'] if len(paras) > 2 else ""
        
        # In chapters like IV, VI, IX, XXVIII, XL: P1 is short uppercase or bold Title, P2 is topic list
        if len(paras) > 2 and (paras[1]['bold'] == -1 or p1.isupper() or len(p1) < 60) and len(p2) > 30 and ('-' in p2 or '--' in p2):
            title = p1
            subtitle = p2
            start_idx = 3
        else:
            title = p1
            subtitle = ""
            start_idx = 2
            
    # Clean up title if it's too long or has dash-separated topics
    short_title = title
    if ' - ' in short_title and len(short_title) > 60:
        short_title = short_title.split(' - ')[0]
    elif ' -- ' in short_title and len(short_title) > 60:
        short_title = short_title.split(' -- ')[0]

    # Process remaining paragraphs
    elements = []
    p_counter = 1
    
    for i in range(start_idx, len(paras)):
        p = paras[i]
        t = p['text']
        bold = p['bold']
        
        # Check if closing benediction
        if re.search(r'bow to shri sai', t, re.I) or re.search(r'peace be to all', t, re.I):
            elements.append({
                'id': f'c{chap_idx}-end',
                'type': 'benediction',
                'text': t
            })
            continue
            
        # Check if section heading: short (<80 chars), bold, not ending in period, or matches known patterns
        is_heading = False
        if bold == -1 and len(t) < 80 and not t.endswith('.'):
            is_heading = True
        elif bold == -1 and len(t) < 60 and not t.endswith('?"') and not t.endswith('!"'):
            is_heading = True
        elif t in ['Preliminary', 'Mission of the Saints', 'Special Characteristic of Baba', 'Signs of Sad-guru', 'Greatness of Udi', 'Previous Preparation', 'Greatness of Sad-guru Sai', 'Prayer', 'Fala-Shruti (Reward of Study)']:
            is_heading = True
            
        if is_heading:
            elements.append({
                'id': f'c{chap_idx}-h{len(elements)+1}',
                'type': 'heading',
                'text': t
            })
        else:
            # Check if verse / shloka (e.g. in Chapter 39)
            if t.startswith("'Tadviddhi") or t.startswith("Upadekshyanti"):
                elements.append({
                    'id': f'c{chap_idx}-p{p_counter}',
                    'type': 'verse',
                    'text': t
                })
            else:
                elements.append({
                    'id': f'c{chap_idx}-p{p_counter}',
                    'type': 'paragraph',
                    'text': t
                })
            p_counter += 1
            
    # Word count and reading time
    all_text = " ".join([el['text'] for el in elements])
    word_count = len(all_text.split())
    reading_time = max(1, round(word_count / 200)) # ~200 wpm
    
    return {
        'id': chap_idx,
        'filename': fn,
        'chapterLabel': chapter_num_str,
        'title': short_title,
        'fullTitle': title,
        'subtitle': subtitle,
        'authorByline': author_byline,
        'wordCount': word_count,
        'readingTime': reading_time,
        'elements': elements
    }

parsed_chapters = []
for idx, item in enumerate(raw_data):
    ch = parse_chapter(item, idx + 1)
    parsed_chapters.append(ch)

print(f"Parsed {len(parsed_chapters)} chapters successfully.")
for ch in parsed_chapters:
    headings = [el['text'] for el in ch['elements'] if el['type'] == 'heading']
    paras = [el for el in ch['elements'] if el['type'] in ('paragraph', 'verse')]
    print(f"[{ch['id']:2d}] {ch['chapterLabel']:<22} | {ch['title'][:32]:<32} | {len(paras):2d} paras | {len(headings):2d} heads | {ch['wordCount']:4d} w | {ch['readingTime']}m")
