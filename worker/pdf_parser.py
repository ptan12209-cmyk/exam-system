"""
PDF Parser module for extracting questions and answers from exam PDFs.
Supports Vietnamese formats including:
- Multiple choice (A/B/C/D)
- True/False (Đúng/Sai)
- Short answer (numeric)
"""

import re
from typing import Optional, Union


def extract_answer_key(text: str) -> dict:
    """
    Extract answer key from PDF text.
    First finds the answer section (ĐÁP ÁN), then parses from there.
    """
    result = {
        "multiple_choice": [],
        "true_false": [],
        "short_answer": [],
        "answers": []
    }
    
    # =========================================
    # Step 1: Find the answer section
    # =========================================
    
    # Look for answer section markers
    answer_markers = [
        r'ĐÁP\s*ÁN',
        r'DAP\s*AN',
        r'ANSWER\s*KEY',
        r'KEY\s*:',
        r'BẢNG\s*ĐÁP\s*ÁN'
    ]
    
    answer_section_text = text
    for marker in answer_markers:
        match = re.search(marker, text, re.IGNORECASE)
        if match:
            # Only parse from this point onwards
            answer_section_text = text[match.start():]
            print(f"Found answer section at position {match.start()}")
            break
    
    # =========================================
    # PART I: Multiple Choice (ABCD)
    # =========================================
    
    # First, try to find Part I / Phần I section within answer section
    part1_match = re.search(r'(?:Phần\s*I|Part\s*I|ABCD)', answer_section_text, re.IGNORECASE)
    if part1_match:
        # Find where Part II starts
        part2_match = re.search(r'(?:Phần\s*II|Part\s*II|Đúng\s*Sai|True\s*False)', answer_section_text[part1_match.start():], re.IGNORECASE)
        if part2_match:
            mc_section = answer_section_text[part1_match.start():part1_match.start() + part2_match.start()]
        else:
            mc_section = answer_section_text[part1_match.start():]
    else:
        mc_section = answer_section_text
    
    # Pattern: "1D 2C 3D" - number followed by letter (with or without separator)
    # Also handles: "1.D", "1-D", "1:D", "1 D"
    mc_pattern = r'\b(\d+)\s*[.\-:]?\s*([A-D])\b'
    mc_matches = re.findall(mc_pattern, mc_section.upper())
    
    # Remove duplicates by keeping first occurrence
    seen_questions = set()
    unique_mc = []
    for num_str, ans in mc_matches:
        num = int(num_str)
        if num not in seen_questions and 1 <= num <= 50:
            seen_questions.add(num)
            unique_mc.append((num, ans))
    
    # Sort by question number
    unique_mc.sort(key=lambda x: x[0])
    
    # Build ordered list
    if unique_mc:
        max_q = max(m[0] for m in unique_mc)
        mc_answers = [None] * max_q
        for num, ans in unique_mc:
            mc_answers[num - 1] = ans
        result["multiple_choice"] = mc_answers
    
    # =========================================
    # PART II: True/False (Đúng/Sai)
    # =========================================
    
    # Find Part II section
    part2_start = re.search(r'(?:Phần\s*II|Part\s*II|Đúng\s*Sai)', answer_section_text, re.IGNORECASE)
    if part2_start:
        part3_match = re.search(r'(?:Phần\s*III|Part\s*III|Trả\s*lời\s*ngắn|Short)', answer_section_text[part2_start.start():], re.IGNORECASE)
        if part3_match:
            tf_section = answer_section_text[part2_start.start():part2_start.start() + part3_match.start()]
        else:
            tf_section = answer_section_text[part2_start.start():]
        
        # Normalize Đ and S characters
        tf_section = tf_section.replace('Ꭰ', 'Đ').upper()
        
        # Pattern: "13 Đ Đ S Đ" or "13 D D S D"
        tf_pattern = r'(\d+)\s+([ĐDS])\s+([ĐDS])\s+([ĐDS])\s+([ĐDS])'
        tf_matches = re.findall(tf_pattern, tf_section)
        
        for match in tf_matches:
            q_num = int(match[0])
            sub_answers = {
                'a': match[1] in ['Đ', 'D'],
                'b': match[2] in ['Đ', 'D'],
                'c': match[3] in ['Đ', 'D'],
                'd': match[4] in ['Đ', 'D']
            }
            result["true_false"].append({
                "question": q_num,
                "answers": sub_answers
            })
    
    # =========================================
    # PART III: Short Answer (Numeric)
    # =========================================
    
    part3_start = re.search(r'(?:Phần\s*III|Part\s*III|Trả\s*lời\s*ngắn)', answer_section_text, re.IGNORECASE)
    if part3_start:
        sa_section = answer_section_text[part3_start.start():]
        
        # Pattern: "17 18" or "18 6,5" (question number followed by answer)
        # Each line: question_number answer_value
        lines = sa_section.split('\n')
        for line in lines:
            # Match: number followed by number (possibly with comma/decimal)
            sa_match = re.match(r'^\s*(\d+)\s+([\d.,]+)\s*$', line.strip())
            if sa_match:
                q_num = int(sa_match.group(1))
                ans_str = sa_match.group(2).replace(',', '.')
                try:
                    ans_val = float(ans_str)
                except:
                    ans_val = ans_str
                result["short_answer"].append({
                    "question": q_num,
                    "answer": ans_val
                })
    
    # =========================================
    # Build flat answers list
    # =========================================
    
    # Start with MC answers
    result["answers"] = result["multiple_choice"].copy() if result["multiple_choice"] else []
    
    # Add T/F as string format
    for tf in result["true_false"]:
        q_num = tf["question"]
        tf_str = ''.join(['Đ' if tf["answers"][k] else 'S' for k in ['a', 'b', 'c', 'd']])
        while len(result["answers"]) < q_num:
            result["answers"].append(None)
        if q_num <= len(result["answers"]):
            result["answers"][q_num - 1] = tf_str
        else:
            result["answers"].append(tf_str)
    
    # Add short answers
    for sa in result["short_answer"]:
        q_num = sa["question"]
        while len(result["answers"]) < q_num:
            result["answers"].append(None)
        if q_num <= len(result["answers"]):
            result["answers"][q_num - 1] = str(sa["answer"])
        else:
            result["answers"].append(str(sa["answer"]))
    
    return result


def parse_pdf_content(text: str) -> dict:
    """
    Main function to parse PDF content.
    """
    answer_data = extract_answer_key(text)
    
    return {
        "answer_key": answer_data["answers"],
        "multiple_choice": answer_data["multiple_choice"],
        "true_false": answer_data["true_false"],
        "short_answer": answer_data["short_answer"],
        "total_questions": len(answer_data["answers"]),
        "questions": []
    }


def parse_questions(text: str) -> list[dict]:
    """Legacy function - not used."""
    return []
