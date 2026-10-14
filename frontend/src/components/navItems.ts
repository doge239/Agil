export interface NavItem {
  to: string
  label: string
}

export const navItems: NavItem[] = [
  { to: '/', label: 'Inicio' },
  { to: '/perfil', label: 'Mi perfil' },
  { to: '/asignaturas', label: 'Mis asignaturas' },
  { to: '/horario', label: 'Horario' },
  { to: '/notas', label: 'Notas' },
  { to: '/asistencia', label: 'Asistencia' },
  { to: '/carreras', label: 'Carreras' },
]
