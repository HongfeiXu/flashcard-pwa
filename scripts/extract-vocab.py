#!/usr/bin/env python3
"""从经济学人 MD 文件中提取词汇，输出到 vocab.json"""

import re
import json
import os
import sys

def extract_from_table(text, source):
    """提取表格格式词汇"""
    vocab = []
    # Match: | **word** | /phonetic/ | pos. 释义 | *example* |
    pattern = r'\|\s*\*\*(\w[\w\s-]*?)\*\*\s*\|\s*(/[^/]+/)\s*\|\s*([^|]+?)\s*\|\s*\*?([^|]*?)\*?\s*\|'
    for m in re.finditer(pattern, text):
        word = m.group(1).strip().lower()
        phonetic = m.group(2).strip()
        pos_def = m.group(3).strip()
        example = m.group(4).strip().strip('*').strip()
        
        # Split pos and definition
        pos_match = re.match(r'^([a-z]+\.(?:/[a-z]+\.)*)\s*(.*)', pos_def)
        if pos_match:
            pos = pos_match.group(1)
            definition = pos_match.group(2)
        else:
            pos = ''
            definition = pos_def
        
        vocab.append({
            'word': word,
            'phonetic': phonetic,
            'pos': pos,
            'definition': definition,
            'example': example,
            'example_cn': '',
            'source': source
        })
    return vocab

def extract_from_list(text, source):
    """提取条目格式词汇"""
    vocab = []
    # Match numbered items like:
    # 1. **armada** /ɑːˈmɑːdə/ (n.)
    #    *舰队；大批*
    #    Example: ...
    blocks = re.split(r'\n\d+\.\s+\*\*', text)
    for block in blocks[1:]:  # skip first empty split
        lines = block.strip().split('\n')
        # First line: word** /phonetic/ (pos)
        first = lines[0]
        word_match = re.match(r'([\w-]+)\*\*\s*(/[^/]+/)?\s*\(([^)]+)\)?', first)
        if not word_match:
            continue
        
        word = word_match.group(1).strip().lower()
        phonetic = (word_match.group(2) or '').strip()
        pos = (word_match.group(3) or '').strip()
        
        definition = ''
        example = ''
        example_cn = ''
        
        for line in lines[1:]:
            line = line.strip()
            if line.startswith('*') and line.endswith('*') and not definition:
                definition = line.strip('*').strip()
            elif line.startswith('Example:') or line.startswith('example:'):
                example = re.sub(r'^[Ee]xample:\s*', '', line).strip()
            elif line.startswith('翻译:') or line.startswith('译:'):
                example_cn = re.sub(r'^(翻译|译):\s*', '', line).strip()
        
        vocab.append({
            'word': word,
            'phonetic': phonetic,
            'pos': pos,
            'definition': definition,
            'example': example,
            'example_cn': example_cn,
            'source': source
        })
    return vocab

def extract_vocab_from_md(filepath):
    """从单个 MD 文件提取词汇"""
    with open(filepath, 'r', encoding='utf-8') as f:
        text = f.read()
    
    # Derive source from filename
    basename = os.path.basename(filepath).replace('.md', '')
    
    # Try both formats
    vocab = extract_from_table(text, basename)
    if not vocab:
        vocab = extract_from_list(text, basename)
    
    return vocab

def main():
    output_dir = '/home/hongfei/.openclaw/workspace/flashcard-pwa'
    vocab_path = os.path.join(output_dir, 'vocab.json')
    md_dir = '/home/hongfei/.openclaw/workspace/outputs'
    
    # Load existing vocab
    existing = []
    if os.path.exists(vocab_path):
        with open(vocab_path, 'r', encoding='utf-8') as f:
            existing = json.load(f)
    
    existing_words = {v['word'].lower() for v in existing}
    
    # Extract from all MD files
    all_new = []
    for fname in sorted(os.listdir(md_dir)):
        if not fname.startswith('economist-') or not fname.endswith('.md'):
            continue
        filepath = os.path.join(md_dir, fname)
        vocab = extract_vocab_from_md(filepath)
        for v in vocab:
            if v['word'].lower() not in existing_words:
                all_new.append(v)
                existing_words.add(v['word'].lower())
                print(f"  + {v['word']} ({v['source']})")
    
    # Merge and save
    merged = existing + all_new
    with open(vocab_path, 'w', encoding='utf-8') as f:
        json.dump(merged, f, ensure_ascii=False, indent=2)
    
    print(f"\nDone: {len(all_new)} new, {len(existing)} existing, {len(merged)} total")

if __name__ == '__main__':
    main()
