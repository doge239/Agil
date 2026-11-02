const axios=require('axios');
const pool=require('../config/database');
const {exigir}=require('./estudiante');
const {calcularAvance}=require('./avance');
const {validarElegibilidad,auditar,cursoBloqueado,transaccion}=require('./inscripcion');

async function catalogo(req,ruta){
  try{
    return (await axios.get(`${process.env.CATALOGO_SERVICE_URL}${ruta}`,{
      headers:{Authorization:req.headers.authorization},timeout:8000,
    })).data;
  }catch(e){
    const status=[401,403,404,409].includes(e.response?.status)?e.response.status:503;
    const error=new Error(e.response?.data?.mensaje||'No se pudo consultar el catálogo para promover la lista de espera');
    error.status=status;
    throw error;
  }
}

async function marcarNoElegible(req,entrada,detalle){
  await transaccion(async db=>{
    const r=await db.query(`UPDATE lista_espera SET estado='NO_ELEGIBLE',fecha_cambio=now()
      WHERE id_lista_espera=$1 AND estado='ESPERA' RETURNING id_lista_espera`,[entrada.id_lista_espera]);
    if(r.rowCount)await auditar(db,req,'LISTA_ESPERA_NO_ELEGIBLE',{
      id_lista_espera:entrada.id_lista_espera,id_estudiante:entrada.id_estudiante,
      id_curso:entrada.id_curso,razon:detalle,
    });
  });
}

async function promoverListaEspera(req,idCurso){
  let promovidos=0;
  while(true){
    const candidato=(await pool.query(`SELECT id_lista_espera,id_estudiante,id_curso,id_carrera,id_plan
      FROM lista_espera WHERE id_curso=$1 AND estado='ESPERA'
      ORDER BY fecha_creacion,id_lista_espera LIMIT 1`,[idCurso])).rows[0];
    if(!candidato)return promovidos;

    let m,cat;
    try{
      const resultado=await catalogo(req,`/catalogo/carreras/${candidato.id_carrera}/malla?plan=${candidato.id_plan}`);
      m=resultado;
      cat=(await catalogo(req,'/catalogo/asignaturas')).asignaturas;
      exigir(m.malla.length,409,'El plan de estudios ya no está disponible');
    }catch(e){
      if(e.status===404||e.status===409){
        await marcarNoElegible(req,candidato,e.message);
        continue;
      }
      throw e;
    }

    const estado=await transaccion(async db=>{
      await db.query('SELECT pg_advisory_xact_lock(17001,$1)',[candidato.id_estudiante]);
      const curso=await cursoBloqueado(db,idCurso);
      const entrada=(await db.query(`SELECT * FROM lista_espera
        WHERE id_lista_espera=$1 AND estado='ESPERA' FOR UPDATE`,[candidato.id_lista_espera])).rows[0];
      if(!entrada)return 'CAMBIO';
      const ocupacion=(await db.query("SELECT count(*)::int AS n FROM inscripcion WHERE id_curso=$1 AND estado='ACTIVA'",[idCurso])).rows[0].n;
      if(ocupacion>=curso.cupo_maximo)return 'LLENO';
      const perfil={id_estudiante:entrada.id_estudiante,id_carrera:entrada.id_carrera,id_plan:entrada.id_plan};
      try{
        const n=await validarElegibilidad({db,p:perfil,m,cat,c:curso});
        const nueva=await db.query(`INSERT INTO inscripcion(id_estudiante,id_curso,tipo_inscripcion)
          VALUES($1,$2,'LISTA_ESPERA')
          ON CONFLICT(id_estudiante,id_curso) DO UPDATE SET estado='ACTIVA',fecha_inscripcion=now(),tipo_inscripcion='LISTA_ESPERA'
          WHERE inscripcion.estado='ANULADA' RETURNING *`,[entrada.id_estudiante,idCurso]);
        exigir(nueva.rowCount,409,'El estudiante ya tiene una inscripción para este curso');
        await db.query('UPDATE curso SET cupo_actual=$2 WHERE id_curso=$1',[idCurso,n+1]);
        await db.query("UPDATE lista_espera SET estado='PROMOVIDA',fecha_cambio=now() WHERE id_lista_espera=$1",[entrada.id_lista_espera]);
        await auditar(db,req,'LISTA_ESPERA_PROMOVER',{
          id_lista_espera:entrada.id_lista_espera,id_estudiante:entrada.id_estudiante,
          id_curso:idCurso,id_inscripcion:nueva.rows[0].id_inscripcion,
        });
        return 'PROMOVIDA';
      }catch(e){
        if(e.status!==403&&e.status!==409)throw e;
        await db.query("UPDATE lista_espera SET estado='NO_ELEGIBLE',fecha_cambio=now() WHERE id_lista_espera=$1",[entrada.id_lista_espera]);
        await auditar(db,req,'LISTA_ESPERA_NO_ELEGIBLE',{
          id_lista_espera:entrada.id_lista_espera,id_estudiante:entrada.id_estudiante,
          id_curso:idCurso,razon:e.message,
        });
        return 'NO_ELEGIBLE';
      }
    });
    if(estado==='LLENO')return promovidos;
    if(estado==='PROMOVIDA')promovidos++;
  }
}

module.exports={promoverListaEspera};
