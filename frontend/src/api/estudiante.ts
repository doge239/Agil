import api from './axios'
import type { Avance, Encuesta, OfertaCurso, Restriccion, Solicitud } from '../types/api'
export async function getOferta(periodo?:number) { return (await api.get<{oferta:OfertaCurso[]}>('/academico/oferta',{params:{periodo}})).data }
export async function inscribir(id_curso:number) { return (await api.post('/academico/inscripciones',{id_curso})).data }
export async function unirseListaEspera(id_curso:number) { return (await api.post('/academico/lista-espera',{id_curso})).data }
export async function salirListaEspera(id_curso:number) { return (await api.delete(`/academico/lista-espera/${id_curso}`)).data }
export async function retirarInscripcion(id_curso:number) { return (await api.delete(`/academico/inscripciones/${id_curso}`)).data }
export async function getAvance() { return (await api.get<Avance>('/academico/avance-curricular')).data }
export async function getSolicitudes() {
  const [r,s]=await Promise.all([api.get<{restricciones:Restriccion[]}>('/academico/restricciones'),api.get<{solicitudes:Solicitud[]}>('/academico/solicitudes')])
  return {...r.data,...s.data}
}
export async function solicitar(id_restriccion:number,motivo:string) { return (await api.post('/academico/solicitudes',{id_restriccion,motivo})).data }
export async function getEncuestas(periodo?:number) { return (await api.get<{encuestas:Encuesta[]}>('/academico/encuestas',{params:{periodo}})).data }
export async function responder(id:number,respuestas:Record<number,number>) { return (await api.post(`/academico/encuestas/${id}/respuestas`,{respuestas})).data }
export async function getCertificados() { return (await api.get<{certificados:{tipo:string;nombre:string}[];demostracion:boolean}>('/academico/certificados')).data }
export async function descargar(tipo:string,periodo?:number) {
  try {
    const response=await api.get<Blob>(`/academico/certificados/${tipo}`,{params:{periodo},responseType:'blob'})
    const url=URL.createObjectURL(response.data)
    const link=document.createElement('a'); link.href=url; link.download=`${tipo.toLowerCase()}-${periodo}.pdf`
    document.body.appendChild(link); link.click(); link.remove(); setTimeout(()=>URL.revokeObjectURL(url),1000)
  } catch(error) {
    if (error && typeof error==='object' && 'response' in error) {
      const r=(error as {response?:{data?:Blob}}).response
      if(r?.data instanceof Blob) {
        const raw=await r.data.text()
        try { const parsed=JSON.parse(raw); throw new Error(parsed.mensaje||'No se pudo descargar el documento') }
        catch(e) { if(e instanceof SyntaxError) throw new Error('No se pudo descargar el documento'); throw e }
      }
    }
    throw error
  }
}
