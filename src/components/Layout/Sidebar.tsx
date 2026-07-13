import React from 'react'
import { NavLink } from 'react-router-dom'
import { 
  LayoutDashboard, 
  FileText, 
  Users, 
  Settings,
  Plus,
  TrendingUp,
  Package
} from 'lucide-react'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Invoices', href: '/invoices', icon: FileText },
  { name: 'Clients', href: '/clients', icon: Users },
  { name: 'Analysis', href: '/analysis', icon: TrendingUp },
  { name: 'Shipment Pricing', href: '/shipment-pricing', icon: Package },
  { name: 'Settings', href: '/settings', icon: Settings },
]

export const Sidebar: React.FC = () => {
  return (
    <div className="w-64 bg-secondary-900 min-h-screen">
      <div className="p-6">
        <NavLink
          to="/invoices/new"
          className="w-full flex items-center justify-center px-4 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors font-medium"
        >
          <Plus className="w-5 h-5 mr-2" />
          New Invoice
        </NavLink>
      </div>
      
      <nav className="px-3">
        {navigation.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            className={({ isActive }) =>
              `flex items-center px-3 py-3 text-sm font-medium rounded-lg mb-1 transition-colors ${
                isActive
                  ? 'bg-primary-500 text-white'
                  : 'text-gray-300 hover:bg-secondary-800 hover:text-white'
              }`
            }
          >
            <item.icon className="w-5 h-5 mr-3" />
            {item.name}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
