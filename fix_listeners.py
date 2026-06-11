import re

with open('songs.php', 'r', encoding='utf-8') as f:
    content = f.read()

# Make addEventListener safe for potentially missing elements
elements_to_safe = [
    'downloadTxtBtn', 'exportPdfBtn', 'exportAllPdfBtn',
    'tagsI', 'lyricsI', 'searchI', 'sortByI', 'lyricsFilterI', 'keyFilterI', 'tagFilterI',
    'toggleFiltersBtn', 'clearFiltersBtn', 'saveBtn', 'cancelEditBtn', 'clearBtn',
    'newSongBtn', 'refreshListBtn', 'loadMoreBtn'
]

for el in elements_to_safe:
    content = content.replace(f"{el}.addEventListener", f"{el}?.addEventListener")

with open('songs.php', 'w', encoding='utf-8') as f:
    f.write(content)

print("Listeners patched.")
