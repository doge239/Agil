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
        e.anio_ingreso,
        e.id_plan,
        d.id_docente,
        d.id_unidad AS id_unidad_docente,
        au.id_unidad AS id_unidad_admin
      FROM persona p
      LEFT JOIN estudiante e
        ON e.id_persona = p.id_persona
      LEFT JOIN docente d ON d.id_persona = p.id_persona
      LEFT JOIN administrador_unidad au ON au.id_persona = p.id_persona
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

// La lista nunca se obtiene a partir de IDs arbitrarios enviados por el navegador.
// Académico valida nuevamente la asignación y proporciona las inscripciones autorizadas.
module.exports.obtenerEstudiantesDocente = async(req,res)=> {
  if(!req.usuario?.roles?.includes('DOCENTE')) return res.status(403).json({mensaje:'Se requiere el perfil Docente'});
  const id=req.params.idCurso;
  if(!/^[1-9]\d*$/.test(id)||Number(id)>2147483647) return res.status(400).json({mensaje:'Curso inválido'});
  try {
    const r=await fetch(`${process.env.ACADEMICO_SERVICE_URL||'http://localhost:4004'}/academico/docente/cursos/${id}/inscripciones`,{headers:{Authorization:req.headers.authorization},signal:AbortSignal.timeout(8000)});
    const datos=await r.json();
    if(!r.ok)return res.status([401,403,404].includes(r.status)?r.status:503).json({mensaje:datos.mensaje||'No se pudo validar la asignación docente'});
    const inscripciones=datos.inscripciones;
    if(!inscripciones.length)return res.json({estudiantes:[]});
    const personas=await pool.query(`SELECT e.id_estudiante,e.numero_matricula,p.nombres,p.apellido_paterno,p.apellido_materno,p.correo_institucional
      FROM estudiante e JOIN persona p USING(id_persona) WHERE e.id_estudiante=ANY($1::int[]) ORDER BY p.apellido_paterno,p.apellido_materno,p.nombres`,[inscripciones.map(i=>i.id_estudiante)]);
    if(personas.rowCount!==inscripciones.length)return res.status(503).json({mensaje:'Hay inscripciones sin perfil de estudiante. Requiere revisión administrativa.'});
    res.json({estudiantes:personas.rows.map(p=>({...p,...inscripciones.find(i=>i.id_estudiante===p.id_estudiante)}))});
  } catch(e) {
    const status=[401,403,404].includes(e.response?.status)?e.response.status:503;
    res.status(status).json({mensaje:e.response?.data?.mensaje||'No se pudo consultar la nómina autorizada'});
  }
};
