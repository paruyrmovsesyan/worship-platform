<?php
declare(strict_types=1);

require_once __DIR__ . '/runtime_config.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

const SERVICE_PLANS_FILE = __DIR__ . '/data/service_plans.json';

function sp_json_response(array $data, int $status = 200): void {
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function sp_load_plans(): array {
    if (!is_file(SERVICE_PLANS_FILE)) {
        return [];
    }
    $raw = @file_get_contents(SERVICE_PLANS_FILE);
    if (!$raw) return [];
    $data = @json_decode($raw, true);
    return is_array($data) ? $data : [];
}

function sp_save_plans(array $plans): bool {
    $dir = dirname(SERVICE_PLANS_FILE);
    if (!is_dir($dir)) {
        @mkdir($dir, 0775, true);
    }
    return (bool)@file_put_contents(
        SERVICE_PLANS_FILE,
        json_encode($plans, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE),
        LOCK_EX
    );
}

$action = trim((string)($_GET['action'] ?? $_POST['action'] ?? ''));

// =========================================================================
// ACTION: get_plans (List all service plans)
// =========================================================================
if ($action === 'get_plans') {
    $plans = sp_load_plans();
    // Sort by service date desc
    usort($plans, function($a, $b) {
        return strcmp($b['date'] ?? '', $a['date'] ?? '');
    });
    sp_json_response(['ok' => true, 'plans' => $plans]);
}

// =========================================================================
// ACTION: get_plan (Single plan)
// =========================================================================
if ($action === 'get_plan') {
    $id = trim((string)($_GET['id'] ?? ''));
    $plans = sp_load_plans();
    $plan = null;
    foreach ($plans as $p) {
        if ($p['id'] === $id) {
            $plan = $p;
            break;
        }
    }
    if (!$plan) {
        sp_json_response(['ok' => false, 'error' => 'Service plan not found'], 404);
    }
    sp_json_response(['ok' => true, 'plan' => $plan]);
}

// =========================================================================
// ACTION: save_plan
// =========================================================================
if ($action === 'save_plan') {
    $rawInput = file_get_contents('php://input');
    $payload = @json_decode($rawInput, true) ?: $_POST;

    $id = trim((string)($payload['id'] ?? ''));
    if ($id === '') {
        $id = 'sp-' . time() . '-' . rand(100, 999);
    }

    $plans = sp_load_plans();
    $found = false;

    $planData = [
        'id' => $id,
        'title' => trim((string)($payload['title'] ?? 'Sunday Service')),
        'date' => trim((string)($payload['date'] ?? date('Y-m-d'))),
        'start_time' => trim((string)($payload['start_time'] ?? '11:00')),
        'notes' => trim((string)($payload['notes'] ?? '')),
        'timeline' => is_array($payload['timeline'] ?? null) ? $payload['timeline'] : [],
        'roster' => is_array($payload['roster'] ?? null) ? $payload['roster'] : [],
        'updated_at' => time(),
    ];

    foreach ($plans as $idx => $p) {
        if ($p['id'] === $id) {
            $plans[$idx] = $planData;
            $found = true;
            break;
        }
    }

    if (!$found) {
        $planData['created_at'] = time();
        $plans[] = $planData;
    }

    sp_save_plans($plans);
    sp_json_response(['ok' => true, 'plan' => $planData]);
}

// =========================================================================
// ACTION: update_roster_status
// =========================================================================
if ($action === 'update_roster_status') {
    $rawInput = file_get_contents('php://input');
    $payload = @json_decode($rawInput, true) ?: $_POST;

    $planId = trim((string)($payload['plan_id'] ?? ''));
    $roleId = trim((string)($payload['role_id'] ?? ''));
    $newStatus = trim((string)($payload['status'] ?? 'accepted')); // 'accepted' | 'declined' | 'pending'

    $plans = sp_load_plans();
    $updated = false;

    foreach ($plans as &$p) {
        if ($p['id'] === $planId) {
            if (isset($p['roster']) && is_array($p['roster'])) {
                foreach ($p['roster'] as &$r) {
                    if (($r['id'] ?? '') === $roleId) {
                        $r['status'] = $newStatus;
                        $updated = true;
                        break;
                    }
                }
            }
            break;
        }
    }

    if ($updated) {
        sp_save_plans($plans);
        sp_json_response(['ok' => true, 'status' => $newStatus]);
    }

    sp_json_response(['ok' => false, 'error' => 'Plan or role not found'], 404);
}

// =========================================================================
// ACTION: delete_plan
// =========================================================================
if ($action === 'delete_plan') {
    $rawInput = file_get_contents('php://input');
    $payload = @json_decode($rawInput, true) ?: $_POST;
    $id = trim((string)($payload['id'] ?? $_GET['id'] ?? ''));

    $plans = sp_load_plans();
    $newPlans = array_values(array_filter($plans, fn($p) => $p['id'] !== $id));
    sp_save_plans($newPlans);

    sp_json_response(['ok' => true, 'deleted' => $id]);
}

sp_json_response(['ok' => false, 'error' => 'Invalid action'], 400);
