const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("../config/database");

async function login(req, res) {
  try {
    const { correo, password } = req.body;

    if (!correo || !password) {
      return res.status(400).json({
        mensaje: "Correo y contraseña son obligatorios",
      });
    }

    const usuarioResult = await pool.query(
      `
      SELECT
        u.id_usuario,
        u.correo,
        u.password_hash,
        u.activo
      FROM usuario u
      WHERE u.correo = $1
      `,
      [correo]
    );

    if (usuarioResult.rows.length === 0) {
      return res.status(401).json({
        mensaje: "Credenciales incorrectas",
      });
    }

    const usuario = usuarioResult.rows[0];

    if (!usuario.activo) {
      return res.status(403).json({
        mensaje: "Usuario inactivo",
      });
    }

    const passwordCorrecta = await bcrypt.compare(
      password,
      usuario.password_hash
    );

    if (!passwordCorrecta) {
      return res.status(401).json({
        mensaje: "Credenciales incorrectas",
      });
    }

    const rolesResult = await pool.query(
      `
      SELECT r.nombre
      FROM rol r
      INNER JOIN usuario_rol ur
        ON ur.id_rol = r.id_rol
      WHERE ur.id_usuario = $1
      `,
      [usuario.id_usuario]
    );

    const roles = rolesResult.rows.map((rol) => rol.nombre);

    const token = jwt.sign(
      {
        id_usuario: usuario.id_usuario,
        correo: usuario.correo,
        roles: roles,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "2h",
      }
    );

    return res.json({
      mensaje: "Inicio de sesión correcto",
      token: token,
      usuario: {
        id_usuario: usuario.id_usuario,
        correo: usuario.correo,
        roles: roles,
      },
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      mensaje: "Error interno del servidor",
    });
  }
}

module.exports = {
  login,
};