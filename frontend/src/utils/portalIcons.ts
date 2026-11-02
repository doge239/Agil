export const trazos = {
  sun: 'M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M5 19l1.5-1.5M17.5 6.5 19 5',
  moon: 'M21 13a9 9 0 1 1-10-10 7 7 0 0 0 10 10Z',
  home: 'm3 10 9-7 9 7M5 9v11h5v-6h4v6h5V9',
  user: 'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM4 21v-2a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v2',
  book: 'M12 5v16M12 5C8 2 4 3 2 4v15c4-2 7-1 10 2 3-3 6-4 10-2V4c-2-1-6-2-10 1Z',
  calendar: 'M4 5h16v16H4ZM8 2v6M16 2v6M4 11h16M8 15h2M14 15h2',
  chart: 'M4 3v17h17M8 16v-4M13 16V8M18 16V5',
  check: 'm5 12 4 4L19 6M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11',
  file: 'M14 3H5v18h14V8ZM14 3v6h5M8 13h8M8 17h5',
  map: 'm3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2ZM9 3v16M15 5v16',
  clipboard: 'M9 4H5v17h14V4h-4M9 2h6v5H9ZM8 12h8M8 16h5',
  graduation: 'm2 9 10-5 10 5-10 5ZM6 11v6c4 3 8 3 12 0v-6M22 9v8',
  arrow: 'M4 12h16m-6-6 6 6-6 6',
  logout: 'M9 4H4v16h5M10 12h11m-5-5 5 5-5 5',
  expand: 'M8 3H3v5M16 3h5v5M21 16v5h-5M8 21H3v-5',
  close: 'm6 6 12 12M18 6 6 18',
  chevron: 'm9 5 7 7-7 7',
  shield: 'm12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6Zm-4 9 3 3 5-6',
}
export type IconName = keyof typeof trazos
export function iconoRuta(ruta: string): IconName {
  if (ruta.includes('periodos')) return 'calendar'
  if (ruta.includes('auditoria')) return 'shield'
  if (ruta.endsWith('/perfil')) return 'user'
  if (ruta.includes('horario')) return 'calendar'
  if (ruta.includes('avance')) return 'map'
  if (ruta.includes('notas')) return 'chart'
  if (ruta.includes('asistencia')) return 'check'
  if (ruta.includes('certificados')) return 'file'
  if (ruta.includes('solicitudes') || ruta.includes('restricciones')) return 'clipboard'
  if (ruta.includes('encuestas')) return 'clipboard'
  if (ruta.includes('carreras')) return 'graduation'
  if (ruta.includes('asignaturas') || ruta.includes('inscripcion')) return 'book'
  return 'home'
}
