CREATE TABLE IF NOT EXISTS setlist_user_access (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  setlist_id INT UNSIGNED NOT NULL,
  owner_user_id INT UNSIGNED NOT NULL,
  grantee_user_id INT UNSIGNED NOT NULL,
  grantee_email VARCHAR(190) NULL,
  expires_at DATETIME NOT NULL,
  revoked_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_setlist_grantee (setlist_id, grantee_user_id),
  KEY idx_grantee_active (grantee_user_id, revoked_at, expires_at),
  KEY idx_owner (owner_user_id),
  KEY idx_setlist (setlist_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
