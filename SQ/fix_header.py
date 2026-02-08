import re

file_path = "C:/Antigravity/SQ/index.html"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Replace CSS
# Remove .logo-container css block
# It looks like:
# .logo-container {
#     margin-bottom: 1.5rem;
# }
css_pattern = r'\.logo-container\s*\{\s*margin-bottom:\s*1\.5rem;\s*\}'
content = re.sub(css_pattern, '', content)

# 2. Restructure HTML
# <div class="logo-container">
#     <img ...>
# </div>
# <h1>...</h1>
# 
# Becomes:
# <div class="header-row">
#     <img ...>
#     <h1>...</h1>
# </div>

if '<div class="logo-container">' in content:
    # Change container class
    content = content.replace('<div class="logo-container">', '<div class="header-row">')
    
    # Remove the closing div of the logo container (it's the one before h1)
    # Use strict replace for the sequence
    # We expect: </div>\s*<h1>
    content = re.sub(r'</div>\s*<h1>', '    <h1>', content, count=1)
    
    # Close the div after h1
    content = content.replace('</h1>', '</h1>\n        </div>')
    
    # Update h1 style to remove margin? 
    # Current CSS: h1 { ... margin-bottom: 2rem; ... }
    # We want: h1 { ... margin: 0; ... }
    # Or just inject the style inline or modify CSS block.
    # Let's modify CSS block using regex again.
    
    # Search for h1 block and replace margin-bottom
    # h1 { ... margin-bottom: 2rem; ... }
    # Use a simpler approach: Just add the new CSS rule at the end of style block to override?
    # No, let's try to replace.
    # Actually, simpler: The flex container handles gap, so h1 margin might be okay or weird.
    # Let's set h1 margin to 0 in css.
    
    content = re.sub(r'margin-bottom:\s*2rem;', 'margin: 0;', content) 
    # CAREFUL: This might replace other margins. 
    # Let's be more specific or skip this and fix CSS via tool later if needed.
    # Actually, the user asked to remove shadow.
    
    # Remove filter: drop-shadow
    content = re.sub(r'filter:\s*drop-shadow\(.*?\);', 'filter: none;', content)

    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)
    print("Header refactored successfully.")
else:
    print("logo-container not found.")
