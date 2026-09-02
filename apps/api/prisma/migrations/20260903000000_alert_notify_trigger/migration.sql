-- Feed realtime tanpa Supabase Realtime: INSERT Alert → pg_notify,
-- dikonsumsi SSE /api/v1/alerts/stream (lib/alert-notify.ts).
-- Payload sengaja memakai nama kolom snake_case supaya kontrak ke client
-- identik dengan payload postgres_changes yang lama.
CREATE OR REPLACE FUNCTION notify_alert_insert() RETURNS trigger AS $$
BEGIN
  PERFORM pg_notify(
    'alert_insert',
    json_build_object(
      'id', NEW.id,
      'lat', NEW.lat,
      'lng', NEW.lng,
      'severity', NEW.severity,
      'rule_type', NEW.rule_type,
      'assigned_agency_id', NEW.assigned_agency_id
    )::text
  );
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS alert_notify_insert ON "Alert";

CREATE TRIGGER alert_notify_insert
AFTER INSERT ON "Alert"
FOR EACH ROW EXECUTE FUNCTION notify_alert_insert();
