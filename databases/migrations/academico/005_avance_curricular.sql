BEGIN;
CREATE TABLE eleccion_electivo (
  id_estudiante INTEGER NOT NULL,
  id_plan INTEGER NOT NULL,
  id_espacio INTEGER NOT NULL,
  id_asignatura INTEGER NOT NULL,
  PRIMARY KEY(id_estudiante,id_plan,id_espacio),
  UNIQUE(id_estudiante,id_plan,id_asignatura)
);
INSERT INTO schema_migration(version) VALUES ('005_avance_curricular');
COMMIT;
