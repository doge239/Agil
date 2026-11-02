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
