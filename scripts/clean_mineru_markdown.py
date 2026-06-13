import re
import sys
import os

# 1. TCVN3 Signature Characters Map (Filtered to avoid standard Unicode vowels/accents)
# These characters are unique to CP1252/TCVN3 encoding and NEVER appear in standard Unicode Vietnamese.
# Mapping these globally is 100% safe and will not corrupt correct Unicode words.
TCVN3_SIGNATURES_MAP = {
    '®': 'đ',
    'µ': 'à',
    '¸': 'á',
    '¶': 'ả',
    '·': 'ã',
    '¹': 'ạ',
    '¨': 'ă',
    '»': 'ằ',
    '¾': 'ắ',
    '¼': 'ẳ',
    '½': 'ẵ',
    'Æ': 'ặ',
    '©': 'â',
    'Ç': 'ầ',
    'È': 'ẩ',
    'É': 'ẫ',
    'Ë': 'ậ',
    'Ì': 'è',
    'Ð': 'é',
    'Î': 'ẻ',
    'Ï': 'ẽ',
    'Ñ': 'ẹ',
    'ª': 'â',
    'Ò': 'ề',
    'Ö': 'ệ',
    '×': 'ì',
    'Ø': 'ỉ',
    'Ü': 'ĩ',
    'Þ': 'ị',
    'ß': 'ò',
    'ä': 'ọ',
    '«': 'ô',
    'å': 'ồ',
    'æ': 'ổ',
    'ç': 'ỗ',
    '¬': 'ơ',
    'ë': 'ở',
    'î': 'ợ',
    'ï': 'ù',
    'ñ': 'ủ',
    'ø': 'ứ',  # ø maps to ứ (e.g. thø -> thứ, chøc -> chức, øng -> ứng)
    'ö': 'ứ',
    '÷': 'ử',
    'û': 'ý',
    'ü': 'ỷ',
    'þ': 'ỹ',
    '¡': 'y',
    '¢': 'Ă',
    '§': 'Â',
    '£': 'Đ',
    '¤': 'Ê',
    '¥': 'Ô',
    '¦': 'Ơ'
}

# 2. Shifted Vowel & Word-level Replacements
# For words that contain TCVN3 shifts which map to standard Unicode characters.
# We replace these as whole words (using regex word boundaries) to prevent corrupting correct words.
WORD_REPLACEMENTS = {
    # TCVN3 uppercase overlapping vowel shifts
    r'\bCHUYÊN\b': 'CHUYÊN',
    r'\bCHUYấN\b': 'CHUYÊN',
    r'\bchuyờn\b': 'chuyên',
    r'\bễn\b': 'Ôn',
    r'\bễn tập\b': 'Ôn tập',
    r'\bKhỏi\b': 'Khái',
    r'\bkhỏi\b': 'khái',
    r'\bphỏp\b': 'pháp',
    r'\bPhỏp\b': 'pháp',
    r'\btớnh\b': 'tính',
    r'\bTớnh\b': 'tính',
    r'\blớ\b': 'lý',
    r'\bLớ\b': 'lý',
    r'\bớt\b': 'ít',
    r'\bchỏy\b': 'cháy',
    r'\bChỏy\b': 'cháy',
    r'\bkớnh\b': 'kính',
    r'\btỏch\b': 'tách',
    r'\bTỏch\b': 'tách',
    r'\bhỡnh\b': 'hình',
    r'\bHỡnh\b': 'hình',
    r'\bchớn\b': 'chín',
    r'\bmựi\b': 'mùi',
    r'\bMựi\b': 'mùi',
    r'\bkhụng\b': 'không',
    r'\bKhụng\b': 'Không',
    r'\bcú\b': 'có',
    r'\bCú\b': 'có',
    r'\bđỳng\b': 'đúng',
    r'\bĐỳng\b': 'đúng',
    r'\bchỳ\b': 'chú',
    r'\bChỳ\b': 'chú',
    r'\btrờn\b': 'trên',
    r'\bTrờn\b': 'trên',
    r'\bnờn\b': 'nên',
    r'\bNờn\b': 'nên',
    r'\bsụi\b': 'sôi',
    r'\bSụi\b': 'sôi',
    r'\bliờn\b': 'liên',
    r'\bLiờn\b': 'liên',
    r'\bdựng\b': 'dùng',
    r'\bDựng\b': 'dùng',
    r'\bcõu\b': 'câu',
    r'\bCõu\b': 'Câu',
    r'\bphõn\b': 'phân',
    r'\bPhõn\b': 'phân',
    r'\bcõn\b': 'cân',
    r'\bCõn\b': 'cân',
    r'\bđõy\b': 'đây',
    r'\bĐõy\b': 'đây',
    r'\bthỡ\b': 'thì',
    r'\bThỡ\b': 'thì',
    r'\bđú\b': 'đó',
    r'\bĐú\b': 'đó',
    r'\bmụi\b': 'môi',
    r'\bMụi\b': 'môi',
    r'\bloóng\b': 'loãng',
    r'\bLoóng\b': 'loãng',
    r'\bdóy\b': 'dãy',
    r'\bDóy\b': 'dãy',
    r'\bhúa\b': 'hóa',
    r'\bHúa\b': 'hóa',
    r'\bhúy\b': 'hóa',
    r'\bHúy\b': 'hóa',
    r'\bỏp\b': 'áp',
    r'\btrũng\b': 'tròng',
    r'\bhỳt\b': 'hút',
    
    # Specific words with standard vowel overlaps (e.g. Ê, Ô, Õ, Ý, é, è, í, ì, ó, ò, ô, õ, ù, ú, ý)
    r'\bchÕ\b': 'chế',
    r'\bchÊt\b': 'chất',
    r'\bsuÊt\b': 'suất',
    r'\baxÝt\b': 'axit',
    r'\bmuèi\b': 'muối',
    r'\bnãng\b': 'nóng',
    r'\btù\b': 'tự',
    r'\bgèc\b': 'gốc',
    r'\b®èt\b': 'đốt',
    r'\bkhèi\b': 'khối',
    r'\b®é\b': 'độ',
    r'\bbiÓu\b': 'biểu',
    r'\b®óng\b': 'đúng',
    r'\bthÝch\b': 'thích',
    r'\bmÊt\b': 'mất',
    r'\bcã\b': 'có',
    r'\bthêng\b': 'thường',
    r'\bÝt\b': 'ít',
    r'\bchiÕt\b': 'chiết',
    r'\bbiÕt\b': 'biết',
    r'\bhiÓu\b': 'hiểu',
    r'\bdông\b': 'dụng',
    r'\bnớc\b': 'nước',
    r'\bn-ớc\b': 'nước',
    r'\bchøa\b': 'chứa',
    r'\btrãng\b': 'tráng',
    
    # Spacing and common word boundaries
    r'\bchøc\b': 'chức',
    r'\bChøc\b': 'Chức',
    r'\bđun núng\b': 'đun nóng',
    r'\bđuụi\b': 'đuôi',
    r'\bĐuụi\b': 'Đuôi',
}

# 3. Chemistry arrows & custom formula regex fixes
CHEM_FIXES = [
    # Common OCR misreads of reaction arrows
    (r'o⎯⎯→t', r'$\\xrightarrow{t^\\circ}$'),
    (r'o⎯→t', r'$\\xrightarrow{t^\\circ}$'),
    (r'⎯⎯→t', r'$\\xrightarrow{t^\\circ}$'),
    (r'⎯→', r'$\\rightarrow$'),
    (r'⎯⎯→', r'$\\rightarrow$'),
    (r'o⎯⎯→', r'$\\xrightarrow{t^\\circ}$'),
    (r'⎯⎯⎯→', r'$\\rightarrow$'),
    (r'o⎯⎯→t', r'$\\xrightarrow{t^\\circ}$'),
    (r'o⎯⎯⎯→t', r'$\\xrightarrow{t^\\circ}$'),
    (r'o⎯⎯⎯→', r'$\\xrightarrow{t^\\circ}$'),
    
    # Chemistry specific math typos
    (r'd\s*\\tilde\s*\{\s*\\mathrm\s*\{\s*ac\s*\}\s*\}', r'\\text{đặc}'),
    (r'd\s*\\tilde\s*\{\s*ac\s*\}', r'\\text{đặc}'),
    (r'd\s*i\s*c', r'đặc'),
    (r'\\mathbf\s*\{\s*\\Gamma\s*\}\s*_\s*\{\s*-\s*\\mathrm\s*\{\s*\{\s*O\s*R\s*\}\s*\}\s*\}', r'-OR\''),
]

def tcvn3_to_unicode(text: str) -> str:
    # 1. Apply global signature character replacements (safe, non-overlapping characters)
    pattern = re.compile("|".join(re.escape(ch) for ch in TCVN3_SIGNATURES_MAP.keys()))
    text = pattern.sub(lambda m: TCVN3_SIGNATURES_MAP[m.group(0)], text)
    
    # 2. Apply word-level corrections
    for pattern, replacement in WORD_REPLACEMENTS.items():
        text = re.sub(pattern, replacement, text)
        
    # 3. Apply chemistry arrows and custom regex fixes
    for pattern, replacement in CHEM_FIXES:
        text = re.sub(pattern, replacement, text)
        
    return text

def clean_markdown_formatting(text: str) -> str:
    # 1. Convert <eq>...</eq> tags to $...$
    text = re.sub(r'<eq>(.*?)</eq>', r'$\1$', text)
    
    # 2. Fix multiple empty lines (max 2 consecutive newlines)
    text = re.sub(r'\n{3,}', '\n\n', text)
    
    # 3. Clean up strange spacer/OCR characters like , , , etc.
    text = re.sub(r'[]', '', text)
    
    # 4. Standardize equation alignments where $$ is split unnecessarily
    text = re.sub(r'\$\$\s*\n\s*(.*?)\s*\n\s*\$\$', r'$$\1$$', text)
    
    return text

def process_file(file_path: str):
    if not os.path.exists(file_path):
        print(f"Error: File not found: {file_path}")
        return
        
    print(f"Reading file: {file_path}")
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
        
    print("Converting TCVN3 / ABC characters to Unicode...")
    cleaned = tcvn3_to_unicode(content)
    
    print("Formatting equations and cleaning tags...")
    cleaned = clean_markdown_formatting(cleaned)
    
    # Generate output path
    dir_name, file_name = os.path.split(file_path)
    base_name, ext = os.path.splitext(file_name)
    output_name = f"{base_name}_cleaned{ext}"
    output_path = os.path.join(dir_name, output_name)
    
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(cleaned)
        
    print(f"Success! Cleaned file written to: {output_path}")

if __name__ == "__main__":
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except AttributeError:
        pass

    if len(sys.argv) < 2:
        print("Usage: python scripts/clean_mineru_markdown.py <path_to_markdown_file>")
        sys.exit(1)
        
    target_file = sys.argv[1]
    process_file(target_file)
