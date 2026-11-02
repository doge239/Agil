BEGIN;
ALTER TABLE curso ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE restriccion ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE restriccion ADD COLUMN creada_por INTEGER;
ALTER TABLE restriccion ADD COLUMN motivo_levantamiento TEXT;
ALTER TABLE curso_docente ADD COLUMN activa BOOLEAN NOT NULL DEFAULT TRUE;
CREATE INDEX restriccion_unidad_idx ON restriccion(id_unidad,id_estudiante);
INSERT INTO schema_migration(version) VALUES ('004_admin_unidad');
COMMIT;
