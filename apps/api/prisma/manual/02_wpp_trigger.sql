-- Pre-compute spatial join: wpp_zone_id diisi saat INSERT posisi (OPTIMIZATIONS.md §1.6).
-- Alert engine lalu cukup pakai B-tree, bukan ST_Contains runtime.
-- Posisi di luar semua WPP → wpp_zone_id NULL (insert TIDAK boleh gagal).

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
