const fs = require('fs');

let content = fs.readFileSync('frontend/src/context/LanguageContext.jsx', 'utf8');

// The duplicate songView block in 'am'
content = content.replace(/    songView: \{\n      key: 'Տոնայնություն:',\n      tempo: 'Տեմպ:',\n      addToSetlist: 'Ավելացնել երգացանկում',\n      download: 'Ներբեռնել',\n      edit: 'Խմբագրել',\n      noLyrics: 'Տեքստ կամ ակորդներ չկան:'\n    \},/g, '');

// The duplicate songView block in 'en'
content = content.replace(/    songView: \{\n      key: 'Key:',\n      tempo: 'Tempo:',\n      addToSetlist: 'Add to Setlist',\n      download: 'Download',\n      edit: 'Edit',\n      noLyrics: 'No lyrics or chords available.'\n    \},/g, '');

// The duplicate songView block in 'ru'
content = content.replace(/    songView: \{\n      key: 'Тональность:',\n      tempo: 'Темп:',\n      addToSetlist: 'Добавить в сет-лист',\n      download: 'Скачать',\n      edit: 'Редактировать',\n      noLyrics: 'Текст или аккорды отсутствуют.'\n    \},/g, '');


// The duplicate songRequest block in 'am'
content = content.replace(/    songRequest: \{\n      title: 'Երգի հարցում'\n    \}/g, '');

// The duplicate songRequest block in 'en'
content = content.replace(/    songRequest: \{\n      title: 'Song Request'\n    \}/g, '');

// The duplicate songRequest block in 'ru'
content = content.replace(/    songRequest: \{\n      title: 'Запрос песни'\n    \}/g, '');

// Add missing to first songView am
content = content.replace(/      setlistTitle: 'Երգացանկ'/g, "      setlistTitle: 'Երգացանկ',\n      key: 'Տոնայնություն:',\n      tempo: 'Տեմպ:',\n      addToSetlist: 'Ավելացնել երգացանկում',\n      download: 'Ներբեռնել',\n      edit: 'Խմբագրել'");

// Add missing to first songView en
content = content.replace(/      setlistTitle: 'Setlist'/g, "      setlistTitle: 'Setlist',\n      key: 'Key:',\n      tempo: 'Tempo:',\n      addToSetlist: 'Add to Setlist',\n      download: 'Download',\n      edit: 'Edit'");

// Add missing to first songView ru
content = content.replace(/      setlistTitle: 'Сет-лист'/g, "      setlistTitle: 'Сет-лист',\n      key: 'Тональность:',\n      tempo: 'Темп:',\n      addToSetlist: 'Добавить в сет-лист',\n      download: 'Скачать',\n      edit: 'Редактировать'");

// Add missing to first songRequest am
content = content.replace(/      titleNew: 'Առաջարկել Նոր Երգ',/g, "      title: 'Երգի հարցում',\n      titleNew: 'Առաջարկել Նոր Երգ',");

// Add missing to first songRequest en
content = content.replace(/      titleNew: 'Suggest New Song',/g, "      title: 'Song Request',\n      titleNew: 'Suggest New Song',");

// Add missing to first songRequest ru
content = content.replace(/      titleNew: 'Предложить новую песню',/g, "      title: 'Запрос песни',\n      titleNew: 'Предложить новую песню',");

fs.writeFileSync('frontend/src/context/LanguageContext.jsx', content);
