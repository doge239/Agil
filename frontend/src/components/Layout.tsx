import { Outlet } from 'react-router-dom'
import { MobileNav } from './MobileNav'
import { Navbar } from './Navbar'
import { Sidebar } from './Sidebar'

export function Layout() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <MobileNav />
      <div className="mx-auto flex max-w-6xl gap-6 px-4 py-6">
        <Sidebar />
        <main className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
