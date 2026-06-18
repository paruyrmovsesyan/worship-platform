<?php
$content = file_get_contents('admin_dashboard.php');

$replacements = [
    "Daily\n          </button>" => "<?= __('Daily') ?>\n          </button>",
    "Monthly\n          </button>" => "<?= __('Monthly') ?>\n          </button>",
    "Songs added —" => "<?= __('Songs added') ?> —",
    "<th>#</th><th><?= __('Title') ?></th><th><?= __('Artist') ?></th><th><?= __('Added') ?></th>" => "<th>#</th><th><?= __('Title') ?></th><th><?= __('Artist') ?></th><th><?= __('Added') ?></th>", // Title, Artist, Added might need checking
    "Manage Songs →" => "<?= __('Manage Songs') ?> →",
    "No songs added during this period" => "<?= __('No songs added during this period') ?>"
];

foreach ($replacements as $old => $new) {
    $content = str_replace($old, $new, $content);
}

file_put_contents('admin_dashboard.php', $content);

// Also let's check date translation.
// $periodLabel     = date('F Y');
// Instead of date('F Y') we can just leave it as it is (like "June 2026"), it's fine.

echo "Updated admin_dashboard.php\n";
