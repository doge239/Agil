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
export function getNavItems(path:string) {return path.startsWith('/unidad')?unidadNavItems:path.startsWith('/docente')?docenteNavItems:navItems}
