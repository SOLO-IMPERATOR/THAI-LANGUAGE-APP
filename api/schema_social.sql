-- Social features for Thai Spoken PWA (friends, rooms, DMs, voice signaling)
SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS friend_requests (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  from_user_id VARCHAR(64) NOT NULL,
  to_user_id VARCHAR(64) NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'pending',
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  UNIQUE KEY uq_friend_pair (from_user_id, to_user_id),
  KEY idx_friend_to (to_user_id, status),
  KEY idx_friend_from (from_user_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS direct_messages (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  sender_id VARCHAR(64) NOT NULL,
  receiver_id VARCHAR(64) NOT NULL,
  body TEXT NOT NULL,
  created_at BIGINT NOT NULL,
  KEY idx_dm_pair (sender_id, receiver_id, created_at),
  KEY idx_dm_receiver (receiver_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS rooms (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  creator_id VARCHAR(64) NOT NULL,
  creator_name VARCHAR(255) NOT NULL DEFAULT '',
  is_public TINYINT(1) NOT NULL DEFAULT 1,
  require_approval TINYINT(1) NOT NULL DEFAULT 0,
  created_at BIGINT NOT NULL,
  KEY idx_rooms_public (is_public, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS room_members (
  room_id VARCHAR(64) NOT NULL,
  user_id VARCHAR(64) NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'member',
  joined_at BIGINT NOT NULL,
  PRIMARY KEY (room_id, user_id),
  KEY idx_member_user (user_id, status),
  CONSTRAINT fk_rm_room FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS room_messages (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  room_id VARCHAR(64) NOT NULL,
  sender_id VARCHAR(64) NOT NULL,
  sender_name VARCHAR(255) NOT NULL DEFAULT '',
  body TEXT NOT NULL,
  thai_phrase TEXT NULL,
  created_at BIGINT NOT NULL,
  KEY idx_room_msg (room_id, created_at),
  CONSTRAINT fk_msg_room FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS voice_presence (
  room_id VARCHAR(64) NOT NULL,
  user_id VARCHAR(64) NOT NULL,
  display_name VARCHAR(255) NOT NULL DEFAULT '',
  last_seen BIGINT NOT NULL,
  PRIMARY KEY (room_id, user_id),
  KEY idx_voice_seen (room_id, last_seen)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS voice_signals (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  room_id VARCHAR(64) NOT NULL,
  from_user_id VARCHAR(64) NOT NULL,
  to_user_id VARCHAR(64) NULL,
  signal_type VARCHAR(32) NOT NULL,
  payload MEDIUMTEXT NOT NULL,
  created_at BIGINT NOT NULL,
  KEY idx_voice_poll (room_id, id),
  KEY idx_voice_to (room_id, to_user_id, id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
