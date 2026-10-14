CREATE TABLE periodo_academico (
    id_periodo SERIAL PRIMARY KEY,
    anio INTEGER NOT NULL,
    semestre INTEGER NOT NULL,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    estado VARCHAR(30) NOT NULL DEFAULT 'ACTIVO',

    UNIQUE (anio, semestre)
);

CREATE TABLE curso (
    id_curso SERIAL PRIMARY KEY,
    id_asignatura INTEGER NOT NULL,
    id_periodo INTEGER NOT NULL,
    id_unidad INTEGER NOT NULL,
    seccion INTEGER NOT NULL,
    cupo_maximo INTEGER NOT NULL,
    cupo_actual INTEGER NOT NULL DEFAULT 0,
    estado VARCHAR(30) NOT NULL DEFAULT 'ACTIVO',

    UNIQUE (id_asignatura, id_periodo, seccion)
);

CREATE TABLE curso_docente (
    id_curso_docente SERIAL PRIMARY KEY,
    id_curso INTEGER NOT NULL,
    id_docente INTEGER NOT NULL,
    fecha_asignacion DATE NOT NULL DEFAULT CURRENT_DATE,

    UNIQUE (id_curso, id_docente)
);

CREATE TABLE horario (
    id_horario SERIAL PRIMARY KEY,
    id_curso INTEGER NOT NULL,
    dia_semana VARCHAR(20) NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,
    sala VARCHAR(50),

    CHECK (hora_fin > hora_inicio)
);

CREATE TABLE inscripcion (
    id_inscripcion SERIAL PRIMARY KEY,
    id_estudiante INTEGER NOT NULL,
    id_curso INTEGER NOT NULL,
    fecha_inscripcion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    tipo_inscripcion VARCHAR(30) NOT NULL DEFAULT 'ESTUDIANTE',
    estado VARCHAR(30) NOT NULL DEFAULT 'ACTIVA',

    UNIQUE (id_estudiante, id_curso)
);

CREATE TABLE restriccion (
    id_restriccion SERIAL PRIMARY KEY,
    id_estudiante INTEGER NOT NULL,
    tipo VARCHAR(100) NOT NULL,
    descripcion TEXT,
    activa BOOLEAN NOT NULL DEFAULT TRUE,
    fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_levantamiento TIMESTAMP,
    levantada_por INTEGER
);

CREATE TABLE evaluacion (
    id_evaluacion SERIAL PRIMARY KEY,
    id_curso INTEGER NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    porcentaje NUMERIC(5,2) NOT NULL,
    fecha DATE,

    CHECK (porcentaje > 0 AND porcentaje <= 100)
);

CREATE TABLE calificacion (
    id_calificacion SERIAL PRIMARY KEY,
    id_evaluacion INTEGER NOT NULL,
    id_estudiante INTEGER NOT NULL,
    nota NUMERIC(3,1) NOT NULL,
    fecha_registro TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    id_docente_registro INTEGER,

    CHECK (nota >= 1.0 AND nota <= 7.0),

    UNIQUE (id_evaluacion, id_estudiante)
);

CREATE TABLE clase (
    id_clase SERIAL PRIMARY KEY,
    id_curso INTEGER NOT NULL,
    fecha DATE NOT NULL,
    hora_inicio TIME,
    hora_fin TIME
);

CREATE TABLE asistencia (
    id_asistencia SERIAL PRIMARY KEY,
    id_clase INTEGER NOT NULL,
    id_estudiante INTEGER NOT NULL,
    estado VARCHAR(30) NOT NULL,
    observacion TEXT,

    UNIQUE (id_clase, id_estudiante)
);



INSERT INTO periodo_academico (
    anio,
    semestre,
    fecha_inicio,
    fecha_fin
)
VALUES (
    2026,
    2,
    '2026-08-01',
    '2026-12-20'
);

INSERT INTO curso (
    id_asignatura,
    id_periodo,
    id_unidad,
    seccion,
    cupo_maximo
)
VALUES
(1, 1, 1, 1, 30),
(2, 1, 1, 1, 30),
(3, 1, 1, 1, 25);

INSERT INTO horario (
    id_curso,
    dia_semana,
    hora_inicio,
    hora_fin,
    sala
)
VALUES
(1, 'Lunes', '09:40', '11:10', 'A-301'),
(2, 'Miércoles', '14:30', '16:00', 'B-202'),
(3, 'Viernes', '11:30', '13:00', 'C-105');

INSERT INTO inscripcion (
    id_estudiante,
    id_curso
)
VALUES
(1, 1),
(1, 2),
(1, 3);

INSERT INTO evaluacion (
    id_curso,
    nombre,
    porcentaje,
    fecha
)
VALUES
(1, 'Prueba 1', 30, '2026-09-15'),
(2, 'Prueba 1', 30, '2026-09-20');

INSERT INTO calificacion (
    id_evaluacion,
    id_estudiante,
    nota,
    id_docente_registro
)
VALUES
(1, 1, 5.5, 1),
(2, 1, 6.0, 1);

INSERT INTO clase (
    id_curso,
    fecha,
    hora_inicio,
    hora_fin
)
VALUES
(1, '2026-10-01', '09:40', '11:10'),
(2, '2026-10-02', '14:30', '16:00');

INSERT INTO asistencia (
    id_clase,
    id_estudiante,
    estado
)
VALUES
(1, 1, 'PRESENTE'),
(2, 1, 'PRESENTE');