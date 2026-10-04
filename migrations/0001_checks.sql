-- Own uptime checks (src/lib/checks.ts). Raw rows live 2 days, daily rollups 90 days.
CREATE TABLE check_result (
  service TEXT NOT NULL,
  checked_at INTEGER NOT NULL,
  ok INTEGER NOT NULL,
  status_code INTEGER,
  latency_ms INTEGER NOT NULL,
  error TEXT,
  PRIMARY KEY (service, checked_at)
);

CREATE TABLE daily_rollup (
  service TEXT NOT NULL,
  day TEXT NOT NULL,
  checks INTEGER NOT NULL,
  ok_checks INTEGER NOT NULL,
  PRIMARY KEY (service, day)
);

CREATE TABLE service_state (
  service TEXT PRIMARY KEY,
  state TEXT NOT NULL CHECK (state IN ('up', 'down')),
  fail_streak INTEGER NOT NULL,
  since INTEGER NOT NULL
);

CREATE TABLE incident (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  service TEXT NOT NULL,
  started_at INTEGER NOT NULL,
  resolved_at INTEGER
);

CREATE INDEX incident_open ON incident (service) WHERE resolved_at IS NULL;
