import base64
import os

image_path = r"C:/Users/kjomnia/.gemini/antigravity/brain/ecf09b27-84e6-4980-9caf-dc5f8952035f/uploaded_media_1770181925163.png"
html_path = r"C:/Antigravity/SQ/index.html"

# 1. Read Image and Convert to Base64
with open(image_path, "rb") as image_file:
    encoded_string = base64.b64encode(image_file.read()).decode('utf-8')

data_uri = f"data:image/png;base64,{encoded_string}"

# 2. Read HTML
with open(html_path, "r", encoding="utf-8") as html_file:
    content = html_file.read()

# 3. Replace the specific src attribute
# Logic: Look for the current src URL (wikimedia) and replace it
target_str = 'src="https://upload.wikimedia.org/wikipedia/commons/thumb/c/c8/LG_U%2B_logo.svg/2560px-LG_U%2B_logo.svg.png"'
replacement_str = f'src="{data_uri}"'

if target_str in content:
    new_content = content.replace(target_str, replacement_str)
    
    # 4. Write back
    with open(html_path, "w", encoding="utf-8") as html_file:
        html_file.write(new_content)
    print("Successfully replaced logo with embedded Base64 image.")
else:
    print("Target string not found. Replacement failed.")
