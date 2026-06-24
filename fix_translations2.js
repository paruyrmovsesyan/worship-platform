const fs = require('fs');

let content = fs.readFileSync('frontend/src/context/LanguageContext.jsx', 'utf8');

// The duplicate songView block in 'ru' (which says Том:)
content = content.replace(/    songView: \{\n      key: 'Том:',\n      tempo: 'Темп:',\n      addToSetlist: 'В сет-лист',\n      download: 'Скачать',\n      edit: 'Редактировать',\n      noLyrics: 'Текст или аккорды отсутствуют.'\n    \},/g, '');

fs.writeFileSync('frontend/src/context/LanguageContext.jsx', content);
