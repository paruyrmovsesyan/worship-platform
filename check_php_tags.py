with open('songs.php', 'r', encoding='utf-8') as f:
    text = f.read()

import re
matches = re.findall(r'<\?php|\?>|<\?=', text)
print("PHP tags found:", matches)
