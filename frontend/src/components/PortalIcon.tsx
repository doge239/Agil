import type { CSSProperties } from 'react'
import { trazos } from '../utils/portalIcons'
import type { IconName } from '../utils/portalIcons'

export function PortalIcon({ name, className, style }: { name: IconName; className?: string; style?: CSSProperties }) {
  return <svg className={className} style={style} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={trazos[name]} /></svg>
}
