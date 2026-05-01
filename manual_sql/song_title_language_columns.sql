-- Worship Platform
-- Manual SQL migration for separate song title language columns
-- Run this in phpMyAdmin or MySQL/MariaDB console

ALTER TABLE `songs`
  ADD COLUMN `title_hy` VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL AFTER `title`,
  ADD COLUMN `title_lat` VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL AFTER `title_hy`,
  ADD COLUMN `title_en` VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL AFTER `title_lat`,
  ADD COLUMN `title_ru` VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL AFTER `title_en`,
  ADD COLUMN `bpm` SMALLINT UNSIGNED NULL AFTER `song_key`;

-- If the columns already exist but were created with the wrong encoding,
-- run this repair block instead (or after the ADD block if needed):
ALTER TABLE `songs`
  MODIFY COLUMN `title_hy` VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  MODIFY COLUMN `title_lat` VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  MODIFY COLUMN `title_en` VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  MODIFY COLUMN `title_ru` VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  MODIFY COLUMN `bpm` SMALLINT UNSIGNED NULL;

-- Safe initial backfill:
-- keep the old combined title in `title`
-- and copy it into Armenian title where that field is still empty
UPDATE `songs`
SET `title_hy` = TRIM(`title`)
WHERE (`title_hy` IS NULL OR TRIM(`title_hy`) = '')
  AND `title` IS NOT NULL
  AND TRIM(`title`) <> '';
