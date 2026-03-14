import Link from 'next/link';
import { ReactNode } from 'react';

// Ensure this layout is dynamic
export const dynamic = 'force-dynamic';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-900 text-white shadow-lg">
        <div className="p-6">
          <h1 className="text-2xl font-bold">🅿️ ParkPilot</h1>
          <p className="text-sm text-gray-400 mt-1">Market Intelligence</p>
        </div>

        <nav className="mt-8">
          <NavLink href="/dashboard">Dashboard</NavLink>
          <NavLink href="/dashboard/venues">Venues</NavLink>
          <NavLink href="/dashboard/events">Events</NavLink>
          <NavLink href="/dashboard/observations">Observations</NavLink>
          <NavLink href="/dashboard/opportunities">Opportunities</NavLink>
          <NavLink href="/dashboard/inventory">Inventory</NavLink>
          <NavLink href="/dashboard/sales">Sales</NavLink>
          <NavLink href="/dashboard/alerts">Alerts</NavLink>
          <NavLink href="/dashboard/settings">Settings</NavLink>
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white shadow">
          <div className="px-6 py-4 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-800">ParkPilot Dashboard</h2>
            <div className="text-sm text-gray-600">
              Logged in as <span className="font-semibold">Admin</span>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-auto">
          <div className="p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}

function NavLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="block px-6 py-2 text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
    >
      {children}
    </Link>
  );
}
