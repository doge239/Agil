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
    const valido = v => /^[1-9]\d*$/.test(String(v)) && Number(v) <= 2147483647;
    if (!valido(idCarrera) || (req.query.plan !== undefined && !valido(req.query.plan))) return res.status(400).json({mensaje:'Carrera o plan inválido'});
    const planes = await pool.query("SELECT * FROM plan_estudio WHERE id_carrera=$1 AND (estado<>'BORRADOR' OR $2::boolean) ORDER BY anio_inicio DESC,id_plan DESC",[idCarrera,req.usuario?.roles?.includes('ADMIN_GENERAL')||false]);
    if (!planes.rowCount) return res.status(404).json({mensaje:'No hay planes para esta carrera'});
    const elegido = req.query.plan ? planes.rows.find(p=>p.id_plan===Number(req.query.plan)) : planes.rows.find(p=>p.estado==='ACTIVO') || planes.rows[0];
    if (!elegido) return res.status(404).json({mensaje:'El plan no pertenece a esta carrera'});

    const resultado = await pool.query(
      `
      SELECT
        c.id_carrera,
        c.nombre AS carrera,
        p.id_plan,
        p.nombre AS plan,
        m.semestre,
        m.orden,
        m.requisitos_estado,
        m.requisito_nivel,
        m.espacio_electivo,
        m.fuente,
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
        AND p.id_plan = $2
      ORDER BY m.semestre, m.orden, a.nombre
      `,
      [idCarrera,elegido.id_plan]
    );

    const requisitos = await pool.query(elegido.gestionado?'SELECT * FROM prerrequisito_plan WHERE id_plan=$1':'SELECT * FROM prerrequisito WHERE id_asignatura IN (SELECT id_asignatura FROM malla_curricular WHERE id_plan=$1)',[elegido.id_plan]);
    const opciones = await pool.query('SELECT e.*,a.nombre,a.codigo,a.creditos FROM electivo_opcion e JOIN asignatura a USING(id_asignatura) WHERE e.id_plan=$1',[elegido.id_plan]);
    res.json({malla:resultado.rows,planes:planes.rows,plan:elegido,prerrequisitos:requisitos.rows,electivos:opciones.rows});
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
