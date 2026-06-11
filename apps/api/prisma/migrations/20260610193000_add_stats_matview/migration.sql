-- Materialized view untuk dashboard analytics.
-- Refresh runtime: REFRESH MATERIALIZED VIEW CONCURRENTLY alert_stats_daily;

CREATE MATERIALIZED VIEW alert_stats_daily AS
SELECT
  date_trunc('day', created_at) AS day,
  assigned_agency_id,
  rule_type,
  severity,
  COUNT(*) AS count
FROM "Alert"
WHERE created_at > NOW() - INTERVAL '90 days'
GROUP BY 1, 2, 3, 4;

-- Unique index wajib untuk REFRESH CONCURRENTLY.
CREATE UNIQUE INDEX idx_alert_stats_daily_key
ON alert_stats_daily (day, assigned_agency_id, rule_type, severity);
