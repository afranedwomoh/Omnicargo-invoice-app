import React, { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { generateInvoicePDF, shareInvoiceViaWhatsApp, copyInvoiceImageToClipboard } from '../utils/pdfGenerator'
import { sendEmailToClient } from '../utils/emailService'
import { useToast } from '../hooks/useToast'
import { ToastContainer } from '../components/Toast/ToastContainer'
import { Modal } from '../components/Modal/Modal'
import { ConfirmModal } from '../components/Modal/ConfirmModal'
import { InvoicePreviewModal } from '../components/Modal/InvoicePreviewModal'
import { EmailInvoiceModal } from '../components/Modal/EmailInvoiceModal'
import { 
  Plus, 
  FileText, 
  Search,
  Filter,
  Eye,
  Download,
  Send,
  CheckCircle,
  Clock,
  AlertCircle,
  Edit,
  Trash2,
  MessageCircle,
  Share,
  DollarSign,
  Copy
} from 'lucide-react'
import { format } from 'date-fns'

interface Invoice {
  id: string
  invoice_number: string
  client_name: string
  client_email: string | null
  client_phone: string | null
  total_amount: number
  status: 'draft' | 'sent' | 'paid' | 'overdue'
  issue_date: string
  due_date: string
  created_at: string
  currency: string
  user_id: string
}

interface InvoiceDetails {
  id: string
  invoice_number: string
  issue_date: string
  due_date: string
  status: string
  currency: string
  subtotal: number
  tax_rate: number
  tax_amount: number
  discount_amount: number
  total_amount: number
  notes: string | null
  payment_instructions: string | null
  signature?: string | null
  client: {
    name: string
    email: string | null
    phone: string | null
    address: string | null
    tax_id: string | null
  }
  items: Array<{
    description: string
    quantity: number
    unit_price: number
    total: number
    shipment_type?: string
    item_quantity?: number
    cbm?: number
  }>
  business: {
    name: string | null
    email: string | null
    phone: string | null
    address: string | null
    tax_id: string | null
  }
}

export const Invoices: React.FC = () => {
  const { user } = useAuth()
  const { toasts, removeToast, showSuccess, showError, showInfo } = useToast()
  const [searchParams] = useSearchParams()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>(searchParams.get('status') || 'all')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  
  // Modal states
  const [previewModal, setPreviewModal] = useState<{ isOpen: boolean; invoice: InvoiceDetails | null }>({
    isOpen: false,
    invoice: null
  })
  const [emailModal, setEmailModal] = useState<{ 
    isOpen: boolean; 
    invoice: Invoice | null;
    invoiceDetails: InvoiceDetails | null;
  }>({
    isOpen: false,
    invoice: null,
    invoiceDetails: null
  })
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean
    type: 'delete' | 'markPaid' | null
    invoice: Invoice | null
    loading: boolean
  }>({
    isOpen: false,
    type: null,
    invoice: null,
    loading: false
  })
  const [businessName, setBusinessName] = useState('OmniCargo Solutions')

  useEffect(() => {
    if (user) {
      fetchInvoices()
      fetchBusinessProfile()
    }
  }, [user])

  const fetchBusinessProfile = async () => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('business_name')
        .eq('id', user?.id)
        .maybeSingle()

      if (error && error.code !== 'PGRST116') {
        throw error
      }

      if (profile?.business_name) {
        setBusinessName(profile.business_name)
      }
    } catch (error) {
      console.error('Error fetching business profile:', error)
    }
  }

  const fetchInvoices = async () => {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          id,
          invoice_number,
          total_amount,
          status,
          issue_date,
          due_date,
          created_at,
          currency,
          user_id,
          clients!inner(name, email, phone)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error

      const formattedInvoices = data?.map(invoice => ({
        id: invoice.id,
        invoice_number: invoice.invoice_number,
        client_name: (invoice.clients as any)?.name || 'Unknown Client',
        client_email: (invoice.clients as any)?.email || null,
        client_phone: (invoice.clients as any)?.phone || null,
        total_amount: invoice.total_amount,
        status: invoice.status as 'draft' | 'sent' | 'paid' | 'overdue',
        issue_date: invoice.issue_date,
        due_date: invoice.due_date,
        created_at: invoice.created_at,
        currency: invoice.currency || 'USD',
        user_id: invoice.user_id
      })) || []

      setInvoices(formattedInvoices)
    } catch (error) {
      console.error('Error fetching invoices:', error)
      showError('Error', 'Failed to fetch invoices. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const fetchInvoiceDetails = async (invoiceId: string): Promise<InvoiceDetails | null> => {
    try {
      // Fetch invoice with client details
      const { data: invoiceData, error: invoiceError } = await supabase
        .from('invoices')
        .select(`
          *,
          clients!inner(*)
        `)
        .eq('id', invoiceId)
        .single()

      if (invoiceError) throw invoiceError

      // Fetch business profile separately using user_id
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', invoiceData.user_id)
        .maybeSingle()

      if (profileError && profileError.code !== 'PGRST116') {
        throw profileError
      }

      // Fetch invoice items
      const { data: itemsData, error: itemsError } = await supabase
        .from('invoice_items')
        .select('*')
        .eq('invoice_id', invoiceId)

      if (itemsError) throw itemsError

      return {
        id: invoiceData.id,
        invoice_number: invoiceData.invoice_number,
        issue_date: invoiceData.issue_date,
        due_date: invoiceData.due_date,
        status: invoiceData.status,
        currency: invoiceData.currency,
        subtotal: invoiceData.subtotal,
        tax_rate: invoiceData.tax_rate,
        tax_amount: invoiceData.tax_amount,
        discount_amount: invoiceData.discount_amount,
        total_amount: invoiceData.total_amount,
        notes: invoiceData.notes,
        payment_instructions: invoiceData.payment_instructions,
        signature: invoiceData.signature,
        client: {
          name: invoiceData.clients.name,
          email: invoiceData.clients.email,
          phone: invoiceData.clients.phone,
          address: invoiceData.clients.address,
          tax_id: invoiceData.clients.tax_id
        },
        items: itemsData?.map((item: any) => ({
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total: item.total,
          shipment_type: item.shipment_type,
          item_quantity: item.item_quantity,
          cbm: item.cbm
        })) || [],
        business: {
          name: profileData?.business_name || 'OmniCargo Solutions',
          email: profileData?.contact_email || '',
          phone: profileData?.contact_phone || '',
          address: profileData?.address || '',
          tax_id: profileData?.tax_id || ''
        }
      }
    } catch (error) {
      console.error('Error fetching invoice details:', error)
      return null
    }
  }

  const handleDownloadInvoice = async (invoice: Invoice) => {
    setActionLoading(invoice.id)
    
    try {
      const invoiceDetails = await fetchInvoiceDetails(invoice.id)
      
      if (!invoiceDetails) {
        showError('Error', 'Failed to load invoice details')
        return
      }

      await generateInvoicePDF(invoiceDetails)
      showSuccess('Success', 'Invoice downloaded successfully')
    } catch (error) {
      console.error('Error downloading invoice:', error)
      showError('Error', 'Failed to download invoice. Please try again.')
    } finally {
      setActionLoading(null)
    }
  }

  const handleShareWhatsApp = async (invoice: Invoice) => {
    setActionLoading(invoice.id)
    
    try {
      const invoiceDetails = await fetchInvoiceDetails(invoice.id)
      
      if (!invoiceDetails) {
        showError('Error', 'Failed to load invoice details')
        return
      }

      await shareInvoiceViaWhatsApp(invoiceDetails, invoice.client_phone || undefined)
      showSuccess('WhatsApp Ready!', 'Invoice image downloaded. WhatsApp opened with pre-filled message. Please attach the downloaded image.')
    } catch (error) {
      console.error('Error sharing invoice via WhatsApp:', error)
      showError('Error', 'Failed to prepare WhatsApp sharing. Please try again.')
    } finally {
      setActionLoading(null)
    }
  }

  const handleCopyToClipboard = async (invoice: Invoice) => {
    setActionLoading(invoice.id)
    
    try {
      const invoiceDetails = await fetchInvoiceDetails(invoice.id)
      
      if (!invoiceDetails) {
        showError('Error', 'Failed to load invoice details')
        return
      }

      const success = await copyInvoiceImageToClipboard(invoiceDetails)
      
      if (success) {
        showSuccess('Copied!', 'Invoice image copied to clipboard. You can now paste it anywhere.')
      } else {
        showInfo('Not Supported', 'Clipboard copy not supported on this browser. Use download instead.')
      }
    } catch (error) {
      console.error('Error copying invoice to clipboard:', error)
      showError('Error', 'Failed to copy invoice to clipboard.')
    } finally {
      setActionLoading(null)
    }
  }

  const handleViewInvoice = async (invoice: Invoice) => {
    setActionLoading(invoice.id)
    
    try {
      const invoiceDetails = await fetchInvoiceDetails(invoice.id)
      
      if (!invoiceDetails) {
        showError('Error', 'Failed to load invoice details')
        return
      }

      setPreviewModal({ isOpen: true, invoice: invoiceDetails })
    } catch (error) {
      console.error('Error loading invoice details:', error)
      showError('Error', 'Failed to load invoice details. Please try again.')
    } finally {
      setActionLoading(null)
    }
  }

  const handleSendInvoice = async (invoice: Invoice) => {
    try {
      const invoiceDetails = await fetchInvoiceDetails(invoice.id)
      
      if (!invoiceDetails) {
        showError('Error', 'Failed to load invoice details')
        return
      }

      setEmailModal({ 
        isOpen: true, 
        invoice, 
        invoiceDetails 
      })
    } catch (error) {
      console.error('Error loading invoice details:', error)
      showError('Error', 'Failed to load invoice details. Please try again.')
    }
  }

  const handleEmailSend = async (emailData: { to_email: string; subject: string; message: string }) => {
    if (!emailModal.invoice || !emailModal.invoiceDetails) return

    try {
      // Prepare invoice data for email service with full invoice details
      const invoiceData = {
        invoice_number: emailModal.invoice.invoice_number,
        total_amount: emailModal.invoice.total_amount,
        due_date: emailModal.invoice.due_date,
        currency: emailModal.invoice.currency,
        client_name: emailModal.invoice.client_name,
        // Pass full invoice details for PDF generation
        ...emailModal.invoiceDetails
      }

      // Send email using the direct email service
      await sendEmailToClient(emailData, invoiceData)
      
      // Update invoice status to 'sent'
      const { error: updateError } = await supabase
        .from('invoices')
        .update({ 
          status: 'sent',
          updated_at: new Date().toISOString()
        })
        .eq('id', emailModal.invoice.id)

      if (updateError) throw updateError
      
      // Refresh the invoices list
      fetchInvoices()
      
      // Show success toast
      showSuccess(
        'Email Sent Successfully!', 
        `Invoice ${emailModal.invoice.invoice_number} has been sent to ${emailData.to_email}`
      )
      
    } catch (error) {
      console.error('Error sending invoice:', error)
      showError('Error', error.message || 'Failed to send email. Please try again.')
      throw error
    }
  }

  const handleMarkAsPaid = (invoice: Invoice) => {
    setConfirmModal({
      isOpen: true,
      type: 'markPaid',
      invoice,
      loading: false
    })
  }

  const handleDeleteInvoice = (invoice: Invoice) => {
    setConfirmModal({
      isOpen: true,
      type: 'delete',
      invoice,
      loading: false
    })
  }

  const handleConfirmAction = async () => {
    if (!confirmModal.invoice || !confirmModal.type) return

    setConfirmModal(prev => ({ ...prev, loading: true }))

    try {
      if (confirmModal.type === 'delete') {
        const { error } = await supabase
          .from('invoices')
          .delete()
          .eq('id', confirmModal.invoice.id)
          .eq('user_id', user?.id) // Only allow deleting own invoices

        if (error) throw error
        
        showSuccess('Success', 'Invoice deleted successfully')
      } else if (confirmModal.type === 'markPaid') {
        const { error } = await supabase
          .from('invoices')
          .update({ 
            status: 'paid',
            updated_at: new Date().toISOString()
          })
          .eq('id', confirmModal.invoice.id)
          .eq('user_id', user?.id) // Only allow updating own invoices

        if (error) throw error
        
        showSuccess('Success', 'Invoice marked as paid successfully')
      }

      fetchInvoices()
      setConfirmModal({ isOpen: false, type: null, invoice: null, loading: false })
    } catch (error) {
      console.error('Error performing action:', error)
      showError('Error', 'Failed to perform action. Please try again.')
    } finally {
      setConfirmModal(prev => ({ ...prev, loading: false }))
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
      case 'USD':
        return '$'
      case 'EUR':
        return '€'
      case 'GBP':
        return '£'
      case 'GHS':
        return '₵'
      default:
        return '$'
    }
  }

  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = invoice.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         invoice.client_name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter
    return matchesSearch && matchesStatus
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Toast Container */}
      <ToastContainer toasts={toasts} onRemoveToast={removeToast} />
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
          <p className="text-gray-600">Manage and track your invoices</p>
        </div>
        <Link
          to="/invoices/new"
          className="flex items-center px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors font-medium"
        >
          <Plus className="w-5 h-5 mr-2" />
          New Invoice
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search invoices..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent appearance-none bg-white"
            >
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
            </select>
          </div>
        </div>
      </div>

      {/* Invoices List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {filteredInvoices.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 text-lg mb-2">No invoices found</p>
            <p className="text-gray-400 mb-6">Create your first invoice to get started</p>
            <Link
              to="/invoices/new"
              className="inline-flex items-center px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors font-medium"
            >
              <Plus className="w-5 h-5 mr-2" />
              Create Invoice
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Invoice
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Client
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Due Date
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredInvoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getStatusIcon(invoice.status)}
                        <div className="ml-3">
                          <p className="text-sm font-medium text-gray-900">#{invoice.invoice_number}</p>
                          <p className="text-sm text-gray-500">
                            {format(new Date(invoice.issue_date), 'MMM d, yyyy')}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{invoice.client_name}</p>
                        {invoice.client_email && (
                          <p className="text-xs text-gray-500">{invoice.client_email}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className="text-sm font-medium text-gray-900">
                        {getCurrencySymbol(invoice.currency)}{invoice.total_amount.toFixed(2)}
                      </p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getStatusColor(invoice.status)}`}>
                        {invoice.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className="text-sm text-gray-900">
                        {format(new Date(invoice.due_date), 'MMM d, yyyy')}
                      </p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-1">
                        <button 
                          onClick={() => handleViewInvoice(invoice)}
                          disabled={actionLoading === invoice.id}
                          className="text-gray-400 hover:text-blue-600 p-2 rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-50"
                          title="View Invoice"
                        >
                          {actionLoading === invoice.id ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                        
                        <button 
                          onClick={() => handleDownloadInvoice(invoice)}
                          disabled={actionLoading === invoice.id}
                          className="text-gray-400 hover:text-green-600 p-2 rounded-lg hover:bg-green-50 transition-colors disabled:opacity-50"
                          title="Download PDF"
                        >
                          {actionLoading === invoice.id ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-500"></div>
                          ) : (
                            <Download className="w-4 h-4" />
                          )}
                        </button>

                        <button 
                          onClick={() => handleShareWhatsApp(invoice)}
                          disabled={actionLoading === invoice.id}
                          className="text-gray-400 hover:text-green-600 p-2 rounded-lg hover:bg-green-50 transition-colors disabled:opacity-50"
                          title="Share via WhatsApp (Enhanced)"
                        >
                          {actionLoading === invoice.id ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-500"></div>
                          ) : (
                            <MessageCircle className="w-4 h-4" />
                          )}
                        </button>

                        <button 
                          onClick={() => handleCopyToClipboard(invoice)}
                          disabled={actionLoading === invoice.id}
                          className="text-gray-400 hover:text-purple-600 p-2 rounded-lg hover:bg-purple-50 transition-colors disabled:opacity-50"
                          title="Copy Image to Clipboard"
                        >
                          {actionLoading === invoice.id ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-500"></div>
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                        
                        <button 
                          onClick={() => handleSendInvoice(invoice)}
                          className="text-gray-400 hover:text-primary-600 p-2 rounded-lg hover:bg-primary-50 transition-colors"
                          title="Send Invoice"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                        
                        {invoice.status !== 'paid' && invoice.user_id === user?.id && (
                          <button 
                            onClick={() => handleMarkAsPaid(invoice)}
                            className="text-gray-400 hover:text-green-600 p-2 rounded-lg hover:bg-green-50 transition-colors"
                            title="Mark as Paid"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}
                        
                        {invoice.user_id === user?.id && (
                          <Link
                            to={`/invoices/edit/${invoice.id}`}
                            className={`p-2 rounded-lg transition-colors ${
                              invoice.status === 'draft' 
                                ? 'text-gray-400 hover:text-blue-600 hover:bg-blue-50' 
                                : 'text-gray-300 cursor-not-allowed'
                            }`}
                            title="Edit Invoice"
                            onClick={(e) => {
                              if (invoice.status !== 'draft') {
                                e.preventDefault()
                                showInfo('Edit Restricted', 'Only draft invoices can be edited')
                              }
                            }}
                          >
                            <Edit className="w-4 h-4" />
                          </Link>
                        )}
                        
                        {invoice.user_id === user?.id && (
                          <button 
                            onClick={() => handleDeleteInvoice(invoice)}
                            className="text-gray-400 hover:text-red-600 p-2 rounded-lg hover:bg-red-50 transition-colors"
                            title="Delete Invoice"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      <InvoicePreviewModal
        isOpen={previewModal.isOpen}
        onClose={() => setPreviewModal({ isOpen: false, invoice: null })}
        invoice={previewModal.invoice}
      />

      <EmailInvoiceModal
        isOpen={emailModal.isOpen}
        onClose={() => setEmailModal({ isOpen: false, invoice: null, invoiceDetails: null })}
        onSend={handleEmailSend}
        invoice={emailModal.invoice}
        businessName={businessName}
        invoiceDetails={emailModal.invoiceDetails}
        onPreviewInvoice={() => {
          if (emailModal.invoiceDetails) {
            setPreviewModal({ isOpen: true, invoice: emailModal.invoiceDetails })
          }
        }}
      />

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ isOpen: false, type: null, invoice: null, loading: false })}
        onConfirm={handleConfirmAction}
        title={confirmModal.type === 'delete' ? 'Delete Invoice' : 'Mark as Paid'}
        message={
          confirmModal.type === 'delete' 
            ? `Are you sure you want to delete invoice ${confirmModal.invoice?.invoice_number}? This action cannot be undone.`
            : `Are you sure you want to mark invoice ${confirmModal.invoice?.invoice_number} as paid?`
        }
        type={confirmModal.type === 'delete' ? 'danger' : 'success'}
        confirmText={confirmModal.type === 'delete' ? 'Delete' : 'Mark as Paid'}
        loading={confirmModal.loading}
      />
    </div>
  )
}