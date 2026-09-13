<?php
require_once 'runtime_config.php';
$conn = wp_runtime_open_mysqli();

$slug = 'update-5-2-5-features';
$status = 'published';
$is_featured = 1;
$image_url = '/uploads/news/worship_update_525_hy.jpg';

$title_hy = 'Թարմացում 5.2.5. Նոր հնարավորություններ';
$title_en = 'Update 5.2.5: New Features';
$title_ru = 'Обновление 5.2.5: Новые функции';

$excerpt_hy = 'Նորարարական Սեթլիստեր 2.0 (Drag & Drop), երգերի ավելի հարմարավետ վերադասավորում, էկրանի չմարելու ռեժիմ և ակնթարթային Push ծանուցումներ:';
$excerpt_en = 'Innovative Setlists 2.0 (Drag & Drop), more comfortable song reordering, keep-awake screen mode, and instant Push notifications.';
$excerpt_ru = 'Инновационные Сетлисты 2.0 (Drag & Drop), более удобное изменение порядка песен, режим не гаснущего экрана и мгновенные Push-уведомления.';

$tag_hy = 'ԹԱՐՄԱՑՈՒՄ';
$tag_en = 'UPDATE';
$tag_ru = 'ОБНОВЛЕНИЕ';

$content_hy = <<<HTML
<p>Ուրախ ենք տեղեկացնել <strong>Worship Platform 5.2.5</strong> տարբերակի մասին, որն արդեն հասանելի է բոլոր սարքերում (iOS, Android, Web): Այս թարմացումը կենտրոնացած է ձեր ամենօրյա աշխատանքի հարմարավետության բարձրացման վրա։</p>
<h3>Ի՞նչ նոր բան կա</h3>
<ul>
  <li><strong>Սեթլիստեր 2.0 (Drag & Drop).</strong> Երգերի հերթականությունը սեթլիստում այժմ կարելի է արագ փոխել՝ պարզապես մատով քաշելով (drag-and-drop):</li>
  <li><strong>Էկրանի չմարելու ռեժիմ (Wake Lock).</strong> Ծառայության կամ փորձի ընթացքում էկրանն այլևս ավտոմատ չի մթնի:</li>
  <li><strong>Ակնթարթային ծանուցումներ.</strong> Push ծանուցումների նոր զուգահեռացված համակարգ, որն ապահովում է ակնթարթային և հուսալի առաքում:</li>
  <li>Ադմինիստրատիվ պանելի արագության նկատելի բարելավում և bug-երի ուղղում:</li>
</ul>
<p>Շարունակեք փառաբանել Աստծուն, իսկ տեխնիկական դժվարությունները թողեք մեզ։</p>
HTML;

$content_en = <<<HTML
<p>We are excited to announce <strong>Worship Platform 5.2.5</strong>, now available on all devices (iOS, Android, Web). This update is focused on making your daily routine more comfortable.</p>
<h3>What's New</h3>
<ul>
  <li><strong>Setlists 2.0 (Drag & Drop):</strong> Reordering songs in a setlist is now as easy as touch and drag.</li>
  <li><strong>Keep-Awake Screen Mode (Wake Lock):</strong> The screen will no longer dim automatically during a service or rehearsal.</li>
  <li><strong>Instant Push Notifications:</strong> A new parallelized push notification system ensures instant and reliable delivery.</li>
  <li>Noticeable speed improvements in the admin panel and bug fixes.</li>
</ul>
<p>Keep worshiping God, and leave the technical difficulties to us.</p>
HTML;

$content_ru = <<<HTML
<p>Мы рады сообщить о выпуске <strong>Worship Platform 5.2.5</strong>, которое уже доступно на всех устройствах (iOS, Android, Web). Это обновление направлено на повышение удобства вашей повседневной работы.</p>
<h3>Что нового</h3>
<ul>
  <li><strong>Сетлисты 2.0 (Drag & Drop):</strong> Изменить порядок песен в сетлисте теперь можно легко, просто перетащив их (drag-and-drop).</li>
  <li><strong>Режим не гаснущего экрана (Wake Lock):</strong> Экран больше не будет автоматически гаснуть во время служения или репетиции.</li>
  <li><strong>Мгновенные Push-уведомления:</strong> Новая параллельная система push-уведомлений обеспечивает мгновенную и надежную доставку.</li>
  <li>Заметные улучшения скорости работы панели администратора и исправления ошибок.</li>
</ul>
<p>Продолжайте прославлять Бога, а технические трудности оставьте нам.</p>
HTML;

// Check if already exists
$stmt = $conn->prepare("SELECT id FROM news_articles WHERE slug = ?");
$stmt->bind_param("s", $slug);
$stmt->execute();
$res = $stmt->get_result();
if ($res->num_rows > 0) {
    echo "News article already exists!\n";
    exit;
}
$stmt->close();

$sql = "INSERT INTO news_articles (
    slug, status, is_featured, image_url, published_at, 
    title_hy, title_en, title_ru, 
    excerpt_hy, excerpt_en, excerpt_ru, 
    content_hy, content_en, content_ru, 
    tag_hy, tag_en, tag_ru, 
    created_at, updated_at
) VALUES (
    ?, ?, ?, ?, NOW(),
    ?, ?, ?,
    ?, ?, ?,
    ?, ?, ?,
    ?, ?, ?,
    NOW(), NOW()
)";

$stmt = $conn->prepare($sql);
$stmt->bind_param(
    "ssisssssssssssss",
    $slug, $status, $is_featured, $image_url,
    $title_hy, $title_en, $title_ru,
    $excerpt_hy, $excerpt_en, $excerpt_ru,
    $content_hy, $content_en, $content_ru,
    $tag_hy, $tag_en, $tag_ru
);

if ($stmt->execute()) {
    echo "News article inserted successfully!\n";
} else {
    echo "Error inserting news article: " . $stmt->error . "\n";
}
$stmt->close();
