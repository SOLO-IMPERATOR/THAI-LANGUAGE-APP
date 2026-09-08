-- Thai Spoken PWA — MySQL schema (utf8mb4)
-- Import in SpaceWeb phpMyAdmin or: mysql -u USER -p DB < api/schema.sql

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE IF NOT EXISTS phrases (
  id INT NOT NULL PRIMARY KEY,
  category VARCHAR(255) NOT NULL,
  tags JSON NOT NULL,
  russian TEXT NOT NULL,
  is_question TINYINT(1) NOT NULL DEFAULT 0,
  male_thai TEXT NOT NULL,
  male_transcription_ru TEXT NOT NULL,
  male_particle VARCHAR(64) NOT NULL DEFAULT '',
  female_thai TEXT NOT NULL,
  female_transcription_ru TEXT NOT NULL,
  female_particle VARCHAR(64) NOT NULL DEFAULT '',
  thai_hidden TEXT NOT NULL,
  transcription_ru TEXT NOT NULL,
  translation_ru TEXT NOT NULL,
  stage_srs INT NOT NULL DEFAULT 0,
  review_count INT NOT NULL DEFAULT 0,
  next_review BIGINT NOT NULL DEFAULT 0,
  is_deconstructed TINYINT(1) NOT NULL DEFAULT 0,
  words_breakdown JSON NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS words (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  thai VARCHAR(255) NOT NULL,
  transcription_ru TEXT NOT NULL,
  translation_ru TEXT NOT NULL,
  KEY idx_words_thai (thai)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  email VARCHAR(255) NOT NULL DEFAULT '',
  username VARCHAR(255) NOT NULL DEFAULT 'User',
  first_name VARCHAR(255) NOT NULL DEFAULT '',
  last_name VARCHAR(255) NOT NULL DEFAULT '',
  avatar TEXT NOT NULL,
  gender VARCHAR(32) NOT NULL DEFAULT 'male',
  city_in_thailand VARCHAR(255) NOT NULL DEFAULT 'Бангкок',
  stay_duration VARCHAR(255) NOT NULL DEFAULT 'Турист / Отпуск',
  daily_goal INT NOT NULL DEFAULT 10,
  xp INT NOT NULL DEFAULT 0,
  level INT NOT NULL DEFAULT 1,
  streak INT NOT NULL DEFAULT 1,
  registered_at VARCHAR(64) NOT NULL,
  is_private TINYINT(1) NOT NULL DEFAULT 0,
  last_active_at VARCHAR(64) NOT NULL,
  KEY idx_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_phrase_progress (
  user_id VARCHAR(64) NOT NULL,
  phrase_id INT NOT NULL,
  stage_srs INT NOT NULL DEFAULT 0,
  review_count INT NOT NULL DEFAULT 0,
  next_review BIGINT NOT NULL DEFAULT 0,
  is_deconstructed TINYINT(1) NOT NULL DEFAULT 0,
  tags JSON NOT NULL,
  updated_at VARCHAR(64) NOT NULL,
  PRIMARY KEY (user_id, phrase_id),
  KEY idx_user_progress_user (user_id),
  CONSTRAINT fk_progress_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_progress_phrase FOREIGN KEY (phrase_id) REFERENCES phrases(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_review_history (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL,
  phrase_id INT NOT NULL,
  result VARCHAR(16) NOT NULL,
  stage_before INT NOT NULL DEFAULT 0,
  stage_after INT NOT NULL DEFAULT 0,
  review_count INT NOT NULL DEFAULT 0,
  created_at VARCHAR(64) NOT NULL,
  KEY idx_user_history_user (user_id, created_at),
  CONSTRAINT fk_history_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_history_phrase FOREIGN KEY (phrase_id) REFERENCES phrases(id) ON DELETE CASCADE,
  CONSTRAINT chk_history_result CHECK (result IN ('success', 'failure'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
