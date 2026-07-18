CREATE TABLE coach_rate_limits (
  identity TEXT NOT NULL,
  window_start INTEGER NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (identity, window_start)
);

CREATE INDEX coach_rate_limits_updated_idx
ON coach_rate_limits (updated_at);
