CREATE TABLE persona (
    id_persona SERIAL PRIMARY KEY,
    id_usuario INTEGER NOT NULL UNIQUE,
    rut VARCHAR(20) UNIQUE,
    nombres VARCHAR(100) NOT NULL,
    apellido_paterno VARCHAR(100) NOT NULL,
    apellido_materno VARCHAR(100),
    correo_institucional VARCHAR(150) NOT NULL UNIQUE,
    telefono VARCHAR(30)
);

CREATE TABLE estudiante (
    id_estudiante SERIAL PRIMARY KEY,
    id_persona INTEGER NOT NULL UNIQUE,
    numero_matricula VARCHAR(50) NOT NULL UNIQUE,
    id_carrera INTEGER,
    anio_ingreso INTEGER,

    FOREIGN KEY (id_persona)
        REFERENCES persona(id_persona)
        ON DELETE CASCADE
);

CREATE TABLE docente (
    id_docente SERIAL PRIMARY KEY,
    id_persona INTEGER NOT NULL UNIQUE,
    id_unidad INTEGER,

    FOREIGN KEY (id_persona)
        REFERENCES persona(id_persona)
        ON DELETE CASCADE
);

CREATE TABLE administrador_unidad (
    id_admin_unidad SERIAL PRIMARY KEY,
    id_persona INTEGER NOT NULL UNIQUE,
    id_unidad INTEGER,

    FOREIGN KEY (id_persona)
        REFERENCES persona(id_persona)
        ON DELETE CASCADE
);

CREATE TABLE administrador_general (
    id_admin_general SERIAL PRIMARY KEY,
    id_persona INTEGER NOT NULL UNIQUE,

    FOREIGN KEY (id_persona)
        REFERENCES persona(id_persona)
        ON DELETE CASCADE
);

INSERT INTO persona (
    id_usuario,
    rut,
    nombres,
    apellido_paterno,
    apellido_materno,
    correo_institucional,
    telefono
)
VALUES (
    1,
    '20.000.000-0',
    'Enzo',
    'Inostroza',
    '',
    'estudiante@ucn.cl',
    '912345678'
);

INSERT INTO estudiante (
    id_persona,
    numero_matricula,
    id_carrera,
    anio_ingreso
)
VALUES (
    1,
    '20260001',
    1,
    2026
);