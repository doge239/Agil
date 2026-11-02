BEGIN;
CREATE TABLE lista_espera (
  id_lista_espera SERIAL PRIMARY KEY,
  id_estudiante INTEGER NOT NULL,
  id_curso INTEGER NOT NULL REFERENCES curso(id_curso),
  id_carrera INTEGER NOT NULL,
  id_plan INTEGER NOT NULL,
  estado VARCHAR(20) NOT NULL DEFAULT 'ESPERA'
    CHECK (estado IN ('ESPERA','PROMOVIDA','CANCELADA','NO_ELEGIBLE')),
  fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_cambio TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX lista_espera_curso_orden_idx
  ON lista_espera(id_curso,fecha_creacion,id_lista_espera)
  WHERE estado='ESPERA';
CREATE INDEX lista_espera_estudiante_idx
  ON lista_espera(id_estudiante,id_curso,fecha_creacion DESC);
CREATE UNIQUE INDEX lista_espera_activa_unica_idx
  ON lista_espera(id_estudiante,id_curso)
  WHERE estado='ESPERA';
INSERT INTO schema_migration(version) VALUES ('006_lista_espera');
COMMIT;
