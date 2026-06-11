import re

with open('songs.php', 'r', encoding='utf-8') as f:
    content = f.read()

# We need to change the render logic of the table inside songs.php
# Let's see how renderRows looks.
