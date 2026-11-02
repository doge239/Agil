import { useState } from 'react'
import type { AsignaturaAvance } from '../types/api'

import { SEMESTRES } from '../utils/curriculo'
const estados = { APROBADA: 'Aprobado', EN_CURSO: 'Inscrito', REPROBADA: 'Reprobado', PENDIENTE: 'Sin cursar' }
const disponibles = { DISPONIBLE: 'Disponible académicamente', BLOQUEADA: 'Bloqueado por requisitos', POR_CONFIRMAR: 'Requisitos por confirmar' }
function indicador(a: AsignaturaAvance) {
  if (a.estado === 'APROBADA') return '✓'
  if (a.estado === 'EN_CURSO') return '◷'
  if (a.estado === 'REPROBADA') return '×'
  return a.disponibilidad === 'BLOQUEADA' ? '▣' : a.disponibilidad === 'POR_CONFIRMAR' ? '?' : '○'
}
export function MallaGrid({ asignaturas, visibles, seleccion, onSeleccionar }: {
  asignaturas: AsignaturaAvance[]; visibles: AsignaturaAvance[]; seleccion: number | null; onSeleccionar: (id: number) => void
}) {
  const [sobreRamo, setSobreRamo] = useState<number | null>(null)
  const [conFoco, setConFoco] = useState<number | null>(null)
  const explorada = sobreRamo ?? conFoco ?? seleccion
  const seleccionada = asignaturas.find(a => a.id_asignatura === explorada)
  return <div className="avance-scroll" tabIndex={0} role="region" aria-label="Malla curricular por semestres, desplazamiento horizontal">
    <div className="avance-malla">
      {SEMESTRES.map((s, i) => {
        const ramos = visibles.filter(a => a.semestre === i + 1)
        const total = asignaturas.filter(a => a.semestre === i + 1)
        return <section key={s} id={`avance-semestre-${i + 1}`} className="avance-semestre" aria-label={`Semestre ${s}`}>
          <h2><span>{s}</span><small>{total.filter(a => a.estado === 'APROBADA').length}/{total.length} aprobados</small></h2>
          <div className={`avance-ramos ${i === 7 ? 'avance-ramos-final' : ''}`}>
            {ramos.map(a => {
              const relacion = a.id_asignatura === explorada ? 'seleccionada' : seleccionada?.prerrequisitos.some(r => r.id_asignatura === a.id_asignatura) ? 'prerrequisito' : seleccionada?.habilita.some(r => r.id_asignatura === a.id_asignatura) ? 'relacionada' : ''
              const estado = a.estado === 'PENDIENTE' ? a.disponibilidad.toLowerCase() : a.estado.toLowerCase()
              return <button key={a.id_asignatura} className={`avance-ramo estado-${estado} ${relacion}`}
                onPointerEnter={e => { if (e.pointerType !== 'touch') setSobreRamo(a.id_asignatura) }}
                onPointerLeave={() => setSobreRamo(null)}
                onFocus={e => { if (e.currentTarget.matches(':focus-visible')) setConFoco(a.id_asignatura) }}
                onBlur={() => setConFoco(null)}
                onClick={() => { setSobreRamo(null); setConFoco(null); onSeleccionar(a.id_asignatura) }}
                aria-pressed={a.id_asignatura === seleccion} aria-label={`${a.elegida?.nombre ?? a.asignatura}. ${estados[a.estado]}. ${disponibles[a.disponibilidad]}. Ver requisitos`}>
                <span className="avance-codigo">{a.elegida ? a.elegida.codigo ?? 'Código por confirmar' : a.codigo ?? 'Código por confirmar'}</span>
                <strong>{a.elegida?.nombre ?? a.asignatura}</strong>
                {a.espacio_electivo && <span className="avance-espacio">{a.elegida ? a.asignatura : 'Espacio de electivo'}</span>}
                <span className="avance-ramo-pie"><span>{a.nota !== null ? `NF: ${a.nota.toLocaleString('es-CL', { minimumFractionDigits: 1 })}` : 'NF: —'}</span><span>{a.creditos !== null ? `${a.creditos} SCT` : 'SCT por confirmar'}</span></span>
                <span className="avance-estado"><b aria-hidden="true">{indicador(a)}</b>{a.estado === 'PENDIENTE' ? (a.disponibilidad === 'BLOQUEADA' ? 'Bloqueado' : a.disponibilidad === 'POR_CONFIRMAR' ? 'Por confirmar' : 'Disponible') : estados[a.estado]}</span>
              </button>
            })}
            {!ramos.length && <p className="avance-sin-coincidencias">{total.length ? 'Sin coincidencias' : 'Sin ramos registrados'}</p>}
          </div>
        </section>
      })}
    </div>

  </div>
}
