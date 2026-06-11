import os, re

def extract_style(filename, outname):
    with open(filename, 'r') as f:
        content = f.read()
    match = re.search(r'<style[^>]*>(.*?)</style>', content, re.DOTALL | re.IGNORECASE)
    if match:
        with open(outname, 'w') as f:
            f.write(match.group(1))

extract_style('songs.php', 'songs_style_original.css')
extract_style('admin_updates.php', 'admin_style_original.css')
print("Extracted CSS.")
