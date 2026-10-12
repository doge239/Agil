const pool = require("../config/database");

async function obtenerMiPerfil(req, res) {
  try {
    const idUsuario = req.usuario.id_usuario;

    const resultado = await pool.query(
      `
      SELECT
        p.id_persona,
        p.id_usuario,
        p.rut,
        p.nombres,
        p.apellido_paterno,
        p.apellido_materno,
        p.correo_institucional,
        p.telefono,
        e.id_estudiante,
        e.numero_matricula,
        e.id_carrera,
        e.anio_ingreso
      FROM persona p
      LEFT JOIN estudiante e
        ON e.id_persona = p.id_persona
      WHERE p.id_usuario = $1
      `,
      [idUsuario]
    );

    if (resultado.rows.length === 0) {
      return res.status(404).json({
        mensaje: "Perfil no encontrado",
      });
    }

    return res.json({
      perfil: resultado.rows[0],
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      mensaje: "Error interno del servidor",
    });
  }
}

module.exports = {
  obtenerMiPerfil,
};