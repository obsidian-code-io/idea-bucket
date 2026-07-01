CREATE TABLE IF NOT EXISTS users (
  id          TEXT PRIMARY KEY,        -- unique user id (nanoid), assigned on first visit
  username    TEXT NOT NULL,
  email       TEXT NOT NULL,
  phone       TEXT NOT NULL,
  created_at  INTEGER NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email);

CREATE TABLE IF NOT EXISTS ideas (
  id            TEXT PRIMARY KEY,        -- internal nanoid
  public_id     TEXT NOT NULL UNIQUE,    -- short shareable id (10 chars)
  title         TEXT NOT NULL,
  description   TEXT,
  status        TEXT NOT NULL DEFAULT 'backlog',
  creator_id    TEXT,
  creator_name  TEXT NOT NULL,
  created_at    INTEGER NOT NULL,
  updated_at    INTEGER NOT NULL,
  FOREIGN KEY (creator_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS attachments (
  id            TEXT PRIMARY KEY,
  idea_id       TEXT NOT NULL,
  kind          TEXT NOT NULL,           -- 'file' | 'voice'
  original_name TEXT NOT NULL,
  stored_name   TEXT NOT NULL,           -- uuid filename on disk
  mime_type     TEXT NOT NULL,
  size_bytes    INTEGER NOT NULL,
  created_at    INTEGER NOT NULL,
  FOREIGN KEY (idea_id) REFERENCES ideas(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_ideas_status      ON ideas(status);
CREATE INDEX IF NOT EXISTS idx_ideas_public_id   ON ideas(public_id);
CREATE INDEX IF NOT EXISTS idx_attachments_idea  ON attachments(idea_id);
