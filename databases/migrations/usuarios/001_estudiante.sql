BEGIN;
CREATE TABLE IF NOT EXISTS schema_migration (version TEXT PRIMARY KEY, aplicada TIMESTAMPTZ NOT NULL DEFAULT now());
ALTER TABLE estudiante ADD COLUMN id_plan INTEGER;
-- Asociación explícita del único perfil de demostración; no inferir planes de usuarios reales.
UPDATE estudiante SET id_plan = 1 WHERE numero_matricula = '20260001' AND id_carrera = 1;
INSERT INTO schema_migration(version) VALUES ('001_estudiante');
COMMIT;
