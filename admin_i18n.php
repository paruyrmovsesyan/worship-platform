<?php
declare(strict_types=1);

global $adminLang, $admin_hardcoded_i18n;

// Ensure $adminLang is set before calling translation functions
if (!isset($adminLang)) {
    $adminLang = $_COOKIE['admin_lang'] ?? 'hy';
}

$admin_hardcoded_i18n = [
    'ru' => [
        // Sidebar & Common
        'Dashboard' => 'Панель',
        'Songs' => 'Песни',
        'Clients' => 'Клиенты',
        'Statistics' => 'Статистика',
        'Settings' => 'Настройки',
        'FAQ' => 'Вопросы',
        'Log Out' => 'Выйти',
        'Menu' => 'Меню',
        'Upgrade your plan' => 'Улучшить план',
        'Go to pro to access all features' => 'Перейдите на PRO для всех функций',
        'Upgrade' => 'Улучшить',
        
        // Topbar
        'Search...' => 'Поиск...',
        'Notifications' => 'Уведомления',
        'Mark all read' => 'Прочитать все',
        'No notifications yet' => 'Нет уведомлений',
        'View all activity →' => 'Смотреть всю активность →',
        
        // Dashboard
        'Overview of your Worship platform' => 'Обзор вашей платформы Worship',
        'Today' => 'Сегодня',
        'New Songs' => 'Новые песни',
        'New Users' => 'Новые пользователи',
        'vs previous' => 'по сравнению с прошлым',
        'System Status' => 'Статус системы',
        'Database' => 'База данных',
        'PHP Version' => 'Версия PHP',
        'App Version' => 'Версия приложения',
        'Disk Free' => 'Свободно на диске',
        'Memory Used' => 'Исп. память',
        'Quick Actions' => 'Быстрые действия',
        'Manage Songs' => 'Управление песнями',
        'View Clients' => 'Смотреть клиентов',
        'System Settings' => 'Настройки системы',
        'View Statistics' => 'Смотреть статистику',
        'Online' => 'В сети',
        'Offline' => 'Не в сети',
        'Daily' => 'За день',
        'Monthly' => 'За месяц',
        
        // Clients
        'Manage your platform users and their access levels' => 'Управляйте пользователями и их доступом',
        'Refresh' => 'Обновить',
        'ID' => 'ID',
        'NAME' => 'ИМЯ',
        'EMAIL' => 'EMAIL',
        'ROLE' => 'РОЛЬ',
        'STATUS' => 'СТАТУС',
        'CREATED' => 'СОЗДАН',
        'ACTIONS' => 'ДЕЙСТВИЯ',
        'No users found.' => 'Пользователи не найдены.',
        'View' => 'Смотреть',
        'Edit' => 'Изменить',
        
        // Songs (from existing)
        'Երգերի ցանկ' => 'Список песен', 'Կարգավորումներ' => 'Настройки', 'Դուրս գալ' => 'Выйти',
        'Ադմին' => 'Админ', 'Կարգավորումներ և համակարգ' => 'Настройки и система',
        'Կառավարեք ծրագրի տարբերակները, սարքերը, մուտքերը և այլն։' => 'Управляйте версиями, устройствами, доступами и т.д.',
        'Թարմացումներ' => 'Обновления', 'Սպասարկում' => 'Обслуживание', 'Սարքեր' => 'Устройства',
        'Պատմություն' => 'История', 'Մուտքեր' => 'Доступы', 'Մոդերացիա' => 'Модерация', 'Թարգմանություն' => 'Переводы',
        'Թարմացնել' => 'Обновить', 'Բոլորը PDF' => 'Все в PDF', 'Ավելացնել երգ' => 'Добавить песню',
        'ԱՆՎԱՆՈՒՄ' => 'НАЗВАНИЕ', 'ԿԱՏԱՐՈՂ' => 'ИСПОЛНИТЕЛЬ', 'ՏՈՆԱՅՆՈՒԹՅՈՒՆ' => 'ТОНАЛЬНОСТЬ',
        'ՏԵՄՊ (BPM)' => 'ТЕМП (BPM)', 'ԿԱՐԳԱՎԻՃԱԿ' => 'СТАТУС', 'ԳՈՐԾՈՂՈՒԹՅՈՒՆՆԵՐ' => 'ДЕЙСТВИЯ',
        'Բեռնել մնացածը' => 'Загрузить еще', 'Ավելացնել / Խմբագրել երգ' => 'Добавить / Изменить',
        'Մաքրել' => 'Очистить', 'Չեղարկել' => 'Отменить', 'Անվանում' => 'Название', 'Կատարող' => 'Исполнитель',
        'Տոնայնություն' => 'Тональность', 'Տեգեր' => 'Теги', 'Ակորդներ' => 'Аккорды', 'Բառեր' => 'Текст',
        'Նախադիտում և Տրանսպոզիցիա' => 'Предпросмотр и Транспозиция', 'Օգտագործել բեմոլներ (b)' => 'Использовать бемоли (b)',
        'Խմբագրումը չեղարկված է' => 'Редактирование отменено', 'ընդհանուր' => 'всего', 'բառերով' => 'с текстом',
        'երգ' => 'пес.', 'Անանուն' => 'Без названия', 'Կատարող նշված չէ' => 'Неизвестный', 'Երգը պահպանված է ✅' => 'Сохранено ✅',
        
        // Stats
        'Platform metrics and usage activity' => 'Метрики платформы и активность',
        'All Time' => 'За все время',
        'Total Songs' => 'Всего песен',
        'Total Users' => 'Всего пользователей',
        'Total Views' => 'Всего просмотров',
        'Growth Chart' => 'График роста',
        
        // FAQ
        'Frequently Asked Questions and Guide' => 'Часто задаваемые вопросы и руководство',
        'Search FAQ...' => 'Поиск вопросов...',
        'Expand All' => 'Развернуть все',
        'Collapse All' => 'Свернуть все',
        
        // Dynamic matches
        'Admin' => 'Админ',
        'Superadmin' => 'Суперадмин',
        'User' => 'Пользователь',
    ],
    'en' => [
        // Sidebar & Common
        'Dashboard' => 'Dashboard',
        'Songs' => 'Songs',
        'Clients' => 'Clients',
        'Statistics' => 'Statistics',
        'Settings' => 'Settings',
        'FAQ' => 'FAQ',
        'Log Out' => 'Log Out',
        'Menu' => 'Menu',
        'Upgrade your plan' => 'Upgrade your plan',
        'Go to pro to access all features' => 'Go to pro to access all features',
        'Upgrade' => 'Upgrade',
        
        // Topbar
        'Search...' => 'Search...',
        'Notifications' => 'Notifications',
        'Mark all read' => 'Mark all read',
        'No notifications yet' => 'No notifications yet',
        'View all activity →' => 'View all activity →',
        
        // Dashboard
        'Overview of your Worship platform' => 'Overview of your Worship platform',
        'Today' => 'Today',
        'New Songs' => 'New Songs',
        'New Users' => 'New Users',
        'vs previous' => 'vs previous',
        'System Status' => 'System Status',
        'Database' => 'Database',
        'PHP Version' => 'PHP Version',
        'App Version' => 'App Version',
        'Disk Free' => 'Disk Free',
        'Memory Used' => 'Memory Used',
        'Quick Actions' => 'Quick Actions',
        'Manage Songs' => 'Manage Songs',
        'View Clients' => 'View Clients',
        'System Settings' => 'System Settings',
        'View Statistics' => 'View Statistics',
        'Online' => 'Online',
        'Offline' => 'Offline',
        'Daily' => 'Daily',
        'Monthly' => 'Monthly',
        
        // Clients
        'Manage your platform users and their access levels' => 'Manage your platform users and their access levels',
        'Refresh' => 'Refresh',
        'ID' => 'ID',
        'NAME' => 'NAME',
        'EMAIL' => 'EMAIL',
        'ROLE' => 'ROLE',
        'STATUS' => 'STATUS',
        'CREATED' => 'CREATED',
        'ACTIONS' => 'ACTIONS',
        'No users found.' => 'No users found.',
        'View' => 'View',
        'Edit' => 'Edit',
        
        // Songs (from existing)
        'Երգերի ցանկ' => 'Music Library', 'Կարգավորումներ' => 'Settings', 'Դուրս գալ' => 'Log Out',
        'Ադմին' => 'Admin', 'Կարգավորումներ և համակարգ' => 'Settings & System',
        'Կառավարեք ծրագրի տարբերակները, սարքերը, մուտքերը և այլն։' => 'Manage app versions, devices, accesses, etc.',
        'Թարմացումներ' => 'Updates', 'Սպասարկում' => 'Maintenance', 'Սարքեր' => 'Devices',
        'Պատմություն' => 'History', 'Մուտքեր' => 'Access', 'Մոդերացիա' => 'Moderation', 'Թարգմանություն' => 'Translations',
        'Թարմացնել' => 'Refresh', 'Բոլորը PDF' => 'Export All PDF', 'Ավելացնել երգ' => 'Add Song',
        'ԱՆՎԱՆՈՒՄ' => 'TITLE', 'ԿԱՏԱՐՈՂ' => 'ARTIST', 'ՏՈՆԱՅՆՈՒԹՅՈՒՆ' => 'KEY',
        'ՏԵՄՊ (BPM)' => 'TEMPO (BPM)', 'ԿԱՐԳԱՎԻՃԱԿ' => 'STATUS', 'ԳՈՐԾՈՂՈՒԹՅՈՒՆՆԵՐ' => 'ACTIONS',
        'Բեռնել մնացածը' => 'Load More', 'Ավելացնել / Խմբագրել երգ' => 'Add / Edit Song',
        'Մաքրել' => 'Clear', 'Չեղարկել' => 'Cancel', 'Անվանում' => 'Title', 'Կատարող' => 'Artist',
        'Տոնայնություն' => 'Key', 'Տեգեր' => 'Tags', 'Ակորդներ' => 'Chords', 'Բառեր' => 'Lyrics',
        'Նախադիտում և Տրանսպոզիցիա' => 'Preview & Transpose', 'Օգտագործել բեմոլներ (b)' => 'Use flats (b)',
        'Խմբագրումը չեղարկված է' => 'Edit Canceled', 'ընդհանուր' => 'total', 'բառերով' => 'with lyrics',
        'երգ' => 'songs', 'Անանուն' => 'Untitled', 'Կատարող նշված չէ' => 'Unknown Artist', 'Երգը պահպանված է ✅' => 'Saved ✅',
        
        // Stats
        'Platform metrics and usage activity' => 'Platform metrics and usage activity',
        'All Time' => 'All Time',
        'Total Songs' => 'Total Songs',
        'Total Users' => 'Total Users',
        'Total Views' => 'Total Views',
        'Growth Chart' => 'Growth Chart',
        
        // FAQ
        'Frequently Asked Questions and Guide' => 'Frequently Asked Questions and Guide',
        'Search FAQ...' => 'Search FAQ...',
        'Expand All' => 'Expand All',
        'Collapse All' => 'Collapse All',
        
        // Dynamic matches
        'Admin' => 'Admin',
        'Superadmin' => 'Superadmin',
        'User' => 'User',
    ]
];

if (!function_exists('__')) {
    function __($text, $context = 'ui') {
        global $adminLang, $admin_hardcoded_i18n;
        if ($adminLang === 'hy' || trim($text) === '') return $text;
        
        if (function_exists('wp_translation_cache_get')) {
            $cached = wp_translation_cache_get($adminLang, $context, $text);
            if ($cached) return $cached;
        }
        
        return $admin_hardcoded_i18n[$adminLang][$text] ?? $text;
    }
}
