-- Semua index performa — dipasang MALAM PERTAMA, bukan belakangan.
-- Spesifikasi: Feature Plans/01-foundation-infra.md P3.2.1 / OPTIMIZATIONS.md §1.

-- GIST spatial
CREATE INDEX idx_vessel_positions_geom ON "VesselPosition" USING GIST (position_geom);
CREATE INDEX idx_wpp_geom ON "WppZone" USING GIST (geom);
CREATE INDEX idx_mpa_geom ON "MarineProtectedArea" USING GIST (geom);
CREATE INDEX idx_vessel_events_geom ON "VesselEvent" USING GIST (event_geom);

-- B-tree hot path
CREATE INDEX idx_vessel_positions_vessel_time ON "VesselPosition" (vessel_id, "timestamp" DESC);
CREATE INDEX idx_vessel_positions_wpp ON "VesselPosition" (wpp_zone_id, "timestamp" DESC);
CREATE INDEX idx_vessel_events_vessel ON "VesselEvent" (vessel_id, start_at DESC);
CREATE INDEX idx_alerts_agency_status ON "Alert" (assigned_agency_id, status, created_at DESC);

-- BRIN time-series (kecil, cocok untuk tabel posisi yang tumbuh terus)
CREATE INDEX idx_vessel_positions_brin ON "VesselPosition" USING BRIN ("timestamp");

-- Partial hot path: 99% query alert engine hanya alert open
CREATE INDEX idx_alerts_open ON "Alert" (created_at DESC)
WHERE status IN ('new', 'dispatched', 'in_progress');

-- HNSW pgvector untuk RAG
CREATE INDEX idx_pasal_embedding ON "PasalCitation"
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);
