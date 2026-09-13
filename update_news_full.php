<?php
require_once 'runtime_config.php';
$conn = wp_runtime_open_mysqli();

$slug = 'update-5-2-5-features';

$content_hy = <<<HTML
<p><strong>🚀 Worship Platform — Թարմացում 5.2.5</strong></p>

<p><strong>📋 1. Սեթլիստերի բաժին (Setlists)</strong></p>
<ul>
    <li><strong>Բարեփոխվել և արդիանականացվել է սեթլիստեր բաժինը ամբողջությամբ</strong> - Այժմ սեթլիստեր բաժինը աշխտում է լիովին և բարելավվել է ամբողջ աշխատանքը։</li>
    <li><strong>Երգերի վերադասավորում քաշելով (Touch & Drag)</strong> — Երգերի հերթականությունը սեթլիստում այժմ կարելի է արագ և հարմարավետ փոխել՝ պարզապես մատով քաշելով և տեղափոխելով (drag-and-drop)։</li>
    <li><strong>Էկրանի չմարելու ֆունկցիա (Wake Lock)</strong> — Ծառայության, պաշտամունքի կամ փորձի ընթացքում էկրանն այլևս ավտոմատ չի մթնի կամ անջատվի։</li>
    <li><strong>Live Mode արագ նավիգացիա</strong> — Ուղիղ եթերի/ծառայության ռեժիմում ավելացվել է հարմարավետ ներքևի վահանակ՝ հաջորդ և նախորդ երգերին մեկ հպումով անցնելու համար։</li>
    <li><strong>Երգերի թերթում սվայփով (Song Swiping)</strong> — Սեթլիստից որևէ երգ բացելիս կարող եք էկրանը աջ կամ ձախ թերթելով միանգամից անցնել հաջորդ կամ նախորդ երգին։</li>
    <li><strong>Տոնայնության պահպանում սեթլիստում</strong> — Եթե կոնկրետ ծառայության համար երգի տոնայնությունը փոխում եք, այն պահպանվում է հենց այդ սեթլիստի մեջ։</li>
    <li><strong>Ծառայության ընդհանուր տևողություն</strong> — Ավտոմատ հաշվարկվում և ցուցադրվում է ամբողջ սեթլիստի ընդհանուր տևողությունը րոպեներով։</li>
    <li><strong>Սեթլիստի հրավերներ չատով</strong> — Սեթլիստը կարող եք ուղարկել թիմակիցներին անմիջապես չատով՝ ինտերակտիվ քարտի տեսքով, որտեղից նրանք կարող են միանալ սեթլիստին։</li>
    <li><strong>Դիտման 2 ռեժիմ (Grid / List)</strong> — Սեթլիստերի ցանկը կարող եք դիտել ինչպես մեծ տեսողական քարտերով (2 սյունակ), այնպես էլ կոմպակտ ցուցակով։</li>
    <li><strong>Օֆֆլայն հասանելիության նշան</strong> — Հստակ երևում է, թե որ սեթլիստներն են արդեն պահպանված սարքի հիշողության մեջ՝ առանց ինտերնետի օգտագործելու համար։</li>
</ul>

<p><strong>⭐ 2. Պահպանված երգեր (Favorites)</strong></p>
<ul>
    <li><strong>Երգերի սեփական դասավորություն (Custom Reorder)</strong> — Ավելացվել է «Վերադասավորել» հնարավորությունը (▲ և ▼ կոճակներով), որով կարող եք երգերը դասավորել ճիշտ այն հերթականությամբ, ինչպես ցանկանում եք։</li>
    <li><strong>Արագ ավելացում սեթլիստի մեջ</strong> — Պահպանված ցանկից երգը կարելի է մեկ հպումով ավելացնել առկա սեթլիստում կամ տեղում ստեղծել նորը։</li>
    <li><strong>Պատահական երգի ընտրություն (Random picker)</strong> — Կոճակ՝ պահպանված երգերից պատահական երգ արագ բացելու համար։</li>
    <li><strong>Ակնթարթային բացում</strong> — Պահպանված երգերի էջը բացվում է վայրկենական՝ շնորհիվ խելացի քեշավորման։</li>
</ul>

<p><strong>🎵 3. Երգերի կատալոգ և խոսքեր (Songs)</strong></p>
<ul>
    <li><strong>Բարլեավվել և վերափոխվել է երգարան բաժինը</strong> ավելացվել են նոր ֆունկցիաներ և դարձել ավելի հարմար օգտագործման համար</li>
    <li><strong>Ավելացվել են նոր ֆիլտրներ</strong> — Ֆիլտրների աշխատանքը շտկվել է և այժմ ցուցադրում է բացառապես ճշգրիտ։</li>
    <li><strong>Ինտերֆեյսի մաքրում</strong> — Երգերի քարտերից հեռացվել են ավելորդ կրկնվող նշանները՝ ապահովելով ավելի հստակ և մաքուր տեսք։</li>
    <li><strong>Արագ ֆիլտրեր</strong> ըստ կատեգորիաների, տոնայնությունների և այբբենական կարգի։</li>
</ul>

<p><strong>🔔 4. Ծանուցումներ և Թարմացումներ (Push & Updates)</strong></p>
<ul>
    <li><strong>Ակնթարթային Push ծանուցումներ</strong> — Նորացվել է ծանուցումների առաքման համակարգը․ բոլոր սարքերին (iOS, Android, Windows, Mac) push-երը հասնում են 1 վայրկյանից պակաս ժամանակում։</li>
    <li><strong>iOS Safari և Android լիարժեք աջակցություն</strong> — Ծանուցումներն այժմ գալիս են գաղտնագրված ամբողջական տեքստով և նշանով՝ անմիջապես էկրանի վրա (Lock screen)։</li>
    <li><strong>Իրական ժամանակում թարմացում</strong> — Եթե նոր տարբերակ է թողարկվում, ծրագիրը կամ կայքը բաց պահող օգտատերերի մոտ միանգամից հայտնվում է թարմացման պատուհանը՝ առանց ձեռքով էջը reload անելու կարիքի։</li>
</ul>

<p><strong>📞 5. Զանգեր և Չատ (Calls & Chat)</strong></p>
<ul>
    <li><strong>Զանգերի ծանուցումներ փակ ծրագրում</strong> — Ձայնային/վիդեո զանգերի push ծանուցումները հուսալիորեն գալիս են նաև այն ժամանակ, երբ ծրագիրը փակ է։</li>
    <li><strong>Զանգի ընդունման հուսալիություն</strong> — Երկարացվել է զանգի սպասման տևողությունը (մինչև 65 վրկ) և բացառվել են կրկնակի միացման սխալները։</li>
</ul>

<p><strong>⚡ 6. Արագագործություն և Համակարգ</strong></p>
<ul>
    <li><strong>Ադմին պանելի կայունություն</strong> — Լուծվել է թարմացումներ ուղարկելիս առաջացող անվտանգության ստուգման (CSRF) սխալը։</li>
    <li><strong>Օֆֆլայն քեշի նորացում</strong> — Թարմացվել է Service Worker-ը (<code>v424</code>)՝ ապահովելով անցանց ռեժիմում ավելի արագ բեռնում և ցանցային անջատումների ավտոմատ զտում։</li>
</ul>
HTML;

$content_en = <<<HTML
<p><strong>🚀 Worship Platform — Update 5.2.5</strong></p>

<p><strong>📋 1. Setlists</strong></p>
<ul>
    <li><strong>Setlists section completely revamped and modernized</strong> - It is now fully functional and overall performance is improved.</li>
    <li><strong>Touch & Drag Reorder</strong> — You can now quickly and easily change the song order in a setlist just by touching and dragging.</li>
    <li><strong>Wake Lock</strong> — The screen will no longer automatically dim or turn off during a service, worship, or rehearsal.</li>
    <li><strong>Live Mode Quick Navigation</strong> — A convenient bottom panel has been added in Live Mode to switch to the next or previous songs with a single tap.</li>
    <li><strong>Song Swiping</strong> — When opening a song from a setlist, you can instantly go to the next or previous song by swiping left or right.</li>
    <li><strong>Key Retention in Setlist</strong> — If you change the key of a song for a specific service, it is saved directly within that setlist.</li>
    <li><strong>Total Service Duration</strong> — The total duration of the entire setlist in minutes is now automatically calculated and displayed.</li>
    <li><strong>Setlist Invites via Chat</strong> — You can send a setlist directly to your teammates in chat as an interactive card, allowing them to join the setlist instantly.</li>
    <li><strong>2 View Modes (Grid / List)</strong> — You can view your setlists either as large visual cards (2 columns) or as a compact list.</li>
    <li><strong>Offline Availability Indicator</strong> — It is now clearly visible which setlists are saved in the device's memory for offline use.</li>
</ul>

<p><strong>⭐ 2. Favorites</strong></p>
<ul>
    <li><strong>Custom Reorder</strong> — Added a "Reorder" feature (using ▲ and ▼ buttons) that lets you arrange songs exactly in the order you want.</li>
    <li><strong>Quick Add to Setlist</strong> — You can add a song from your favorites to an existing setlist with one tap, or create a new one on the spot.</li>
    <li><strong>Random Picker</strong> — A button to quickly open a random song from your saved favorites.</li>
    <li><strong>Instant Loading</strong> — The favorites page opens instantly thanks to smart caching.</li>
</ul>

<p><strong>🎵 3. Songs Catalog & Lyrics</strong></p>
<ul>
    <li><strong>The songbook section has been improved and redesigned</strong>, with new features making it more convenient to use.</li>
    <li><strong>New Filters Added</strong> — Filter functionality has been fixed and now displays perfectly accurate results.</li>
    <li><strong>Interface Cleanup</strong> — Redundant repetitive icons have been removed from song cards, providing a cleaner and clearer look.</li>
    <li><strong>Quick filters</strong> by categories, keys, and alphabetical order.</li>
</ul>

<p><strong>🔔 4. Push Notifications & Updates</strong></p>
<ul>
    <li><strong>Instant Push Notifications</strong> — The notification delivery system has been upgraded. Pushes reach all devices (iOS, Android, Windows, Mac) in less than 1 second.</li>
    <li><strong>Full iOS Safari & Android Support</strong> — Notifications now arrive fully encrypted with text and icons right on the Lock screen.</li>
    <li><strong>Real-time Updates</strong> — If a new version is released, the update prompt immediately appears for users who have the app or site open, without needing to manually reload the page.</li>
</ul>

<p><strong>📞 5. Calls & Chat</strong></p>
<ul>
    <li><strong>Call Notifications in Closed App</strong> — Push notifications for voice/video calls now reliably arrive even when the app is completely closed.</li>
    <li><strong>Call Reception Reliability</strong> — Call wait time has been extended (up to 65 sec) and duplicate connection errors have been eliminated.</li>
</ul>

<p><strong>⚡ 6. Performance & System</strong></p>
<ul>
    <li><strong>Admin Panel Stability</strong> — Resolved the security check (CSRF) error that occurred when sending updates.</li>
    <li><strong>Offline Cache Upgrade</strong> — The Service Worker has been updated (<code>v424</code>), ensuring faster offline loading and automatic filtering of network disconnections.</li>
</ul>
HTML;

$content_ru = <<<HTML
<p><strong>🚀 Worship Platform — Обновление 5.2.5</strong></p>

<p><strong>📋 1. Раздел Сетлистов (Setlists)</strong></p>
<ul>
    <li><strong>Раздел сетлистов полностью переработан и модернизирован</strong> — теперь он полностью функционален, а общая производительность улучшена.</li>
    <li><strong>Изменение порядка перетаскиванием (Touch & Drag)</strong> — теперь можно быстро и удобно менять порядок песен в сетлисте простым касанием и перетаскиванием.</li>
    <li><strong>Функция не гаснущего экрана (Wake Lock)</strong> — во время служения, прославления или репетиции экран больше не будет автоматически темнеть или отключаться.</li>
    <li><strong>Быстрая навигация в Live Mode</strong> — в режиме прямого эфира/служения добавлена удобная нижняя панель для перехода к следующей или предыдущей песне в одно касание.</li>
    <li><strong>Перелистывание песен свайпом (Song Swiping)</strong> — открыв песню из сетлиста, вы можете мгновенно перейти к следующей или предыдущей песне, смахнув экран вправо или влево.</li>
    <li><strong>Сохранение тональности в сетлисте</strong> — если вы меняете тональность песни для конкретного служения, она сохраняется именно в этом сетлисте.</li>
    <li><strong>Общая продолжительность служения</strong> — автоматически рассчитывается и отображается общая продолжительность всего сетлиста в минутах.</li>
    <li><strong>Приглашения в сетлист через чат</strong> — вы можете отправить сетлист товарищам по команде прямо в чат в виде интерактивной карточки, откуда они могут к нему присоединиться.</li>
    <li><strong>2 режима просмотра (Grid / List)</strong> — список сетлистов можно просматривать как в виде больших визуальных карточек (2 столбца), так и в виде компактного списка.</li>
    <li><strong>Индикатор офлайн-доступности</strong> — теперь четко видно, какие сетлисты уже сохранены в памяти устройства для использования без интернета.</li>
</ul>

<p><strong>⭐ 2. Сохраненные песни (Favorites)</strong></p>
<ul>
    <li><strong>Собственный порядок песен (Custom Reorder)</strong> — добавлена функция «Изменить порядок» (кнопки ▲ и ▼), позволяющая расставить песни в желаемой последовательности.</li>
    <li><strong>Быстрое добавление в сетлист</strong> — песню из сохраненного списка можно в одно касание добавить в существующий сетлист или создать новый на месте.</li>
    <li><strong>Случайный выбор песни (Random picker)</strong> — кнопка для быстрого открытия случайной песни из сохраненных.</li>
    <li><strong>Мгновенное открытие</strong> — страница сохраненных песен открывается мгновенно благодаря умному кэшированию.</li>
</ul>

<p><strong>🎵 3. Каталог песен и тексты (Songs)</strong></p>
<ul>
    <li><strong>Раздел песенника улучшен и переработан</strong>, добавлены новые функции, делающие его более удобным в использовании.</li>
    <li><strong>Добавлены новые фильтры</strong> — работа фильтров исправлена и теперь отображает абсолютно точные результаты.</li>
    <li><strong>Очистка интерфейса</strong> — с карточек песен убраны лишние повторяющиеся значки, что обеспечило более чистый и понятный вид.</li>
    <li><strong>Быстрые фильтры</strong> по категориям, тональностям и в алфавитном порядке.</li>
</ul>

<p><strong>🔔 4. Уведомления и Обновления (Push & Updates)</strong></p>
<ul>
    <li><strong>Мгновенные Push-уведомления</strong> — обновлена система доставки уведомлений: push доставляются на все устройства (iOS, Android, Windows, Mac) менее чем за 1 секунду.</li>
    <li><strong>Полная поддержка iOS Safari и Android</strong> — уведомления теперь приходят в полностью зашифрованном виде с текстом и значком прямо на экран блокировки (Lock screen).</li>
    <li><strong>Обновления в реальном времени</strong> — если выходит новая версия, окно обновления мгновенно появляется у пользователей, у которых открыто приложение или сайт, без необходимости обновлять страницу вручную.</li>
</ul>

<p><strong>📞 5. Звонки и Чат (Calls & Chat)</strong></p>
<ul>
    <li><strong>Уведомления о звонках в закрытом приложении</strong> — push-уведомления о голосовых/видеозвонках теперь надежно приходят даже тогда, когда приложение закрыто.</li>
    <li><strong>Надежность приема звонков</strong> — увеличено время ожидания звонка (до 65 сек) и исключены ошибки дублирующихся подключений.</li>
</ul>

<p><strong>⚡ 6. Производительность и Система</strong></p>
<ul>
    <li><strong>Стабильность админ-панели</strong> — решена ошибка проверки безопасности (CSRF), возникавшая при отправке обновлений.</li>
    <li><strong>Обновление офлайн-кэша</strong> — обновен Service Worker (<code>v424</code>), обеспечивающий более быструю загрузку в офлайн-режиме и автоматическую фильтрацию отключений сети.</li>
</ul>
HTML;

$sql = "UPDATE news_articles SET 
    content_hy = ?,
    content_en = ?,
    content_ru = ?,
    updated_at = NOW()
WHERE slug = ?";

$stmt = $conn->prepare($sql);
$stmt->bind_param("ssss", $content_hy, $content_en, $content_ru, $slug);

if ($stmt->execute()) {
    echo "News article updated successfully!\n";
} else {
    echo "Error updating news article: " . $stmt->error . "\n";
}
$stmt->close();
