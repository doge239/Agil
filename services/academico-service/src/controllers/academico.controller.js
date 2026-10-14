const pool = require("../config/database");
const axios = require("axios");

async function obtenerIdEstudiante(token) {
  const respuesta = await axios.get(
    `${process.env.USUARIOS_SERVICE_URL}/usuarios/me`,
    {
      headers: {
        Authorization: token,
      },
    }
  );

  return respuesta.data.perfil.id_estudiante;
}

async function obtenerAsignaturas(req, res) {
  try {
    const token = req.headers.authorization;

    const idEstudiante = await obtenerIdEstudiante(token);

    const resultado = await pool.query(
      `
      SELECT
        i.id_inscripcion,
        i.id_curso,
        c.id_asignatura,
        c.seccion,
        c.estado
      FROM inscripcion i
      INNER JOIN curso c
        ON c.id_curso = i.id_curso
      WHERE i.id_estudiante = $1
        AND i.estado = 'ACTIVA'
      `,
      [idEstudiante]
    );

    const catalogoRespuesta = await axios.get(
      `${process.env.CATALOGO_SERVICE_URL}/catalogo/asignaturas`,
      {
        headers: {
          Authorization: token,
        },
      }
    );

    const asignaturasCatalogo =
      catalogoRespuesta.data.asignaturas;

    const asignaturas = resultado.rows.map((curso) => {
      const asignatura = asignaturasCatalogo.find(
        (a) => a.id_asignatura === curso.id_asignatura
      );

      return {
        id_curso: curso.id_curso,
        id_asignatura: curso.id_asignatura,
        codigo: asignatura?.codigo || null,
        nombre: asignatura?.nombre || null,
        creditos: asignatura?.creditos || null,
        seccion: curso.seccion,
      };
    });

    res.json({
      asignaturas,
    });

  } catch (error) {
    console.error(error.message);

    res.status(500).json({
      mensaje: "Error obteniendo asignaturas del estudiante",
    });
  }
}

async function obtenerHorario(req, res) {
  try {
    const token = req.headers.authorization;

    const idEstudiante = await obtenerIdEstudiante(token);

    const resultado = await pool.query(
      `
      SELECT
        c.id_curso,
        c.id_asignatura,
        c.seccion,
        h.dia_semana,
        h.hora_inicio,
        h.hora_fin,
        h.sala
      FROM inscripcion i
      INNER JOIN curso c
        ON c.id_curso = i.id_curso
      INNER JOIN horario h
        ON h.id_curso = c.id_curso
      WHERE i.id_estudiante = $1
        AND i.estado = 'ACTIVA'
      ORDER BY h.dia_semana, h.hora_inicio
      `,
      [idEstudiante]
    );

    res.json({
      horario: resultado.rows,
    });

  } catch (error) {
    console.error(error.message);

    res.status(500).json({
      mensaje: "Error obteniendo horario",
    });
  }
}

async function obtenerNotas(req, res) {
  try {
    const token = req.headers.authorization;

    const idEstudiante = await obtenerIdEstudiante(token);

    const resultado = await pool.query(
      `
      SELECT
        c.id_curso,
        c.id_asignatura,
        e.id_evaluacion,
        e.nombre AS evaluacion,
        e.porcentaje,
        cal.nota
      FROM calificacion cal
      INNER JOIN evaluacion e
        ON e.id_evaluacion = cal.id_evaluacion
      INNER JOIN curso c
        ON c.id_curso = e.id_curso
      WHERE cal.id_estudiante = $1
      ORDER BY c.id_curso, e.fecha
      `,
      [idEstudiante]
    );

    res.json({
      notas: resultado.rows,
    });

  } catch (error) {
    console.error(error.message);

    res.status(500).json({
      mensaje: "Error obteniendo calificaciones",
    });
  }
}

async function obtenerAsistencia(req, res) {
  try {
    const token = req.headers.authorization;

    const idEstudiante = await obtenerIdEstudiante(token);

    const resultado = await pool.query(
      `
      SELECT
        c.id_curso,
        c.id_asignatura,
        cl.fecha,
        cl.hora_inicio,
        cl.hora_fin,
        a.estado,
        a.observacion
      FROM asistencia a
      INNER JOIN clase cl
        ON cl.id_clase = a.id_clase
      INNER JOIN curso c
        ON c.id_curso = cl.id_curso
      WHERE a.id_estudiante = $1
      ORDER BY cl.fecha DESC
      `,
      [idEstudiante]
    );

    res.json({
      asistencia: resultado.rows,
    });

  } catch (error) {
    console.error(error.message);

    res.status(500).json({
      mensaje: "Error obteniendo asistencia",
    });
  }
}

module.exports = {
  obtenerAsignaturas,
  obtenerHorario,
  obtenerNotas,
  obtenerAsistencia,
};