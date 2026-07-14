import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { 
  DollarSign, 
  FileText, 
  Users, 
  TrendingUp,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  Globe
} from 'lucide-react'
import { format } from 'date-fns'

interface DashboardStats {
  totalInvoices: number
  totalRevenue: number
  totalClients: number
  pendingInvoices: number
}

interface RecentInvoice {
  id: string
  invoice_number: string
  client_name: string
  total_amount: number
  status: string
  due_date: string
  currency: string
  user_name: string | null
}

export const Dashboard: React.FC = () => {
  const { user } = useAuth()
  const [stats, setStats] = useState<DashboardStats>({
    totalInvoices: 0,
    totalRevenue: 0,
    totalClients: 0,
    pendingInvoices: 0
  })
  const [recentInvoices, setRecentInvoices] = useState<RecentInvoice[]>([])
  const [loading, setLoading] = useState(true)
  const [userProfile, setUserProfile] = useState<{ user_name: string | null }>({ user_name: null })

  useEffect(() => {
    if (user) {
      fetchGlobalDashboardData()
      fetchUserProfile()
    }
  }, [user])

  const fetchUserProfile = async () => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('user_name')
        .eq('id', user?.id)
        .maybeSingle()

      if (error && error.code !== 'PGRST116') {
        throw error
      }

      if (profile) {
        setUserProfile(profile)
      }
    } catch (error) {
      console.error('Error fetching user profile:', error)
    }
  }

  const fetchGlobalDashboardData = async () => {
    try {
      const { data: allInvoices, error: invoicesError } = await supabase
        .from('invoices')
        .select('total_amount, status, currency')

      if (invoicesError) {
        console.error('Error fetching global invoices:', invoicesError)
        throw invoicesError
      }

      const { count: allClientsCount, error: clientsError } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true })

      if (clientsError) {
        console.error('Error fetching global clients count:', clientsError)
        throw clientsError
      }

      const { data: recentInvoicesData, error: recentError } = await supabase
        .from('invoices')
        .select(`
          id,
          invoice_number,
          total_amount,
          status,
          due_date,
          currency,
          clients(name),
          recipient_name,
          profiles!inner(user_name)
        `)
        .order('created_at', { ascending: false })
        .limit(8)

      if (recentError) {
        console.error('Error fetching global recent invoices:', recentError)
        throw recentError
      }

      const globalInvoices = allInvoices || []
      const totalRevenue = globalInvoices.reduce((sum, invoice) => sum + invoice.total_amount, 0)
      const pendingInvoices = globalInvoices.filter(invoice => invoice.status === 'sent').length
      const overdueInvoices = globalInvoices.filter(invoice => invoice.status === 'overdue').length

      setStats({
        totalInvoices: globalInvoices.length,
        totalRevenue,
        totalClients: allClientsCount || 0,
        pendingInvoices: pendingInvoices + overdueInvoices
      })

      const formattedRecentInvoices = recentInvoicesData?.map(invoice => ({
        id: invoice.id,
        invoice_number: invoice.invoice_number,
        client_name: (invoice.clients as any)?.name || (invoice as any).recipient_name || 'Unknown Client',
        total_amount: invoice.total_amount,
        status: invoice.status,
        due_date: invoice.due_date,
        currency: invoice.currency || 'USD',
        user_name: (invoice.profiles as any)?.user_name || 'Unknown User'
      })) || []

      setRecentInvoices(formattedRecentInvoices)

      console.log(`Global dashboard loaded:`, {
        totalInvoices: globalInvoices.length,
        totalRevenue,
        totalClients: allClientsCount || 0,
        pendingInvoices: pendingInvoices + overdueInvoices,
        currentUser: user.email
      })

    } catch (error) {
      console.error('Error fetching global dashboard data:', error)
      setStats({
        totalInvoices: 0,
        totalRevenue: 0,
        totalClients: 0,
        pendingInvoices: 0
      })
      setRecentInvoices([])
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'sent':
        return <Clock className="w-4 h-4 text-yellow-500" />
      case 'overdue':
        return <AlertCircle className="w-4 h-4 text-red-500" />
      default:
        return <FileText className="w-4 h-4 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800'
      case 'sent':
        return 'bg-yellow-100 text-yellow-800'
      case 'overdue':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getCurrencySymbol = (currency: string): string => {
    switch (currency) {
      case 'USD': return '$'
      case 'EUR': return '€'
      case 'GBP': return '£'
      case 'GHS': return '₵'
      default: return '$'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back{userProfile.user_name ? `, ${userProfile.user_name}` : ''}!
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Link 
          to="/invoices" 
          className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Platform Revenue</p>
              <p className="text-2xl font-bold text-gray-900">
                ${stats.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-xl group-hover:bg-green-200 transition-colors">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </Link>

        <Link 
          to="/invoices" 
          className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Platform Invoices</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalInvoices.toLocaleString()}</p>
            </div>
            <div className="p-3 bg-primary-100 rounded-xl group-hover:bg-primary-200 transition-colors">
              <FileText className="w-6 h-6 text-primary-600" />
            </div>
          </div>
        </Link>

        <Link 
          to="/clients" 
          className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Platform Clients</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalClients.toLocaleString()}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-xl group-hover:bg-blue-200 transition-colors">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </Link>

        <Link 
          to="/invoices?status=sent" 
          className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Platform Pending Invoices</p>
              <p className="text-2xl font-bold text-gray-900">{stats.pendingInvoices.toLocaleString()}</p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-xl group-hover:bg-yellow-200 transition-colors">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <h2 className="text-lg font-semibold text-gray-900">Recent Platform Activity</h2>
              <Globe className="w-4 h-4 text-primary-500" />
            </div>
            <TrendingUp className="w-5 h-5 text-gray-400" />
          </div>
          <p className="text-sm text-gray-600 mt-1">Latest invoices created across all users</p>
        </div>
        <div className="p-6">
          {recentInvoices.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No platform activity yet</p>
              <p className="text-sm text-gray-400 mb-4">Be the first to create an invoice!</p>
              <Link
                to="/invoices/new"
                className="inline-flex items-center px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors font-medium"
              >
                <FileText className="w-4 h-4 mr-2" />
                Create Invoice
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {recentInvoices.map((invoice) => (
                <Link
                  key={invoice.id}
                  to="/invoices"
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    {getStatusIcon(invoice.status)}
                    <div>
                      <p className="font-medium text-gray-900">#{invoice.invoice_number}</p>
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <span>{invoice.client_name}</span>
                        <span>•</span>
                        <span className="text-primary-600 font-medium">by {invoice.user_name}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">
                      {getCurrencySymbol(invoice.currency)}{invoice.total_amount.toFixed(2)}
                    </p>
                    <div className="flex items-center space-x-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getStatusColor(invoice.status)}`}>
                        {invoice.status}
                      </span>
                      <span className="text-xs text-gray-500">
                        Due {format(new Date(invoice.due_date), 'MMM d')}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
              
              {recentInvoices.length >= 8 && (
                <div className="text-center pt-4">
                  <Link
                    to="/invoices"
                    className="text-primary-600 hover:text-primary-700 font-medium text-sm"
                  >
                    View all platform invoices →
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
