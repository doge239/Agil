BEGIN;
CREATE TABLE sesion_asistencia_qr (
 id_sesion UUID PRIMARY KEY,
 id_clase INTEGER NOT NULL REFERENCES clase,
 id_docente INTEGER NOT NULL,
 creada_por INTEGER NOT NULL,
 creada TIMESTAMPTZ NOT NULL DEFAULT now(),
 expira TIMESTAMPTZ NOT NULL,
 cerrada TIMESTAMPTZ,
 CHECK (expira > creada)
);
CREATE UNIQUE INDEX sesion_qr_abierta ON sesion_asistencia_qr(id_clase) WHERE cerrada IS NULL;
ALTER TABLE asistencia ADD COLUMN origen TEXT NOT NULL DEFAULT 'MANUAL' CHECK (origen IN ('MANUAL','QR'));
ALTER TABLE asistencia ADD COLUMN id_sesion_qr UUID REFERENCES sesion_asistencia_qr;
INSERT INTO schema_migration(version) VALUES ('007_asistencia_qr');
COMMIT;
