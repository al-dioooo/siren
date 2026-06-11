-- DropIndex
DROP INDEX "idx_alerts_agency_status";

-- DropIndex
DROP INDEX "idx_mpa_geom";

-- DropIndex
DROP INDEX "idx_pasal_embedding";

-- DropIndex
DROP INDEX "idx_vessel_events_geom";

-- DropIndex
DROP INDEX "idx_vessel_events_vessel";

-- DropIndex
DROP INDEX "idx_vessel_positions_brin";

-- DropIndex
DROP INDEX "idx_vessel_positions_geom";

-- DropIndex
DROP INDEX "idx_vessel_positions_vessel_time";

-- DropIndex
DROP INDEX "idx_vessel_positions_wpp";

-- DropIndex
DROP INDEX "idx_wpp_geom";

-- CreateTable
CREATE TABLE "EngineMeta" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EngineMeta_pkey" PRIMARY KEY ("key")
);
