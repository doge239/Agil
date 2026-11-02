export interface NavItem {
  to: string
  label: string
}

export const navItems: NavItem[] = [
  { to: '/', label: 'Inicio' },
  { to: '/perfil', label: 'Mi perfil' },
  { to: '/asignaturas', label: 'Mis asignaturas' },
  { to: '/inscripcion', label: 'Inscripción' },
  { to: '/horario', label: 'Horario' },
  { to: '/notas', label: 'Notas' },
  { to: '/asistencia', label: 'Asistencia' },
  { to: '/solicitudes', label: 'Solicitudes' },
  { to: '/avance', label: 'Avance curricular' },
  { to: '/encuestas', label: 'Encuesta docente' },
  { to: '/certificados', label: 'Certificados' },
  { to: '/carreras', label: 'Carreras' },
]
export const docenteNavItems: NavItem[] = [
  {to:'/docente',label:'Mis cursos'},
  {to:'/docente/perfil',label:'Mi perfil'},
]
export const unidadNavItems: NavItem[] = [
  {to:'/unidad',label:'Cursos de la unidad'},
  {to:'/unidad/restricciones',label:'Restricciones'},
  {to:'/unidad/solicitudes',label:'Solicitudes'},
  {to:'/unidad/perfil',label:'Mi perfil'},
]
export const generalNavItems: NavItem[] = [
  {to:'/general',label:'Administración General'},
  {to:'/general/carreras',label:'Carreras y mallas'},
  {to:'/general/asignaturas',label:'Catálogo de asignaturas'},
  {to:'/general/cursos',label:'Gestión de cursos'},
  {to:'/general/periodos',label:'Períodos e inscripción'},
  {to:'/general/restricciones',label:'Restricciones'},
  {to:'/general/solicitudes',label:'Solicitudes'},
  {to:'/general/auditoria',label:'Auditoría'},
]
export function getNavItems(path:string) {return path.startsWith('/general')?generalNavItems:path.startsWith('/unidad')?unidadNavItems:path.startsWith('/docente')?docenteNavItems:navItems}
