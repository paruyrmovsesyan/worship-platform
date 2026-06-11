import re

css_to_add = """
/* Fix hidden attribute override issue */
[hidden] { display: none !important; }
"""

def inject_css(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()
    
    if '</style>' in content:
        content = content.replace('</style>', css_to_add + '\n</style>', 1)
        with open(filename, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Injected hidden fix into {filename}")

inject_css('admin_updates.php')
inject_css('songs.php')
