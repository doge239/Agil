BEGIN;
ALTER TABLE periodo_academico ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
CREATE INDEX auditoria_accion_fecha_idx ON auditoria_academica(accion,fecha DESC);
INSERT INTO schema_migration(version) VALUES ('006_admin_general');
COMMIT;
