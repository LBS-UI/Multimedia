CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  name TEXT,
  date TEXT,
  description TEXT,
  image TEXT,
  location TEXT,
  poster_color TEXT
);

CREATE TABLE IF NOT EXISTS announcements (
  id TEXT PRIMARY KEY,
  title TEXT,
  content TEXT,
  image TEXT,
  category TEXT,
  date TEXT,
  posted_at TEXT,
  pinned INTEGER DEFAULT 0,
  author TEXT
);

CREATE TABLE IF NOT EXISTS member_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT,
  role TEXT,
  text TEXT,
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS push_subs (
  id TEXT PRIMARY KEY,
  endpoint TEXT,
  subscription TEXT
);

CREATE TABLE IF NOT EXISTS alerts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT,
  body TEXT,
  created_at TEXT
);
