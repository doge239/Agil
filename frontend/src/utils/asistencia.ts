export const estadosAsistencia = [
  {estado:'PRESENTE',etiqueta:'Asistió',simbolo:'✓'},
  {estado:'AUSENTE',etiqueta:'Faltó',simbolo:'×'},
  {estado:'JUSTIFICADO',etiqueta:'Justificado',simbolo:'J'},
] as const
const pendiente = {estado:'PENDIENTE',etiqueta:'Sin registrar',simbolo:'·'}
export const estadoAsistencia = (estado:string|null|undefined) =>
  estadosAsistencia.find(item=>item.estado===(estado==='ATRASADO'?'PRESENTE':estado)) ?? pendiente

export function resumirAsistencia(registros:{estado:string|null|undefined}[]) {
  let confirmadas=0,asistidas=0
  for(const registro of registros) {
    const estado=estadoAsistencia(registro.estado).estado
    if(estado==='PENDIENTE')continue
    confirmadas++
    if(estado==='PRESENTE'||estado==='JUSTIFICADO')asistidas++
  }
  return {confirmadas,asistidas,porcentaje:confirmadas?Math.round(100*asistidas/confirmadas):null}
}
