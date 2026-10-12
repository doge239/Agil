require("dotenv").config();

const bcrypt = require("bcrypt");
const pool = require("../config/database");

async function crearUsuario() {
  try {
    const correo = "estudiante@ucn.cl";
    const password = "123456";

    const passwordHash = await bcrypt.hash(password, 10);

    const usuarioResult = await pool.query(
      `
      INSERT INTO usuario (correo, password_hash)
      VALUES ($1, $2)
      RETURNING id_usuario, correo
      `,
      [correo, passwordHash]
    );

    const usuario = usuarioResult.rows[0];

    const rolResult = await pool.query(
      `
      SELECT id_rol
      FROM rol
      WHERE nombre = 'ESTUDIANTE'
      `
    );

    const idRol = rolResult.rows[0].id_rol;

    await pool.query(
      `
      INSERT INTO usuario_rol (id_usuario, id_rol)
      VALUES ($1, $2)
      `,
      [usuario.id_usuario, idRol]
    );

    console.log("Usuario creado correctamente:");
    console.log(usuario);

  } catch (error) {
    console.error("Error creando usuario:", error.message);
  } finally {
    await pool.end();
  }
}

crearUsuario();