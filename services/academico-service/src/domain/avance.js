// El resultado académico y la elegibilidad son independientes. Una inscripción no acredita aprobación.
function calcularAvance({malla, prerrequisitos = [], electivos = []}, resultados, inscritos, elecciones = []) {
  const seleccion = new Map(elecciones.filter(e => electivos.some(o => o.id_espacio === e.id_espacio && o.id_asignatura === e.id_asignatura)).map(e => [e.id_espacio, e.id_asignatura]));
  const asignaturas = malla.map(a => {
    const elegida = electivos.find(o => o.id_espacio === a.id_asignatura && o.id_asignatura === seleccion.get(a.id_asignatura));
    // Cada espacio se acredita solo con su elección; nunca se agregan ambos al denominador.
    const idHistorial = elegida?.id_asignatura ?? a.id_asignatura;
    const intentos = resultados.filter(r => r.id_asignatura === idHistorial);
    const aprobacion = intentos.findLast(r => r.nota != null && r.nota_minima != null && Number(r.nota) >= Number(r.nota_minima));
    const actual = inscritos.some(r => r.id_asignatura === idHistorial);
    const estado = aprobacion ? 'APROBADA' : actual ? 'EN_CURSO' : intentos.length ? 'REPROBADA' : 'PENDIENTE';
    const final = aprobacion ?? intentos.at(-1);
    return {...a, elegida: elegida ? {id_asignatura:elegida.id_asignatura,nombre:elegida.nombre,codigo:elegida.codigo} : null,
      estado, nota:final?.nota == null ? null : Number(final.nota), intentos:intentos.length};
  });
  const mapa = new Map(asignaturas.map(a => [a.id_asignatura,a]));
  const requisitosDe = a => {
    const ids = new Set(prerrequisitos.filter(r => r.id_asignatura === a.id_asignatura).map(r => r.id_asignatura_requisito));
    if (a.requisito_nivel) for (const otra of asignaturas) {
      if (otra.id_asignatura !== a.id_asignatura && otra.semestre <= a.requisito_nivel && (otra.obligatoria || otra.espacio_electivo)) ids.add(otra.id_asignatura);
    }
    return [...ids].map(id => ({id_asignatura:id, asignatura:mapa.get(id)?.asignatura ?? 'Asignatura fuera del plan',codigo:mapa.get(id)?.codigo ?? null,cumplido:mapa.get(id)?.estado === 'APROBADA'}));
  };
  for (const a of asignaturas) {
    a.prerrequisitos = requisitosDe(a);
    a.pendientes = a.prerrequisitos.filter(r => !r.cumplido);
    a.disponibilidad = a.requisitos_estado === 'POR_CONFIRMAR' ? 'POR_CONFIRMAR' : a.pendientes.length ? 'BLOQUEADA' : 'DISPONIBLE';
  }
  for (const a of asignaturas) a.habilita = asignaturas.filter(b => b.prerrequisitos.some(r => r.id_asignatura === a.id_asignatura)).map(b => ({
    id_asignatura:b.id_asignatura,asignatura:b.asignatura,codigo:b.codigo,disponibilidad:b.disponibilidad,
    otros_pendientes:b.pendientes.filter(r => r.id_asignatura !== a.id_asignatura),
  }));
  const aprobadas = asignaturas.filter(a => a.estado === 'APROBADA');
  const creditos_confirmados = asignaturas.every(a => a.creditos != null && Number(a.creditos) > 0);
  const creditos_totales = creditos_confirmados ? asignaturas.reduce((n,a) => n + Number(a.creditos),0) : null;
  const creditos_aprobados = creditos_confirmados ? aprobadas.reduce((n,a) => n + Number(a.creditos),0) : null;
  return {asignaturas, creditos_confirmados, creditos_totales, creditos_aprobados,
    porcentaje:creditos_totales ? Math.round(100 * creditos_aprobados / creditos_totales) : null,
    asignaturas_totales:asignaturas.length, asignaturas_aprobadas:aprobadas.length,
    porcentaje_asignaturas:asignaturas.length ? Math.round(100 * aprobadas.length / asignaturas.length) : 0};
}
module.exports = {calcularAvance};
