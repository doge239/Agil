const pool = require("../config/database");

async function obtenerCarreras(req, res) {
  try {
    const resultado = await pool.query(
      `
      SELECT
        c.id_carrera,
        c.codigo,
        c.nombre,
        c.estado,
        u.id_unidad,
        u.nombre AS unidad_academica
      FROM carrera c
      INNER JOIN unidad_academica u
        ON u.id_unidad = c.id_unidad
      ORDER BY c.nombre
      `
    );

    res.json({
      carreras: resultado.rows,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      mensaje: "Error obteniendo carreras",
    });
  }
}

async function obtenerAsignaturas(req, res) {
  try {
    const resultado = await pool.query(
      `
      SELECT
        id_asignatura,
        codigo,
        nombre,
        creditos,
        descripcion,
        estado
      FROM asignatura
      ORDER BY nombre
      `
    );

    res.json({
      asignaturas: resultado.rows,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      mensaje: "Error obteniendo asignaturas",
    });
  }
}

async function obtenerMallaPorCarrera(req, res) {
  try {
    const { idCarrera } = req.params;

    const resultado = await pool.query(
      `
      SELECT
        c.id_carrera,
        c.nombre AS carrera,
        p.id_plan,
        p.nombre AS plan,
        m.semestre,
        a.id_asignatura,
        a.codigo,
        a.nombre AS asignatura,
        a.creditos,
        m.obligatoria
      FROM carrera c
      INNER JOIN plan_estudio p
        ON p.id_carrera = c.id_carrera
      INNER JOIN malla_curricular m
        ON m.id_plan = p.id_plan
      INNER JOIN asignatura a
        ON a.id_asignatura = m.id_asignatura
      WHERE c.id_carrera = $1
      ORDER BY m.semestre, a.nombre
      `,
      [idCarrera]
    );

    res.json({
      malla: resultado.rows,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      mensaje: "Error obteniendo la malla curricular",
    });
  }
}

module.exports = {
  obtenerCarreras,
  obtenerAsignaturas,
  obtenerMallaPorCarrera,
};