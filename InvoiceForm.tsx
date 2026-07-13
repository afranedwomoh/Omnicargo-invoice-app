import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../hooks/useToast'
import { ToastContainer } from '../components/Toast/ToastContainer'
import { 
  Plus, 
  Trash2, 
  Save,
  ArrowLeft,
  Package,
  Calculator,
  FileText,
  User,
  Building,
  DollarSign,
  Calendar,
  Hash,
  Minus,
  Clock
} from 'lucide-react'
import { format, addDays } from 'date-fns'

interface Client {
  id: string
  name: string
  email: string | null
  phone: string | null
  address: string | null
  tax_id: string | null
}

interface InvoiceItem {
  id: string
  shipment_type: string
  description: string
  item_quantity: number
  cbm: number
  unit_price: number
  total: number
}

interface ShipmentPrice {
  id: string
  shipment_type: string
  price_per_unit: number
  unit_type: 'CBM' | 'TON'
  currency: string
}

const DUE_DATE_OPTIONS = [
  { label: '3 days', days: 3 },
  { label: '15 days', days: 15 },
  { label: '30 days', days: 30 },
  { label: '45 days', days: 45 },
  { label: '55 days', days: 55 },
  { label: '60 days', days: 60 }
]

export const InvoiceForm: React.FC = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { id: invoiceId } = useParams()
  const [searchParams] = useSearchParams()
  const preselectedClientId = searchParams.get('client')
  const { toasts, removeToast, showSuccess, showError, showInfo } = useToast()
  const isEditing = Boolean(invoiceId)

  const [clients, setClients] = useState<Client[]>([])
  const [shipmentPrices, setShipmentPrices] = useState<ShipmentPrice[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [userProfile, setUserProfile] = useState<{ user_name: string | null }>({ user_name: null })

  const [formData, setFormData] = useState({
    client_id: preselectedClientId || '',
    invoice_number: '',
    issue_date: format(new Date(), 'yyyy-MM-dd'),
    due_date_days: 55, // Default to 55 days
    currency: 'USD',
    discount_amount: 0,
    notes: '',
    payment_instructions: ''
  })

  const [items, setItems] = useState<InvoiceItem[]>([])
  const [currentItem, setCurrentItem] = useState<InvoiceItem>({
    id: Date.now().toString(),
    shipment_type: '',
    description: '',
    item_quantity: 1,
    cbm: '',
    unit_price: '',
    total: 0
  })

  useEffect(() => {
    if (user) {
      fetchData()
      fetchUserProfile()
      if (isEditing && invoiceId) {
        fetchInvoiceForEdit(invoiceId)
      }
    }
  }, [user, invoiceId, isEditing])

  // Generate invoice number only for new invoices
  useEffect(() => {
    if (user && !isEditing && !invoiceId) {
      generateInvoiceNumber().then(invoiceNumber => {
        setFormData(prev => ({ ...prev, invoice_number: invoiceNumber }))
      })
    }
  }, [user, isEditing, invoiceId])

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

  const fetchData = async () => {
    try {
      // Fetch clients
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('*')
        .eq('user_id', user?.id)
        .order('name')

      if (clientsError) throw clientsError

      // Fetch shipment prices
      const { data: pricesData, error: pricesError } = await supabase
        .from('shipment_pricing')
        .select('*')
        .eq('user_id', user?.id)
        .eq('is_active', true)
        .order('shipment_type')

      if (pricesError) throw pricesError

      setClients(clientsData || [])
      setShipmentPrices(pricesData || [])

    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const generateInvoiceNumber = async (): Promise<string> => {
    try {
      // Get current timestamp for uniqueness
      const currentDate = new Date()
      const year = currentDate.getFullYear()
      const month = String(currentDate.getMonth() + 1).padStart(2, '0')
      const day = String(currentDate.getDate()).padStart(2, '0')
      const hours = String(currentDate.getHours()).padStart(2, '0')
      const minutes = String(currentDate.getMinutes()).padStart(2, '0')
      const seconds = String(currentDate.getSeconds()).padStart(2, '0')
      
      // Add random component for extra uniqueness
      const randomSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
      
      // Create unique invoice number with timestamp and random component
      return `OMC${year}${month}${day}${hours}${minutes}${seconds}${randomSuffix}`
    } catch (error) {
      console.error('Error generating invoice number:', error)
      // Fallback to timestamp-based number
      return `OMC${Date.now()}${Math.floor(Math.random() * 1000)}`
    }
  }

  const calculateDueDate = (issueDateStr: string, days: number): string => {
    const issueDate = new Date(issueDateStr)
    const dueDate = addDays(issueDate, days)
    return format(dueDate, 'yyyy-MM-dd')
  }

  const addItem = () => {
    // Validate current item before adding
    if (!currentItem.shipment_type.trim() || !currentItem.description.trim() || !currentItem.cbm || parseFloat(currentItem.cbm.toString()) <= 0) {
      showError('Validation Error', 'Please fill in all required fields (Shipment Type, Description, and CBM)')
      return
    }

    if (!currentItem.unit_price || parseFloat(currentItem.unit_price.toString()) < 0) {
      showError('Validation Error', 'Price cannot be negative')
      return
    }

    // Convert string values to numbers for the final item
    const finalItem = {
      ...currentItem,
      cbm: parseFloat(currentItem.cbm.toString()) || 0,
      unit_price: parseFloat(currentItem.unit_price.toString()) || 0,
      total: (parseFloat(currentItem.cbm.toString()) || 0) * (parseFloat(currentItem.unit_price.toString()) || 0)
    }

    // Add current item to the top of the list
    setItems([finalItem, ...items])
    
    // Reset current item for new entry
    setCurrentItem({
      id: Date.now().toString(),
      shipment_type: '',
      description: '',
      item_quantity: 1,
      cbm: '',
      unit_price: '',
      total: 0
    })
  }

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id))
  }

  const updateCurrentItem = (field: keyof InvoiceItem, value: any) => {
    const updatedItem = { ...currentItem, [field]: value }
    
    // Auto-calculate unit price when shipment type changes
    if (field === 'shipment_type') {
      const selectedPrice = shipmentPrices.find(p => p.shipment_type === value)
      if (selectedPrice) {
        updatedItem.unit_price = selectedPrice.price_per_unit.toString()
      }
    }
    
    // Calculate total: cbm_per_item * price_per_cbm
    const cbmValue = parseFloat(updatedItem.cbm.toString()) || 0
    const priceValue = parseFloat(updatedItem.unit_price.toString()) || 0
    updatedItem.total = cbmValue * priceValue
    
    setCurrentItem(updatedItem)
  }

  const calculateTotals = () => {
    const itemsSubtotal = items.reduce((sum, item) => sum + item.total, 0)
    const currentItemTotal = (parseFloat(currentItem.cbm.toString()) || 0) * (parseFloat(currentItem.unit_price.toString()) || 0)
    const subtotal = itemsSubtotal + currentItemTotal
    const total = subtotal - formData.discount_amount
    
    return {
      subtotal,
      total: Math.max(0, total)
    }
  }

  const fetchInvoiceForEdit = async (id: string) => {
    try {
      setLoading(true)
      
      // Fetch invoice with client details
      const { data: invoiceData, error: invoiceError } = await supabase
        .from('invoices')
        .select(`
          *,
          clients!inner(*)
        `)
        .eq('id', id)
        .single()

      if (invoiceError) throw invoiceError

      // Check if user can edit this invoice (only draft status and own invoices)
      if (invoiceData.user_id !== user?.id) {
        showError('Access Denied', 'You can only edit your own invoices')
        navigate('/invoices')
        return
      }

      if (invoiceData.status !== 'draft') {
        showError('Edit Restricted', 'Only draft invoices can be edited')
        navigate('/invoices')
        return
      }

      // Fetch invoice items
      const { data: itemsData, error: itemsError } = await supabase
        .from('invoice_items')
        .select('*')
        .eq('invoice_id', id)
        .order('created_at', { ascending: false })

      if (itemsError) throw itemsError

      // Calculate due date days from issue and due dates
      const issueDate = new Date(invoiceData.issue_date)
      const dueDate = new Date(invoiceData.due_date)
      const daysDiff = Math.ceil((dueDate.getTime() - issueDate.getTime()) / (1000 * 60 * 60 * 24))
      
      // Find matching due date option or default to 30
      const matchingOption = DUE_DATE_OPTIONS.find(option => option.days === daysDiff)
      const dueDateDays = matchingOption ? daysDiff : 30

      // Populate form data
      setFormData({
        client_id: invoiceData.client_id,
        invoice_number: invoiceData.invoice_number,
        issue_date: invoiceData.issue_date,
        due_date_days: dueDateDays,
        currency: invoiceData.currency || 'USD',
        discount_amount: invoiceData.discount_amount || 0,
        notes: invoiceData.notes || '',
        payment_instructions: invoiceData.payment_instructions || ''
      })

      // Convert invoice items to the format expected by the form
      const formattedItems = itemsData?.map((item: any) => {
        // Parse description to extract shipment type and description
        const parts = item.description.split(': ')
        const shipmentType = parts.length > 1 ? parts[0] : (item.shipment_type || 'General Cargo')
        const description = parts.length > 1 ? parts[1] : item.description

        return {
          id: item.id,
          shipment_type: shipmentType,
          description: description,
          item_quantity: item.item_quantity || 1,
          cbm: item.cbm || item.quantity, // Use cbm if available, fallback to quantity
          unit_price: item.unit_price,
          total: item.total
        }
      }) || []

      setItems(formattedItems)
      
      showInfo('Edit Mode', 'Invoice loaded for editing. Only draft invoices can be modified.')
      
    } catch (error) {
      console.error('Error fetching invoice for edit:', error)
      showError('Error', 'Failed to load invoice for editing')
      navigate('/invoices')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Comprehensive validation before submission
    if (!formData.client_id) {
      showError('Validation Error', 'Please select a client')
      return
    }

    if (!formData.invoice_number.trim()) {
      showError('Validation Error', 'Please enter an invoice number')
      return
    }

    if (!formData.issue_date) {
      showError('Validation Error', 'Please select an issue date')
      return
    }

    // Check if there are any items or if current item has data
    const currentItemCbm = parseFloat(currentItem.cbm.toString()) || 0
    const allItems = currentItem.shipment_type.trim() && currentItem.description.trim() && currentItemCbm > 0 
      ? [currentItem, ...items] 
      : items

    if (allItems.length === 0) {
      showError('Validation Error', 'Please add at least one item to the invoice')
      return
    }

    // Validate all items have required fields
    for (let i = 0; i < allItems.length; i++) {
      const item = allItems[i]
      if (!item.shipment_type.trim()) {
        showError('Validation Error', `Item ${i + 1}: Please enter a shipment type`)
        return
      }
      if (!item.description.trim()) {
        showError('Validation Error', `Item ${i + 1}: Please enter a description`)
        return
      }
      const itemCbm = typeof item.cbm === 'string' ? parseFloat(item.cbm) : item.cbm
      if (!itemCbm || itemCbm <= 0) {
        showError('Validation Error', `Item ${i + 1}: CBM must be greater than 0`)
        return
      }
      const itemPrice = typeof item.unit_price === 'string' ? parseFloat(item.unit_price) : item.unit_price
      if (itemPrice < 0) {
        showError('Validation Error', `Item ${i + 1}: Price cannot be negative`)
        return
      }
    }

    setSaving(true)

    try {
      // Ensure user profile exists before creating invoice
      const { data: existingProfile, error: profileCheckError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user?.id)
        .maybeSingle()

      if (profileCheckError && profileCheckError.code !== 'PGRST116') {
        throw profileCheckError
      }

      // Create profile if it doesn't exist
      if (!existingProfile) {
        const { error: profileCreateError } = await supabase
          .from('profiles')
          .insert({
            id: user?.id,
            user_name: userProfile.user_name || 'User',
            business_name: 'OmniCargo Solutions',
            contact_email: user?.email
          })

        if (profileCreateError) {
          console.error('Error creating profile:', profileCreateError)
          throw new Error('Failed to create user profile. Please try again.')
        }
      }

      const { subtotal, total } = calculateTotals()
      const dueDate = calculateDueDate(formData.issue_date, formData.due_date_days)

      if (isEditing && invoiceId) {
        // Update existing invoice
        const { error: invoiceError } = await supabase
          .from('invoices')
          .update({
            client_id: formData.client_id,
            invoice_number: formData.invoice_number,
            issue_date: formData.issue_date,
            due_date: dueDate,
            currency: formData.currency,
            subtotal,
            tax_rate: 0,
            tax_amount: 0,
            discount_amount: formData.discount_amount,
            total_amount: total,
            notes: formData.notes || null,
            payment_instructions: formData.payment_instructions || null,
            signature: userProfile.user_name || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', invoiceId)
          .eq('user_id', user?.id) // Security check

        if (invoiceError) throw invoiceError

        // Delete existing items and create new ones
        const { error: deleteError } = await supabase
          .from('invoice_items')
          .delete()
          .eq('invoice_id', invoiceId)

        if (deleteError) throw deleteError

        // Create new invoice items
        const invoiceItems = allItems.map(item => ({
          invoice_id: invoiceId,
          description: `${item.shipment_type}: ${item.description}`,
          quantity: item.cbm, // Store CBM as quantity for display purposes
          unit_price: item.unit_price,
          total: item.total,
          shipment_type: item.shipment_type,
          item_quantity: item.item_quantity,
          cbm: item.cbm
        }))

        const { error: itemsError } = await supabase
          .from('invoice_items')
          .insert(invoiceItems)

        if (itemsError) throw itemsError

        showSuccess('Invoice Updated', `Invoice ${formData.invoice_number} has been updated successfully`)
      } else {
        // Create new invoice
        const { data: invoice, error: invoiceError } = await supabase
          .from('invoices')
          .insert({
            user_id: user?.id,
            client_id: formData.client_id,
            invoice_number: formData.invoice_number,
            issue_date: formData.issue_date,
            due_date: dueDate,
            currency: formData.currency,
            subtotal,
            tax_rate: 0, // No tax rate
            tax_amount: 0, // No tax amount
            discount_amount: formData.discount_amount,
            total_amount: total,
            notes: formData.notes || null,
            payment_instructions: formData.payment_instructions || null,
            signature: userProfile.user_name || null, // Use user's name from profile
            status: 'draft'
          })
          .select()
          .single()

        if (invoiceError) throw invoiceError

        // Create invoice items - store CBM as quantity for compatibility
        const invoiceItems = allItems.map(item => {
          const cbmValue = typeof item.cbm === 'string' ? parseFloat(item.cbm) : item.cbm
          const priceValue = typeof item.unit_price === 'string' ? parseFloat(item.unit_price) : item.unit_price
          const totalValue = cbmValue * priceValue
          
          return {
          invoice_id: invoice.id,
          description: `${item.shipment_type}: ${item.description}`,
          quantity: cbmValue, // Store CBM as quantity for display purposes
          unit_price: priceValue,
          total: totalValue,
          shipment_type: item.shipment_type,
          item_quantity: item.item_quantity,
          cbm: cbmValue
          }
        })

        const { error: itemsError } = await supabase
          .from('invoice_items')
          .insert(invoiceItems)

        if (itemsError) throw itemsError

        showSuccess('Invoice Created', `Invoice ${formData.invoice_number} has been created successfully`)
      }
      
      navigate('/invoices')
    } catch (error) {
      console.error('Error saving invoice:', error)
      showError('Error', `Failed to ${isEditing ? 'update' : 'create'} invoice. Please try again.`)
    } finally {
      setSaving(false)
    }
  }

  // Check if form is valid for submission
  const isFormValid = () => {
    // Check basic form fields
    if (!formData.client_id || !formData.invoice_number.trim() || !formData.issue_date) {
      return false
    }

    // Check if there are any valid items
    const currentItemCbm = parseFloat(currentItem.cbm.toString()) || 0
    const allItems = currentItem.shipment_type.trim() && currentItem.description.trim() && currentItemCbm > 0 
      ? [currentItem, ...items] 
      : items

    if (allItems.length === 0) {
      return false
    }

    // Validate all items
    return allItems.every(item => {
      const itemCbm = typeof item.cbm === 'string' ? parseFloat(item.cbm) : item.cbm
      const itemPrice = typeof item.unit_price === 'string' ? parseFloat(item.unit_price) : item.unit_price
      return item.shipment_type.trim() && 
        item.description.trim() && 
        itemCbm > 0 && 
        itemPrice >= 0
    })
  }

  const { subtotal, total } = calculateTotals()

  // Handle keyboard events to prevent unwanted form submission
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.target instanceof HTMLInputElement) {
      // If Enter is pressed in an input field, prevent form submission
      // unless it's the submit button that's focused
      if (!isFormValid()) {
        e.preventDefault()
        showError('Form Incomplete', 'Please fill in all required fields before submitting')
        return
      }
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
      {/* Toast Container */}
      <ToastContainer toasts={toasts} onRemoveToast={removeToast} />
      
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/invoices')}
            className="flex items-center px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Invoices
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {isEditing ? 'Edit Invoice' : 'Create New Invoice'}
            </h1>
            <p className="text-gray-600">
              {isEditing ? 'Update the invoice details below' : 'Fill in the details to create a new invoice'}
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} onKeyDown={handleKeyDown} className="space-y-6">
        {/* Invoice Header */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center mb-6">
            <FileText className="w-5 h-5 text-gray-400 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900">Invoice Details</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Hash className="w-4 h-4 inline mr-1" />
                Invoice Number
              </label>
              <input
                type="text"
                value={formData.invoice_number}
                onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="w-4 h-4 inline mr-1" />
                Issue Date
              </label>
              <input
                type="date"
                value={formData.issue_date}
                onChange={(e) => setFormData({ ...formData, issue_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Clock className="w-4 h-4 inline mr-1" />
                ETA (Estimated Time of Arrival)
              </label>
              <select
                value={formData.due_date_days}
                onChange={(e) => setFormData({ ...formData, due_date_days: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
              >
                {DUE_DATE_OPTIONS.map((option) => (
                  <option key={option.days} value={option.days}>
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                ETA: {format(new Date(calculateDueDate(formData.issue_date, formData.due_date_days)), 'MMM dd, yyyy')}
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <DollarSign className="w-4 h-4 inline mr-1" />
                Currency
              </label>
              <select
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="GHS">GHS (₵)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Client Selection */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center mb-6">
            <User className="w-5 h-5 text-gray-400 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900">Client Information</h2>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Client *
            </label>
            <select
              value={formData.client_id}
              onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              required
            >
              <option value="">Choose a client...</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name} {client.email && `(${client.email})`}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Invoice Items */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <Package className="w-5 h-5 text-gray-400 mr-2" />
              <h2 className="text-lg font-semibold text-gray-900">Invoice Items</h2>
            </div>
          </div>

          {/* Current Item Input Form */}
          <div className="p-4 border-2 border-dashed border-primary-300 rounded-lg bg-primary-50 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-gray-900">Add New Item</h3>
              <button
                type="button"
                onClick={addItem}
                className="flex items-center px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors text-sm font-medium"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Item
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Shipment Type *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={currentItem.shipment_type}
                    onChange={(e) => updateCurrentItem('shipment_type', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                    placeholder="Enter shipment type..."
                    required
                    list="shipment-types-current"
                  />
                  <datalist id="shipment-types-current">
                    {shipmentPrices.map((price) => (
                      <option key={price.id} value={price.shipment_type} />
                    ))}
                  </datalist>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description *
                </label>
                <input
                  type="text"
                  value={currentItem.description}
                  onChange={(e) => updateCurrentItem('description', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                  placeholder="Item description"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quantity
                </label>
                <input
                  type="number"
                  min="1"
                  value={currentItem.item_quantity}
                  onChange={(e) => updateCurrentItem('item_quantity', parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">For reference only</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  CBM per Item *
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.001"
                  value={currentItem.cbm}
                  placeholder="0.000"
                  onChange={(e) => {
                    const value = e.target.value
                    updateCurrentItem('cbm', value)
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Price per CBM *
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={currentItem.unit_price}
                  placeholder="0.00"
                  onChange={(e) => {
                    const value = e.target.value
                    updateCurrentItem('unit_price', value)
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Total
                </label>
                <div className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium">
                  ${((parseFloat(currentItem.cbm.toString()) || 0) * (parseFloat(currentItem.unit_price.toString()) || 0)).toFixed(2)}
                </div>
              </div>
            </div>
            
            <div className="mt-2 text-xs text-gray-500">
              <strong>Calculation:</strong> {(parseFloat(currentItem.cbm.toString()) || 0).toFixed(3)} CBM × ${(parseFloat(currentItem.unit_price.toString()) || 0).toFixed(2)} = ${((parseFloat(currentItem.cbm.toString()) || 0) * (parseFloat(currentItem.unit_price.toString()) || 0)).toFixed(2)}
              {currentItem.item_quantity > 1 && (
                <span className="ml-2 text-blue-600">
                  (Quantity: {currentItem.item_quantity} items for reference)
                </span>
              )}
            </div>
          </div>

          {/* Added Items List */}
          {items.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Added Items ({items.length})</h3>
              {items.map((item, index) => (
                <div key={item.id} className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-900">Item {items.length - index}</h4>
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      className="text-red-500 hover:text-red-700 p-1 rounded"
                      title="Remove item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 text-sm">
                    <div>
                      <span className="text-gray-600">Type:</span>
                      <p className="font-medium">{item.shipment_type}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Description:</span>
                      <p className="font-medium">{item.description}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Quantity:</span>
                      <p className="font-medium">{item.item_quantity}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">CBM:</span>
                      <p className="font-medium">{item.cbm.toFixed(3)}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Price/CBM:</span>
                      <p className="font-medium">${item.unit_price.toFixed(2)}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Total:</span>
                      <p className="font-medium text-primary-600">${item.total.toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {items.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p>
                {isEditing ? 'No items found in this invoice.' : 'No items added yet.'} 
                Fill in the form above and click "Add Item" to get started.
              </p>
            </div>
          )}
        </div>

        {/* Calculations */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center mb-6">
            <Calculator className="w-5 h-5 text-gray-400 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900">Calculations</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Minus className="w-4 h-4 inline mr-1" />
                Discount Amount
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.discount_amount}
                onChange={(e) => setFormData({ ...formData, discount_amount: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            
            {/* Created By Info */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <User className="w-4 h-4 inline mr-1" />
                Created By
              </label>
              <div className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm">
                {userProfile.user_name || 'No name set in profile'}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                This name will appear on the invoice. Update in Settings if needed.
              </p>
            </div>
          </div>

          {/* Totals Summary */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Subtotal:</span>
                <span className="font-medium">${subtotal.toFixed(2)}</span>
              </div>
              {formData.discount_amount > 0 && (
                <div className="flex justify-between text-sm text-red-600">
                  <span>Discount:</span>
                  <span className="font-medium">-${formData.discount_amount.toFixed(2)}</span>
                </div>
              )}
              <div className="border-t border-gray-200 pt-2">
                <div className="flex justify-between text-lg font-semibold text-primary-600">
                  <span>Total:</span>
                  <span>${total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Additional Information */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center mb-6">
            <Building className="w-5 h-5 text-gray-400 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900">Additional Information</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Additional notes or terms..."
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Terms and Conditions
              </label>
              <textarea
                value={formData.payment_instructions}
                onChange={(e) => setFormData({ ...formData, payment_instructions: e.target.value })}
                rows={8}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Terms and conditions..."
              />
              <div className="mt-2">
                <button
                  type="button"
                  onClick={() => setFormData({ 
                    ...formData, 
                    payment_instructions: `1. ETA on this invoice refers to the Estimated Time of Arrival. Please note that shipments may arrive slightly earlier or later than the stated ETA.
2. The shipping fee quoted in USD shall be paid in Ghana cedi equivalent at the prevailing exchange rate upon arrival of the goods in Ghana.
3. Customers are required to make full payment and collect their goods within 3–7 days of the arrival notice. Goods not collected after the 7th day will attract a mandatory warehouse storage fee.
4. Goods that remain unpaid and uncollected 30 days after arrival will be auctioned, and the proceeds will be applied toward the cost of shipping and storage.
5. Customers in Kumasi must complete full payment before their goods are dispatched to Kumasi. Customers who wish to inspect their goods prior to payment must do so at our Tema warehouse.
6. Goods delivered to Kumasi must be collected within 12 hours of the pickup notice due to limited storage capacity.` 
                  })}
                  className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                >
                  Load Standard Terms & Conditions
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => navigate('/invoices')}
            className="px-6 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors font-medium disabled:opacity-50"
          >
            <Save className="w-5 h-5 mr-2" />
            {saving ? (isEditing ? 'Updating Invoice...' : 'Creating Invoice...') : (isEditing ? 'Update Invoice' : 'Create Invoice')}
          </button>
        </div>
      </form>
    </div>
  )
}