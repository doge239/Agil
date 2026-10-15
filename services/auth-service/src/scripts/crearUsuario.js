require("dotenv").config();

const bcrypt = require("bcrypt");
const pool = require("../config/database");

async function crearUsuario() {
  try {
    const correo = "estudiante@ucn.cl";
    const password = "123456";

    const passwordHash = await bcrypt.hash(password, 10);

    const insertResult = await pool.query(
      `
      INSERT INTO usuario (correo, password_hash)
      VALUES ($1, $2)
      ON CONFLICT (correo) DO NOTHING
      RETURNING id_usuario, correo
      `,
      [correo, passwordHash]
    );

    let usuario = insertResult.rows[0];
    const creado = Boolean(usuario);

    if (!usuario) {
      const existente = await pool.query(
        `
        SELECT id_usuario, correo
        FROM usuario
        WHERE correo = $1
        `,
        [correo]
      );

      usuario = existente.rows[0];
    }

    const rolResult = await pool.query(
      `
      SELECT id_rol
      FROM rol
      WHERE nombre = 'ESTUDIANTE'
      `
    );

    const idRol = rolResult.rows[0].id_rol;

    const rolAsignado = await pool.query(
      `
      INSERT INTO usuario_rol (id_usuario, id_rol)
      VALUES ($1, $2)
      ON CONFLICT (id_usuario, id_rol) DO NOTHING
      RETURNING id_usuario
      `,
      [usuario.id_usuario, idRol]
    );

    if (creado) {
      console.log("Usuario creado correctamente:");
    } else if (rolAsignado.rowCount > 0) {
      console.log("Usuario ya existía; se asignó el rol ESTUDIANTE:");
    } else {
      console.log("Usuario ya existía y ya tenía el rol ESTUDIANTE. Sin cambios:");
    }

    console.log(usuario);

  } catch (error) {
    console.error("Error creando usuario:", error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

crearUsuario();
