import os, re

def extract_all_styles(filename):
    with open(filename, 'r') as f:
        content = f.read()
    matches = re.finditer(r'<style[^>]*>(.*?)</style>', content, re.DOTALL | re.IGNORECASE)
    for i, match in enumerate(matches):
        css = match.group(1)
        outname = f"{filename}_style_{i}.css"
        with open(outname, 'w') as outf:
            outf.write(css)
        print(f"Extracted {outname} - length: {len(css)} characters")

extract_all_styles('songs.php')
extract_all_styles('admin_updates.php')
