<?php
require_once 'runtime_config.php';
$conn = wp_runtime_open_mysqli();

$slug = 'update-5-2-5-features';

$content_hy = <<<TEXT
🚀 Worship Platform — Թարմացում 5.2.5

📋 1. Սեթլիստերի բաժին (Setlists)
• Բարեփոխվել և արդիանականացվել է սեթլիստեր բաժինը ամբողջությամբ - Այժմ սեթլիստեր բաժինը աշխտում է լիովին և բարելավվել է ամբողջ աշխատանքը։
• Երգերի վերադասավորում քաշելով (Touch & Drag) — Երգերի հերթականությունը սեթլիստում այժմ կարելի է արագ և հարմարավետ փոխել՝ պարզապես մատով քաշելով և տեղափոխելով (drag-and-drop)։
• Էկրանի չմարելու ֆունկցիա (Wake Lock) — Ծառայության, պաշտամունքի կամ փորձի ընթացքում էկրանն այլևս ավտոմատ չի մթնի կամ անջատվի։
• Live Mode արագ նավիգացիա — Ուղիղ եթերի/ծառայության ռեժիմում ավելացվել է հարմարավետ ներքևի վահանակ՝ հաջորդ և նախորդ երգերին մեկ հպումով անցնելու համար։
• Երգերի թերթում սվայփով (Song Swiping) — Սեթլիստից որևէ երգ բացելիս կարող եք էկրանը աջ կամ ձախ թերթելով միանգամից անցնել հաջորդ կամ նախորդ երգին։
• Տոնայնության պահպանում սեթլիստում — Եթե կոնկրետ ծառայության համար երգի տոնայնությունը փոխում եք, այն պահպանվում է հենց այդ սեթլիստի մեջ։
• Ծառայության ընդհանուր տևողություն — Ավտոմատ հաշվարկվում և ցուցադրվում է ամբողջ սեթլիստի ընդհանուր տևողությունը րոպեներով։
• Սեթլիստի հրավերներ չատով — Սեթլիստը կարող եք ուղարկել թիմակիցներին անմիջապես չատով՝ ինտերակտիվ քարտի տեսքով, որտեղից նրանք կարող են միանալ սեթլիստին։
• Դիտման 2 ռեժիմ (Grid / List) — Սեթլիստերի ցանկը կարող եք դիտել ինչպես մեծ տեսողական քարտերով (2 սյունակ), այնպես էլ կոմպակտ ցուցակով։
• Օֆֆլայն հասանելիության նշան — Հստակ երևում է, թե որ սեթլիստներն են արդեն պահպանված սարքի հիշողության մեջ՝ առանց ինտերնետի օգտագործելու համար։

⭐ 2. Պահպանված երգեր (Favorites)
• Երգերի սեփական դասավորություն (Custom Reorder) — Ավելացվել է «Վերադասավորել» հնարավորությունը (▲ և ▼ կոճակներով), որով կարող եք երգերը դասավորել ճիշտ այն հերթականությամբ, ինչպես ցանկանում եք։
• Արագ ավելացում սեթլիստի մեջ — Պահպանված ցանկից երգը կարելի է մեկ հպումով ավելացնել առկա սեթլիստում կամ տեղում ստեղծել նորը։
• Պատահական երգի ընտրություն (Random picker) — Կոճակ՝ պահպանված երգերից պատահական երգ արագ բացելու համար։
• Ակնթարթային բացում — Պահպանված երգերի էջը բացվում է վայրկենական՝ շնորհիվ խելացի քեշավորման։

🎵 3. Երգերի կատալոգ և խոսքեր (Songs)
• Բարլեավվել և վերափոխվել է երգարան բաժինը ավելացվել են նոր ֆունկցիաներ և դարձել ավելի հարմար օգտագործման համար
• Ավելացվել են նոր ֆիլտրներ — Ֆիլտրների աշխատանքը շտկվել է և այժմ ցուցադրում է բացառապես ճշգրիտ։
• Ինտերֆեյսի մաքրում — Երգերի քարտերից հեռացվել են ավելորդ կրկնվող նշանները՝ ապահովելով ավելի հստակ և մաքուր տեսք։
• Արագ ֆիլտրեր ըստ կատեգորիաների, տոնայնությունների և այբբենական կարգի։

🔔 4. Ծանուցումներ և Թարմացումներ (Push & Updates)
• Ակնթարթային Push ծանուցումներ — Նորացվել է ծանուցումների առաքման համակարգը․ բոլոր սարքերին (iOS, Android, Windows, Mac) push-երը հասնում են 1 վայրկյանից պակաս ժամանակում։
• iOS Safari և Android լիարժեք աջակցություն — Ծանուցումներն այժմ գալիս են գաղտնագրված ամբողջական տեքստով և նշանով՝ անմիջապես էկրանի վրա (Lock screen)։
• Իրական ժամանակում թարմացում — Եթե նոր տարբերակ է թողարկվում, ծրագիրը կամ կայքը բաց պահող օգտատերերի մոտ միանգամից հայտնվում է թարմացման պատուհանը՝ առանց ձեռքով էջը reload անելու կարիքի։

📞 5. Զանգեր և Չատ (Calls & Chat)
• Զանգերի ծանուցումներ փակ ծրագրում — Ձայնային/վիդեո զանգերի push ծանուցումները հուսալիորեն գալիս են նաև այն ժամանակ, երբ ծրագիրը փակ է։
• Զանգի ընդունման հուսալիություն — Երկարացվել է զանգի սպասման տևողությունը (մինչև 65 վրկ) և բացառվել են կրկնակի միացման սխալները։

⚡ 6. Արագագործություն և Համակարգ
• Ադմին պանելի կայունություն — Լուծվել է թարմացումներ ուղարկելիս առաջացող անվտանգության ստուգման (CSRF) սխալը։
• Օֆֆլայն քեշի նորացում — Թարմացվել է Service Worker-ը (v424)՝ ապահովելով անցանց ռեժիմում ավելի արագ բեռնում և ցանցային անջատումների ավտոմատ զտում։
TEXT;

$content_en = <<<TEXT
🚀 Worship Platform — Update 5.2.5

📋 1. Setlists
• Setlists section completely revamped and modernized - It is now fully functional and overall performance is improved.
• Touch & Drag Reorder — You can now quickly and easily change the song order in a setlist just by touching and dragging.
• Wake Lock — The screen will no longer automatically dim or turn off during a service, worship, or rehearsal.
• Live Mode Quick Navigation — A convenient bottom panel has been added in Live Mode to switch to the next or previous songs with a single tap.
• Song Swiping — When opening a song from a setlist, you can instantly go to the next or previous song by swiping left or right.
• Key Retention in Setlist — If you change the key of a song for a specific service, it is saved directly within that setlist.
• Total Service Duration — The total duration of the entire setlist in minutes is now automatically calculated and displayed.
• Setlist Invites via Chat — You can send a setlist directly to your teammates in chat as an interactive card, allowing them to join the setlist instantly.
• 2 View Modes (Grid / List) — You can view your setlists either as large visual cards (2 columns) or as a compact list.
• Offline Availability Indicator — It is now clearly visible which setlists are saved in the device's memory for offline use.

⭐ 2. Favorites
• Custom Reorder — Added a "Reorder" feature (using ▲ and ▼ buttons) that lets you arrange songs exactly in the order you want.
• Quick Add to Setlist — You can add a song from your favorites to an existing setlist with one tap, or create a new one on the spot.
• Random Picker — A button to quickly open a random song from your saved favorites.
• Instant Loading — The favorites page opens instantly thanks to smart caching.

🎵 3. Songs Catalog & Lyrics
• The songbook section has been improved and redesigned, with new features making it more convenient to use.
• New Filters Added — Filter functionality has been fixed and now displays perfectly accurate results.
• Interface Cleanup — Redundant repetitive icons have been removed from song cards, providing a cleaner and clearer look.
• Quick filters by categories, keys, and alphabetical order.

🔔 4. Push Notifications & Updates
• Instant Push Notifications — The notification delivery system has been upgraded. Pushes reach all devices (iOS, Android, Windows, Mac) in less than 1 second.
• Full iOS Safari & Android Support — Notifications now arrive fully encrypted with text and icons right on the Lock screen.
• Real-time Updates — If a new version is released, the update prompt immediately appears for users who have the app or site open, without needing to manually reload the page.

📞 5. Calls & Chat
• Call Notifications in Closed App — Push notifications for voice/video calls now reliably arrive even when the app is completely closed.
• Call Reception Reliability — Call wait time has been extended (up to 65 sec) and duplicate connection errors have been eliminated.

⚡ 6. Performance & System
• Admin Panel Stability — Resolved the security check (CSRF) error that occurred when sending updates.
• Offline Cache Upgrade — The Service Worker has been updated (v424), ensuring faster offline loading and automatic filtering of network disconnections.
TEXT;

$content_ru = <<<TEXT
🚀 Worship Platform — Обновление 5.2.5

📋 1. Раздел Сетлистов (Setlists)
• Раздел сетлистов полностью переработан и модернизирован — теперь он полностью функционален, а общая производительность улучшена.
• Изменение порядка перетаскиванием (Touch & Drag) — теперь можно быстро и удобно менять порядок песен в сетлисте простым касанием и перетаскиванием (drag-and-drop).
• Функция не гаснущего экрана (Wake Lock) — во время служения, прославления или репетиции экран больше не будет автоматически темнеть или отключаться.
• Быстрая навигация в Live Mode — в режиме прямого эфира/служения добавлена удобная нижняя панель для перехода к следующей или предыдущей песне в одно касание.
• Перелистывание песен свайпом (Song Swiping) — открыв песню из сетлиста, вы можете мгновенно перейти к следующей или предыдущей песне, смахнув экран вправо или влево.
• Сохранение тональности в сетлисте — если вы меняете тональность песни для конкретного служения, она сохраняется именно в этом сетлисте.
• Общая продолжительность служения — автоматически рассчитывается и отображается общая продолжительность всего сетлиста в минутах.
• Приглашения в сетлист через чат — вы можете отправить сетлист товарищам по команде прямо в чат в виде интерактивной карточки, откуда они могут к нему присоединиться.
• 2 режима просмотра (Grid / List) — список сетлистов можно просматривать как в виде больших визуальных карточек (2 столбца), так и в виде компактного списка.
• Индикатор офлайн-доступности — теперь четко видно, какие сетлисты уже сохранены в памяти устройства для использования без интернета.

⭐ 2. Сохраненные песни (Favorites)
• Собственный порядок песен (Custom Reorder) — добавлена функция «Изменить порядок» (кнопки ▲ и ▼), позволяющая расставить песни в желаемой последовательности.
• Быстрое добавление в сетлист — песню из сохраненного списка можно в одно касание добавить в существующий сетлист или создать новый на месте.
• Случайный выбор песни (Random picker) — кнопка для быстрого открытия случайной песни из сохраненных.
• Мгновенное открытие — страница сохраненных песен открывается мгновенно благодаря умному кэшированию.

🎵 3. Каталог песен и тексты (Songs)
• Раздел песенника улучшен и переработан, добавлены новые функции, делающие его более удобным в использовании.
• Добавлены новые фильтры — работа фильтров исправлена и теперь отображает абсолютно точные результаты.
• Очистка интерфейса — с карточек песен убраны лишние повторяющиеся значки, что обеспечило более чистый и понятный вид.
• Быстрые фильтры по категориям, тональностям и в алфавитном порядке.

🔔 4. Уведомления и Обновления (Push & Updates)
• Мгновенные Push-уведомления — обновлена система доставки уведомлений: push доставляются на все устройства (iOS, Android, Windows, Mac) менее чем за 1 секунду.
• Полная поддержка iOS Safari и Android — уведомления теперь приходят в полностью зашифрованном виде с текстом и значком прямо на экран блокировки (Lock screen).
• Обновления в реальном времени — если выходит новая версия, окно обновления мгновенно появляется у пользователей, у которых открыто приложение или сайт, без необходимости обновлять страницу вручную.

📞 5. Звонки и Чат (Calls & Chat)
• Уведомления о звонках в закрытом приложении — push-уведомления о голосовых/видеозвонках теперь надежно приходят даже тогда, когда приложение закрыто.
• Надежность приема звонков — увеличено время ожидания звонка (до 65 сек) и исключены ошибки дублирующихся подключений.

⚡ 6. Производительность и Система
• Стабильность админ-панели — решена ошибка проверки безопасности (CSRF), возникавшая при отправке обновлений.
• Обновление офлайн-кэша — обновен Service Worker (v424), обеспечивающий более быструю загрузку в офлайн-режиме и автоматическую фильтрацию отключений сети.
TEXT;

$sql = "UPDATE news_articles SET 
    content_hy = ?,
    content_en = ?,
    content_ru = ?,
    updated_at = NOW()
WHERE slug = ?";

$stmt = $conn->prepare($sql);
$stmt->bind_param("ssss", $content_hy, $content_en, $content_ru, $slug);

if ($stmt->execute()) {
    echo "News article updated successfully to plain text!\n";
} else {
    echo "Error updating news article: " . $stmt->error . "\n";
}
$stmt->close();
