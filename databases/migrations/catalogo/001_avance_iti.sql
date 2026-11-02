BEGIN;
CREATE TABLE IF NOT EXISTS schema_migration (version TEXT PRIMARY KEY, aplicada TIMESTAMPTZ NOT NULL DEFAULT now());
ALTER TABLE asignatura ALTER COLUMN codigo DROP NOT NULL;
ALTER TABLE asignatura ALTER COLUMN creditos DROP NOT NULL;
ALTER TABLE plan_estudio ADD COLUMN referencia TEXT UNIQUE;
ALTER TABLE plan_estudio ADD COLUMN fuente TEXT;
ALTER TABLE plan_estudio ADD COLUMN observaciones TEXT;
ALTER TABLE malla_curricular ADD COLUMN referencia TEXT;
ALTER TABLE malla_curricular ADD COLUMN orden INTEGER NOT NULL DEFAULT 0;
ALTER TABLE malla_curricular ADD COLUMN requisitos_estado TEXT NOT NULL DEFAULT 'CONFIRMADOS' CHECK (requisitos_estado IN ('CONFIRMADOS','POR_CONFIRMAR'));
ALTER TABLE malla_curricular ADD COLUMN requisito_nivel INTEGER CHECK (requisito_nivel BETWEEN 1 AND 7);
ALTER TABLE malla_curricular ADD COLUMN espacio_electivo BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE malla_curricular ADD COLUMN fuente TEXT;
ALTER TABLE malla_curricular ADD CONSTRAINT malla_referencia UNIQUE(id_plan,referencia);
CREATE TABLE electivo_opcion (
  id_plan INTEGER NOT NULL,
  id_espacio INTEGER NOT NULL,
  id_asignatura INTEGER NOT NULL REFERENCES asignatura,
  PRIMARY KEY(id_plan,id_espacio,id_asignatura),
  FOREIGN KEY(id_plan,id_espacio) REFERENCES malla_curricular(id_plan,id_asignatura)
);
INSERT INTO schema_migration(version) VALUES ('001_avance_iti');
COMMIT;
