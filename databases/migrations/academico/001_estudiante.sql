BEGIN;
CREATE TABLE IF NOT EXISTS schema_migration (version TEXT PRIMARY KEY, aplicada TIMESTAMPTZ NOT NULL DEFAULT now());
ALTER TABLE periodo_academico ADD COLUMN inscripcion_abierta BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE periodo_academico ADD CONSTRAINT periodo_fechas CHECK (fecha_fin >= fecha_inicio);
ALTER TABLE curso ADD CONSTRAINT curso_periodo_fk FOREIGN KEY (id_periodo) REFERENCES periodo_academico;
ALTER TABLE curso ADD CONSTRAINT curso_cupos CHECK (cupo_maximo > 0 AND cupo_actual >= 0 AND cupo_actual <= cupo_maximo);
ALTER TABLE curso_docente ADD CONSTRAINT curso_docente_curso_fk FOREIGN KEY (id_curso) REFERENCES curso;
ALTER TABLE horario ADD CONSTRAINT horario_curso_fk FOREIGN KEY (id_curso) REFERENCES curso;
ALTER TABLE inscripcion ADD CONSTRAINT inscripcion_curso_fk FOREIGN KEY (id_curso) REFERENCES curso;
ALTER TABLE evaluacion ADD CONSTRAINT evaluacion_curso_fk FOREIGN KEY (id_curso) REFERENCES curso;
ALTER TABLE calificacion ADD CONSTRAINT calificacion_evaluacion_fk FOREIGN KEY (id_evaluacion) REFERENCES evaluacion;
ALTER TABLE clase ADD CONSTRAINT clase_curso_fk FOREIGN KEY (id_curso) REFERENCES curso;
ALTER TABLE asistencia ADD CONSTRAINT asistencia_clase_fk FOREIGN KEY (id_clase) REFERENCES clase;
ALTER TABLE asistencia ADD CONSTRAINT asistencia_estado CHECK (estado IN ('PRESENTE','AUSENTE','JUSTIFICADO','ATRASADO'));
ALTER TABLE clase ADD CONSTRAINT clase_horas CHECK (hora_fin IS NULL OR hora_inicio IS NULL OR hora_fin > hora_inicio);
ALTER TABLE restriccion ADD COLUMN id_unidad INTEGER;
CREATE TABLE resultado_final (
 id_resultado SERIAL PRIMARY KEY,
 id_inscripcion INTEGER NOT NULL UNIQUE REFERENCES inscripcion,
 nota NUMERIC(3,1) NOT NULL CHECK (nota BETWEEN 1 AND 7),
 nota_minima NUMERIC(3,1) NOT NULL DEFAULT 4.0 CHECK (nota_minima BETWEEN 1 AND 7),
 registrado_por INTEGER NOT NULL,
 fecha_registro TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE solicitud_levantamiento (
 id_solicitud SERIAL PRIMARY KEY,
 id_restriccion INTEGER NOT NULL REFERENCES restriccion,
 motivo TEXT NOT NULL CHECK (length(trim(motivo)) BETWEEN 10 AND 2000),
 estado TEXT NOT NULL DEFAULT 'PENDIENTE' CHECK (estado IN ('PENDIENTE','APROBADA','RECHAZADA')),
 fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT now(),
 resuelta_por INTEGER,
 fecha_resolucion TIMESTAMPTZ,
 resolucion TEXT,
 CHECK ((estado = 'PENDIENTE' AND resuelta_por IS NULL AND fecha_resolucion IS NULL) OR
        (estado <> 'PENDIENTE' AND resuelta_por IS NOT NULL AND fecha_resolucion IS NOT NULL AND length(trim(resolucion)) >= 10))
);
CREATE UNIQUE INDEX solicitud_pendiente ON solicitud_levantamiento(id_restriccion) WHERE estado = 'PENDIENTE';
CREATE TABLE encuesta_docente (
 id_encuesta SERIAL PRIMARY KEY,
 id_curso_docente INTEGER NOT NULL REFERENCES curso_docente,
 titulo TEXT NOT NULL CHECK (length(trim(titulo)) BETWEEN 3 AND 200),
 fecha_inicio DATE NOT NULL,
 fecha_fin DATE NOT NULL,
 activa BOOLEAN NOT NULL DEFAULT TRUE,
 creada_por INTEGER NOT NULL,
 CHECK (fecha_fin >= fecha_inicio)
);
CREATE TABLE pregunta_encuesta (
 id_pregunta SERIAL PRIMARY KEY,
 id_encuesta INTEGER NOT NULL REFERENCES encuesta_docente,
 texto TEXT NOT NULL,
 orden INTEGER NOT NULL,
 UNIQUE(id_encuesta, orden)
);
-- Respuestas individuales: acceso exclusivo del servicio; no se exponen al docente.
CREATE TABLE respuesta_encuesta (
 id_respuesta SERIAL PRIMARY KEY,
 id_encuesta INTEGER NOT NULL REFERENCES encuesta_docente,
 id_estudiante INTEGER NOT NULL,
 respuestas JSONB NOT NULL CHECK (jsonb_typeof(respuestas) = 'object'),
 fecha TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(id_encuesta, id_estudiante)
);
CREATE TABLE emision_certificado (
 id_emision UUID PRIMARY KEY,
 id_estudiante INTEGER NOT NULL,
 tipo TEXT NOT NULL CHECK (tipo IN ('INSCRIPCION','CALIFICACIONES')),
 id_periodo INTEGER NOT NULL REFERENCES periodo_academico,
 fecha TIMESTAMPTZ NOT NULL DEFAULT now(),
 demostracion BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE TABLE auditoria_academica (
 id_auditoria BIGSERIAL PRIMARY KEY,
 id_usuario INTEGER NOT NULL,
 accion TEXT NOT NULL,
 detalle JSONB NOT NULL,
 fecha TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX inscripcion_estudiante ON inscripcion(id_estudiante, estado);
CREATE INDEX curso_periodo ON curso(id_periodo);
CREATE INDEX restriccion_estudiante ON restriccion(id_estudiante) WHERE activa;
CREATE INDEX horario_curso ON horario(id_curso);
UPDATE curso c SET cupo_actual = (SELECT count(*) FROM inscripcion i WHERE i.id_curso=c.id_curso AND i.estado='ACTIVA');
INSERT INTO schema_migration(version) VALUES ('001_estudiante');
COMMIT;
