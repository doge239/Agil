BEGIN;
ALTER TABLE carrera ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE asignatura ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE plan_estudio ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE plan_estudio ADD COLUMN gestionado BOOLEAN NOT NULL DEFAULT FALSE;
CREATE TABLE prerrequisito_plan (
 id_plan INTEGER NOT NULL,
 id_asignatura INTEGER NOT NULL,
 id_asignatura_requisito INTEGER NOT NULL,
 PRIMARY KEY(id_plan,id_asignatura,id_asignatura_requisito),
 FOREIGN KEY(id_plan,id_asignatura) REFERENCES malla_curricular(id_plan,id_asignatura),
 FOREIGN KEY(id_plan,id_asignatura_requisito) REFERENCES malla_curricular(id_plan,id_asignatura),
 CHECK(id_asignatura<>id_asignatura_requisito)
);
CREATE TABLE auditoria_catalogo (
 id_auditoria BIGSERIAL PRIMARY KEY,
 id_usuario INTEGER NOT NULL,
 accion TEXT NOT NULL,
 detalle JSONB NOT NULL,
 fecha TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX auditoria_catalogo_accion ON auditoria_catalogo(accion,id_auditoria DESC);
INSERT INTO schema_migration(version) VALUES ('003_admin_general');
COMMIT;
