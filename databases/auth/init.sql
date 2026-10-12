CREATE TABLE rol (
    id_rol SERIAL PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE usuario (
    id_usuario SERIAL PRIMARY KEY,
    correo VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE usuario_rol (
    id_usuario INTEGER NOT NULL,
    id_rol INTEGER NOT NULL,

    PRIMARY KEY (id_usuario, id_rol),

    FOREIGN KEY (id_usuario)
        REFERENCES usuario(id_usuario)
        ON DELETE CASCADE,

    FOREIGN KEY (id_rol)
        REFERENCES rol(id_rol)
        ON DELETE CASCADE
);

INSERT INTO rol (nombre) VALUES
('ESTUDIANTE'),
('DOCENTE'),
('ADMIN_UNIDAD'),
('ADMIN_GENERAL');