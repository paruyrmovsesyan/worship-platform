content = "<?php\nheader('Location: /songs.php');\nexit;\n?>"
with open('admin.php', 'w', encoding='utf-8') as f:
    f.write(content)
print("admin.php redirected")
