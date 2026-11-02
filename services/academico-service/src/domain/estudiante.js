class ErrorAcademico extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
function exigir(condicion, status, mensaje) {
  if (!condicion) throw new ErrorAcademico(status, mensaje);
}
function idPositivo(value, nombre = 'Identificador') {
  exigir(/^[1-9]\d*$/.test(String(value)) && Number.isSafeInteger(Number(value)) && Number(value) <= 2147483647, 400, `${nombre} inválido`);
  return Number(value);
}
function texto(value, minimo, maximo, nombre) {
  exigir(typeof value === 'string' && value.trim().length >= minimo && value.trim().length <= maximo, 400, `${nombre}: entre ${minimo} y ${maximo} caracteres`);
  return value.trim();
}
function dia(value) { return value.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''); }
function hayChoque(a, b) {
  return dia(a.dia_semana) === dia(b.dia_semana) && a.hora_inicio < b.hora_fin && b.hora_inicio < a.hora_fin;
}
function respuestasValidas(preguntas, respuestas) {
  exigir(respuestas && typeof respuestas === 'object' && !Array.isArray(respuestas), 400, 'Respuestas inválidas');
  exigir(preguntas.length > 0 && Object.keys(respuestas).length === preguntas.length, 400, 'Responde todas las preguntas');
  for (const p of preguntas) exigir(Number.isInteger(respuestas[p.id_pregunta]) && respuestas[p.id_pregunta] >= 1 && respuestas[p.id_pregunta] <= 5, 400, 'Cada respuesta debe ser un entero entre 1 y 5');
  return respuestas;
}
function progreso(malla, resultados, inscritos) {
  const aprobadas = new Set(resultados.filter(r => Number(r.nota) >= Number(r.nota_minima)).map(r => r.id_asignatura));
  const cursadas = new Set(resultados.map(r => r.id_asignatura));
  const activas = new Set(inscritos.map(r => r.id_asignatura));
  const asignaturas = malla.map(a => ({ ...a, estado: aprobadas.has(a.id_asignatura) ? 'APROBADA' : activas.has(a.id_asignatura) ? 'EN_CURSO' : cursadas.has(a.id_asignatura) ? 'REPROBADA' : 'PENDIENTE' }));
  const creditos_totales = asignaturas.reduce((n,a) => n + Number(a.creditos), 0);
  const creditos_aprobados = asignaturas.filter(a => a.estado === 'APROBADA').reduce((n,a) => n + Number(a.creditos), 0);
  return { asignaturas, creditos_totales, creditos_aprobados, porcentaje: creditos_totales ? Math.round(100 * creditos_aprobados / creditos_totales) : 0 };
}
module.exports = { ErrorAcademico, exigir, idPositivo, texto, hayChoque, respuestasValidas, progreso };
