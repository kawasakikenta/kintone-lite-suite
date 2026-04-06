import re, sys

path = r'c:\Users\Kksof\OneDrive\デスクトップ\kintone\tools\統合ツール\src\ui\template.js'

with open(path, 'r', encoding='utf-8') as f:
    text = f.read()

# Replace patchJsonEditor textarea with a div container for JSONEditor
old_patch = "u_patchJsonEditor"
# Find the textarea and replace it
text = re.sub(
    r'''<textarea id=["']u_patchJsonEditor["'][^>]*>[^<]*</textarea>''',
    '<div id="u_patchJsonEditor" style="width:100%;height:400px;border-radius:6px;"></div>',
    text
)

# Replace fieldJson textarea with a div container for JSONEditor
text = re.sub(
    r'''<textarea id=["']u_fieldJson["'][^>]*>[^<]*</textarea>''',
    '<div id="u_fieldJson" style="width:100%;height:300px;border-radius:6px;"></div>',
    text
)

with open(path, 'w', encoding='utf-8') as f:
    f.write(text)

print("Template patched successfully")
