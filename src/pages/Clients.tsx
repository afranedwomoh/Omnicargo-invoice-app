import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Modal } from '../components/Modal/Modal'
import { 
  Plus, 
  Search,
  Users,
  Mail,
  Phone,
  MapPin,
  Edit,
  Trash2,
  FileText,
  DollarSign,
  Calendar,
  CheckCircle,
  Clock,
  AlertCircle
} from 'lucide-react'
import { format } from 'date-fns'

interface Client {
  id: string
  name: string
  email: string | null
  phone: string | null
  address: string | null
  tax_id: string | null
  created_at: string
  updated_at: string
}

interface ClientInvoice {
  id: string
  invoice_number: string
  total_amount: number
  status: string
  issue_date: string
  due_date: string
  currency: string
}

interface ClientDetails {
  client: Client
  invoices: ClientInvoice[]
  totalInvoiced: number
  totalPaid: number
  totalPending: number
}

export const Clients: React.FC = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [selectedClient, setSelectedClient] = useState<ClientDetails | null>(null)
  const [showClientDetails, setShowClientDetails] = useState(false)
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    tax_id: ''
  })

  useEffect(() => {
    if (user) {
      fetchClients()
    }
  }, [user])

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('name')

      if (error) throw error
      setClients(data || [])
    } catch (error) {
      console.error('Error fetching clients:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchClientDetails = async (clientId: string) => {
    try {
      // Fetch client info
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('*')
        .eq('id', clientId)
        .single()

      if (clientError) throw clientError

      // Fetch client invoices
      const { data: invoicesData, error: invoicesError } = await supabase
        .from('invoices')
        .select('id, invoice_number, total_amount, status, issue_date, due_date, currency')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })

      if (invoicesError) throw invoicesError

      const invoices = invoicesData || []
      const totalInvoiced = invoices.reduce((sum, inv) => sum + inv.total_amount, 0)
      const totalPaid = invoices.filter(inv => inv.status === 'paid').reduce((sum, inv) => sum + inv.total_amount, 0)
      const totalPending = totalInvoiced - totalPaid

      setSelectedClient({
        client: clientData,
        invoices,
        totalInvoiced,
        totalPaid,
        totalPending
      })
      setShowClientDetails(true)
    } catch (error) {
      console.error('Error fetching client details:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim()) {
      alert('Please enter client name')
      return
    }

    try {
      if (editingClient) {
        // Update existing client
        const { error } = await supabase
          .from('clients')
          .update({
            name: formData.name,
            email: formData.email || null,
            phone: formData.phone || null,
            address: formData.address || null,
            tax_id: formData.tax_id || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingClient.id)

        if (error) throw error
      } else {
        // Create new client
        const { error } = await supabase
          .from('clients')
          .insert({
            user_id: user?.id,
            name: formData.name,
            email: formData.email || null,
            phone: formData.phone || null,
            address: formData.address || null,
            tax_id: formData.tax_id || null
          })

        if (error) throw error
      }

      setFormData({ name: '', email: '', phone: '', address: '', tax_id: '' })
      setShowForm(false)
      setEditingClient(null)
      fetchClients()
    } catch (error) {
      console.error('Error saving client:', error)
      alert('Error saving client. Please try again.')
    }
  }

  const handleEdit = (client: Client) => {
    setEditingClient(client)
    setFormData({
      name: client.name,
      email: client.email || '',
      phone: client.phone || '',
      address: client.address || '',
      tax_id: client.tax_id || ''
    })
    setShowForm(true)
  }

  const handleDelete = async (clientId: string) => {
    if (!confirm('Are you sure you want to delete this client?')) {
      return
    }

    try {
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', clientId)

      if (error) throw error
      fetchClients()
    } catch (error) {
      console.error('Error deleting client:', error)
      alert('Error deleting client. Please try again.')
    }
  }

  const resetForm = () => {
    setFormData({ name: '', email: '', phone: '', address: '', tax_id: '' })
    setShowForm(false)
    setEditingClient(null)
  }

  const handleCreateInvoice = (clientId: string) => {
    navigate(`/invoices/new?client=${clientId}`)
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

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (client.email && client.email.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
          <p className="text-gray-600">Manage your client information</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors font-medium"
        >
          <Plus className="w-5 h-5 mr-2" />
          Add Client
        </button>
      </div>

      {/* Search */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search clients..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Client Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              {editingClient ? 'Edit Client' : 'Add New Client'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Client Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Enter client name"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="client@example.com"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="+1 (555) 000-0000"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tax ID
                </label>
                <input
                  type="text"
                  value={formData.tax_id}
                  onChange={(e) => setFormData({ ...formData, tax_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Tax identification number"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Address
                </label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Enter client address"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors"
                >
                  {editingClient ? 'Update Client' : 'Add Client'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Client Details Modal */}
      <Modal
        isOpen={showClientDetails}
        onClose={() => setShowClientDetails(false)}
        title="Client Details"
        size="xl"
      >
        {selectedClient && (
          <div className="p-6">
            {/* Client Info Header */}
            <div className="bg-gradient-to-r from-primary-500 to-secondary-500 p-6 rounded-lg text-white mb-6">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-bold mb-2">{selectedClient.client.name}</h2>
                  <div className="space-y-1 text-primary-100">
                    {selectedClient.client.email && (
                      <div className="flex items-center">
                        <Mail className="w-4 h-4 mr-2" />
                        <span>{selectedClient.client.email}</span>
                      </div>
                    )}
                    {selectedClient.client.phone && (
                      <div className="flex items-center">
                        <Phone className="w-4 h-4 mr-2" />
                        <span>{selectedClient.client.phone}</span>
                      </div>
                    )}
                    {selectedClient.client.address && (
                      <div className="flex items-start">
                        <MapPin className="w-4 h-4 mr-2 mt-0.5" />
                        <span>{selectedClient.client.address}</span>
                      </div>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleCreateInvoice(selectedClient.client.id)}
                  className="bg-white text-primary-600 px-4 py-2 rounded-lg font-medium hover:bg-primary-50 transition-colors"
                >
                  Create Invoice
                </button>
              </div>
            </div>

            {/* Financial Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-blue-600 font-medium">Total Invoiced</p>
                    <p className="text-2xl font-bold text-blue-900">${selectedClient.totalInvoiced.toFixed(2)}</p>
                  </div>
                  <DollarSign className="w-8 h-8 text-blue-500" />
                </div>
              </div>
              
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-green-600 font-medium">Total Paid</p>
                    <p className="text-2xl font-bold text-green-900">${selectedClient.totalPaid.toFixed(2)}</p>
                  </div>
                  <CheckCircle className="w-8 h-8 text-green-500" />
                </div>
              </div>
              
              <div className="bg-yellow-50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-yellow-600 font-medium">Outstanding</p>
                    <p className="text-2xl font-bold text-yellow-900">${selectedClient.totalPending.toFixed(2)}</p>
                  </div>
                  <Clock className="w-8 h-8 text-yellow-500" />
                </div>
              </div>
            </div>

            {/* Invoices List */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Invoices ({selectedClient.invoices.length})
              </h3>
              
              {selectedClient.invoices.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No invoices found for this client</p>
                  <button
                    onClick={() => handleCreateInvoice(selectedClient.client.id)}
                    className="mt-4 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
                  >
                    Create First Invoice
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedClient.invoices.map((invoice) => (
                    <div key={invoice.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className="flex items-center space-x-4">
                        {getStatusIcon(invoice.status)}
                        <div>
                          <p className="font-medium text-gray-900">#{invoice.invoice_number}</p>
                          <p className="text-sm text-gray-600">
                            {format(new Date(invoice.issue_date), 'MMM dd, yyyy')}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">
                          {getCurrencySymbol(invoice.currency)}{invoice.total_amount.toFixed(2)}
                        </p>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getStatusColor(invoice.status)}`}>
                          {invoice.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Clients Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredClients.length === 0 ? (
          <div className="col-span-full bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 text-lg mb-2">No clients found</p>
            <p className="text-gray-400 mb-6">Add your first client to get started</p>
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors font-medium"
            >
              <Plus className="w-5 h-5 mr-2" />
              Add Client
            </button>
          </div>
        ) : (
          filteredClients.map((client) => (
            <div key={client.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer">
              <div 
                className="flex items-start justify-between mb-4"
                onClick={() => fetchClientDetails(client.id)}
              >
                <div className="flex items-center">
                  <div className="p-3 bg-primary-100 rounded-xl mr-3">
                    <Users className="w-6 h-6 text-primary-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 hover:text-primary-600 transition-colors">{client.name}</h3>
                    <p className="text-sm text-gray-500">
                      Added {new Date(client.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2 mb-4" onClick={() => fetchClientDetails(client.id)}>
                {client.email && (
                  <div className="flex items-center text-sm text-gray-600">
                    <Mail className="w-4 h-4 mr-2" />
                    <span className="truncate">{client.email}</span>
                  </div>
                )}
                {client.phone && (
                  <div className="flex items-center text-sm text-gray-600">
                    <Phone className="w-4 h-4 mr-2" />
                    <span>{client.phone}</span>
                  </div>
                )}
                {client.address && (
                  <div className="flex items-start text-sm text-gray-600">
                    <MapPin className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                    <span className="line-clamp-2">{client.address}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleEdit(client)
                    }}
                    className="text-gray-400 hover:text-primary-600 p-1 rounded transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDelete(client.id)
                    }}
                    className="text-gray-400 hover:text-red-600 p-1 rounded transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <button 
                  onClick={(e) => {
                    e.stopPropagation()
                    handleCreateInvoice(client.id)
                  }}
                  className="flex items-center text-sm text-primary-600 hover:text-primary-700 font-medium"
                >
                  <FileText className="w-4 h-4 mr-1" />
                  Create Invoice
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
