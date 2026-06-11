-- Pre-compute spatial join: wpp_zone_id diisi saat INSERT posisi.
-- Posisi di luar semua WPP tetap valid dan menghasilkan wpp_zone_id NULL.

CREATE OR REPLACE FUNCTION compute_wpp_on_insert() RETURNS TRIGGER AS $$
BEGIN
  SELECT id INTO NEW.wpp_zone_id
  FROM "WppZone"
  WHERE ST_Contains(geom, NEW.position_geom)
  LIMIT 1;
  RETURN NEW;
END $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_compute_wpp BEFORE INSERT ON "VesselPosition"
FOR EACH ROW EXECUTE FUNCTION compute_wpp_on_insert();
