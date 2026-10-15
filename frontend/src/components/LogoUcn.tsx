import logoUcn from '../assets/logo-ucn.png'
import { cn } from '../utils/cn'

interface LogoUcnProps {
  className?: string
  alt?: string
}

export function LogoUcn({ className, alt = 'UCN' }: LogoUcnProps) {
  return <img src={logoUcn} alt={alt} className={cn('object-contain', className)} />
}
