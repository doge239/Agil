BEGIN;
ALTER TABLE emision_certificado DROP CONSTRAINT emision_certificado_tipo_check;
ALTER TABLE emision_certificado ADD CONSTRAINT emision_certificado_tipo_check
 CHECK (tipo IN ('INSCRIPCION','CALIFICACIONES','ASIGNACION_FAMILIAR'));
INSERT INTO schema_migration(version) VALUES ('002_asignacion_familiar');
COMMIT;
