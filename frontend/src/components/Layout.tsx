import { Outlet, useLocation } from 'react-router-dom'
import { MobileNav } from './MobileNav'
import { Navbar } from './Navbar'
import { Sidebar } from './Sidebar'
import { PeriodoProvider } from '../context/PeriodoContext'

export function Layout() {
  const ruta=useLocation().pathname
  const general=ruta.startsWith('/general')
  return (
    <div className="portal-shell min-h-screen">
      <a className="portal-skip-link" href="#contenido-principal">Saltar al contenido</a>
      <Navbar />
      <MobileNav />
      <div className="portal-stage">
        <Sidebar />
        <main id="contenido-principal" className="portal-main min-w-0 flex-1" tabIndex={-1}>
          {general?<Outlet/>:<PeriodoProvider><Outlet /></PeriodoProvider>}
          {ruta!=='/avance'&&<footer className="portal-footer"><span>Banner UCN</span><span>Universidad Católica del Norte</span></footer>}
        </main>
      </div>
    </div>
  )
}
