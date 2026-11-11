import api from './axios'
export interface InformacionAsistenciaQr {
  clase:{id_clase:number;fecha:string;seccion:number;nombre:string;codigo:string};
  expira:string;estado:string|null;tiene_rut:boolean;
}
export async function consultarAsistenciaQr(token:string) {return (await api.get<InformacionAsistenciaQr>(`/academico/asistencia-qr/${encodeURIComponent(token)}`)).data}
export async function marcarAsistenciaQr(token:string,rut:string) {return (await api.post<{registrada:boolean;estado:string;mensaje:string}>(`/academico/asistencia-qr/${encodeURIComponent(token)}`,{rut})).data}
