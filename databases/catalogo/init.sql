CREATE TABLE unidad_academica (
    id_unidad SERIAL PRIMARY KEY,
    codigo VARCHAR(20) NOT NULL UNIQUE,
    nombre VARCHAR(150) NOT NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE carrera (
    id_carrera SERIAL PRIMARY KEY,
    id_unidad INTEGER NOT NULL,
    codigo VARCHAR(20) NOT NULL UNIQUE,
    nombre VARCHAR(150) NOT NULL,
    estado VARCHAR(30) NOT NULL DEFAULT 'ACTIVA',

    FOREIGN KEY (id_unidad)
        REFERENCES unidad_academica(id_unidad)
);

CREATE TABLE plan_estudio (
    id_plan SERIAL PRIMARY KEY,
    id_carrera INTEGER NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    anio_inicio INTEGER NOT NULL,
    estado VARCHAR(30) NOT NULL DEFAULT 'ACTIVO',

    FOREIGN KEY (id_carrera)
        REFERENCES carrera(id_carrera)
);

CREATE TABLE asignatura (
    id_asignatura SERIAL PRIMARY KEY,
    codigo VARCHAR(20) NOT NULL UNIQUE,
    nombre VARCHAR(150) NOT NULL,
    creditos INTEGER NOT NULL,
    descripcion TEXT,
    estado VARCHAR(30) NOT NULL DEFAULT 'ACTIVA'
);

CREATE TABLE malla_curricular (
    id_malla SERIAL PRIMARY KEY,
    id_plan INTEGER NOT NULL,
    id_asignatura INTEGER NOT NULL,
    semestre INTEGER NOT NULL,
    obligatoria BOOLEAN NOT NULL DEFAULT TRUE,

    FOREIGN KEY (id_plan)
        REFERENCES plan_estudio(id_plan),

    FOREIGN KEY (id_asignatura)
        REFERENCES asignatura(id_asignatura),

    UNIQUE (id_plan, id_asignatura)
);

CREATE TABLE prerrequisito (
    id_prerrequisito SERIAL PRIMARY KEY,
    id_asignatura INTEGER NOT NULL,
    id_asignatura_requisito INTEGER NOT NULL,

    FOREIGN KEY (id_asignatura)
        REFERENCES asignatura(id_asignatura),

    FOREIGN KEY (id_asignatura_requisito)
        REFERENCES asignatura(id_asignatura),

    UNIQUE (id_asignatura, id_asignatura_requisito)
);


-- DATOS INICIALES

INSERT INTO unidad_academica (
    codigo,
    nombre
)
VALUES (
    'EIC',
    'Escuela de Ingeniería Coquimbo'
);

INSERT INTO carrera (
    id_unidad,
    codigo,
    nombre
)
VALUES (
    1,
    'ICI',
    'Ingeniería Civil en Computación e Informática'
);

INSERT INTO plan_estudio (
    id_carrera,
    nombre,
    anio_inicio
)
VALUES (
    1,
    'Plan 2026',
    2026
);

INSERT INTO asignatura (
    codigo,
    nombre,
    creditos,
    descripcion
)
VALUES
(
    'BD001',
    'Bases de Datos',
    5,
    'Fundamentos de bases de datos relacionales'
),
(
    'SI001',
    'Sistemas de Información',
    5,
    'Fundamentos y gestión de sistemas de información'
),
(
    'RED001',
    'Redes',
    5,
    'Fundamentos de redes de computadores'
);

INSERT INTO malla_curricular (
    id_plan,
    id_asignatura,
    semestre
)
VALUES
(1, 1, 1),
(1, 2, 1),
(1, 3, 2);

INSERT INTO prerrequisito (
    id_asignatura,
    id_asignatura_requisito
)
VALUES
(3, 1);