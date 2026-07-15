import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../hooks/useToast'
import { ToastContainer } from '../components/Toast/ToastContainer'
import {
  Plus,
  Trash2,
  Save,
  ArrowLeft,
  Truck,
  User,
  Calculator
} from 'lucide-react'
import { format } from 'date-fns'

interface DeliveryItem {
  id: string
  route: string
  description: string
  item_quantity: number | string
  cbm: number | string
  unit_price: number | string
  total: number
}

interface SavedRoute {
  id: string
  shipment_type: string
  price_per_unit: number
}

const DUE_DATE_OPTIONS = [
  { label: '2 days', days: 2 },
  { label: '3 days', days: 3 },
  { label: '5 days', days: 5 },
  { label: '7 days', days: 7 }
]

export const LocalDeliveryForm: React.FC = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { id: invoiceId } = useParams()
  const { toasts, removeToast, showSuccess, showError } = useToast()
  const isEditing = Boolean(invoiceId)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [userProfile, setUserProfile] = useState<{ user_name: string | null }>({ user_name: null })
  const [savedRoutes, setSavedRoutes] = useState<SavedRoute[]>([])
  const [clients, setClients] = useState<{ id: string; name: string; phone: string | null; address: string | null }[]>([])
  const [recipientClientId, setRecipientClientId] = useState('')
  const [showNewClientForm, setShowNewClientForm] = useState(false)
  const [savingNewClient, setSavingNewClient] = useState(false)
  const [newClient, setNewClient] = useState({ name: '', phone: '', address: '' })
  const [senderClientId, setSenderClientId] = useState('')
  const [showNewSenderForm, setShowNewSenderForm] = useState(false)
  const [savingNewSender, setSavingNewSender] = useState(false)
  const [newSender, setNewSender] = useState({ name: '', phone: '', address: '' })

  const [formData, setFormData] = useState({
    invoice_number: '',
    issue_date: format(new Date(), 'yyyy-MM-dd'),
    due_date_days: 3,
    sender_name: '',
    sender_phone: '',
    sender_address: '',
    recipient_name: '',
    recipient_phone: '',
    recipient_address: '',
    notes: ''
  })

  const [items, setItems] = useState<DeliveryItem[]>([])
  const [currentItem, setCurrentItem] = useState<DeliveryItem>({
    id: Date.now().toString(),
    route: '',
    description: '',
    item_quantity: 1,
    cbm: '',
    unit_price: '',
    total: 0
  })

  useEffect(() => {
    if (user) {
      fetchUserProfile()
      fetchSavedRoutes()
      fetchClients()
      if (isEditing && invoiceId) {
        fetchInvoiceForEdit(invoiceId)
      } else {
        setFormData(prev => ({ ...prev, invoice_number: generateInvoiceNumber() }))
        setLoading(false)
      }
    }
  }, [user, invoiceId, isEditing])

  const generateInvoiceNumber = () => {
    return `LD${format(new Date(), 'yyyyMMddHHmmss')}`
  }

  const fetchUserProfile = async () => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('user_name')
        .eq('id', user?.id)
        .maybeSingle()

      if (error && error.code !== 'PGRST116') throw error
      if (profile) setUserProfile(profile)
    } catch (error) {
      console.error('Error fetching user profile:', error)
    }
  }

  const fetchSavedRoutes = async () => {
    try {
      const { data, error } = await supabase
        .from('shipment_pricing')
        .select('id, shipment_type, price_per_unit')
        .eq('user_id', user?.id)
        .eq('is_active', true)
        .order('shipment_type')

      if (error) throw error
      setSavedRoutes(data || [])
    } catch (error) {
      console.error('Error fetching saved routes:', error)
    }
  }

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name, phone, address')
        .order('name')

      if (error) throw error
      setClients(data || [])
    } catch (error) {
      console.error('Error fetching clients:', error)
    }
  }

  const handleSelectRecipientClient = (clientId: string) => {
    setRecipientClientId(clientId)
    const client = clients.find(c => c.id === clientId)
    if (client) {
      setFormData(prev => ({
        ...prev,
        recipient_name: client.name,
        recipient_phone: client.phone || '',
        recipient_address: client.address || ''
      }))
    }
  }

  const handleSelectSenderClient = (clientId: string) => {
    setSenderClientId(clientId)
    const client = clients.find(c => c.id === clientId)
    if (client) {
      setFormData(prev => ({
        ...prev,
        sender_name: client.name,
        sender_phone: client.phone || '',
        sender_address: client.address || ''
      }))
    }
  }

  const handleSaveNewSender = async () => {
    if (!newSender.name.trim()) {
      showError('Validation Error', 'Client name is required')
      return
    }

    setSavingNewSender(true)

    try {
      const { data, error } = await supabase
        .from('clients')
        .insert({
          user_id: user?.id,
          name: newSender.name.trim(),
          phone: newSender.phone.trim() || null,
          address: newSender.address.trim() || null
        })
        .select()
        .single()

      if (error) throw error

      setClients(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
      setSenderClientId(data.id)
      setFormData(prev => ({
        ...prev,
        sender_name: data.name,
        sender_phone: data.phone || '',
        sender_address: data.address || ''
      }))
      setNewSender({ name: '', phone: '', address: '' })
      setShowNewSenderForm(false)
      showSuccess('Client Saved', `${data.name} has been saved and selected`)
    } catch (error) {
      console.error('Error saving new sender:', error)
      showError('Error', 'Failed to save this client. Please try again.')
    } finally {
      setSavingNewSender(false)
    }
  }

  const handleSaveNewClient = async () => {
    if (!newClient.name.trim()) {
      showError('Validation Error', 'Client name is required')
      return
    }

    setSavingNewClient(true)

    try {
      const { data, error } = await supabase
        .from('clients')
        .insert({
          user_id: user?.id,
          name: newClient.name.trim(),
          phone: newClient.phone.trim() || null,
          address: newClient.address.trim() || null
        })
        .select()
        .single()

      if (error) throw error

      setClients(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
      setRecipientClientId(data.id)
      setFormData(prev => ({
        ...prev,
        recipient_name: data.name,
        recipient_phone: data.phone || '',
        recipient_address: data.address || ''
      }))
      setNewClient({ name: '', phone: '', address: '' })
      setShowNewClientForm(false)
      showSuccess('Client Saved', `${data.name} has been saved and selected`)
    } catch (error) {
      console.error('Error saving new client:', error)
      showError('Error', 'Failed to save this client. Please try again.')
    } finally {
      setSavingNewClient(false)
    }
  }

  const fetchInvoiceForEdit = async (id: string) => {
    try {
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .select('*')
        .eq('id', id)
        .single()

      if (invoiceError) throw invoiceError

      setFormData({
        invoice_number: invoice.invoice_number,
        issue_date: invoice.issue_date,
        due_date_days: 3,
        sender_name: invoice.sender_name || '',
        sender_phone: invoice.sender_phone || '',
        sender_address: invoice.sender_address || '',
        recipient_name: invoice.recipient_name || '',
        recipient_phone: invoice.recipient_phone || '',
        recipient_address: invoice.recipient_address || '',
        notes: invoice.notes || ''
      })
      setRecipientClientId(invoice.client_id || '')

      const { data: itemsData, error: itemsError } = await supabase
        .from('invoice_items')
        .select('*')
        .eq('invoice_id', id)

      if (itemsError) throw itemsError

      setItems(
        (itemsData || []).map((item: any) => ({
          id: item.id,
          route: item.shipment_type || '',
          description: item.description,
          item_quantity: item.item_quantity || 1,
          cbm: item.cbm || 0,
          unit_price: item.unit_price,
          total: item.total
        }))
      )
    } catch (error) {
      console.error('Error loading delivery invoice:', error)
      showError('Error', 'Failed to load this invoice.')
    } finally {
      setLoading(false)
    }
  }

  const calculateItemTotal = (cbm: number | string, unitPrice: number | string) => {
    const cbmVal = typeof cbm === 'string' ? parseFloat(cbm) || 0 : cbm
    const price = typeof unitPrice === 'string' ? parseFloat(unitPrice) || 0 : unitPrice
    return cbmVal * price
  }

  const handleCurrentItemChange = (field: keyof DeliveryItem, value: string | number) => {
    const updated = { ...currentItem, [field]: value }
    updated.total = calculateItemTotal(updated.cbm, updated.unit_price)
    setCurrentItem(updated)
  }

  const handleRouteSelect = (routeName: string) => {
    const route = savedRoutes.find(r => r.shipment_type === routeName)
    const updated = { ...currentItem, route: routeName }
    if (route) {
      updated.unit_price = route.price_per_unit
    }
    updated.total = calculateItemTotal(updated.cbm, updated.unit_price)
    setCurrentItem(updated)
  }

  const addItem = () => {
    if (!currentItem.description.trim()) {
      showError('Validation Error', 'Enter a description for this item')
      return
    }
    const cbmVal = typeof currentItem.cbm === 'string' ? parseFloat(currentItem.cbm) || 0 : currentItem.cbm
    if (cbmVal <= 0) {
      showError('Validation Error', 'CBM must be greater than 0')
      return
    }

    setItems(prev => [...prev, { ...currentItem, id: Date.now().toString() }])
    setCurrentItem({
      id: Date.now().toString(),
      route: currentItem.route,
      description: '',
      item_quantity: 1,
      cbm: '',
      unit_price: currentItem.unit_price,
      total: 0
    })
  }

  const removeItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id))
  }

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + item.total, 0)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.invoice_number.trim()) {
      showError('Validation Error', 'Invoice number is required')
      return
    }
    if (!formData.sender_name.trim()) {
      showError('Validation Error', "Please enter the sender's name")
      return
    }
    if (!formData.recipient_name.trim()) {
      showError('Validation Error', "Please enter the recipient's name")
      return
    }

    const pendingCbm = typeof currentItem.cbm === 'string' ? parseFloat(currentItem.cbm) || 0 : currentItem.cbm
    const allItems = currentItem.description.trim() && pendingCbm > 0
      ? [...items, { ...currentItem, id: Date.now().toString() }]
      : items

    if (allItems.length === 0) {
      showError('Validation Error', 'Please add at least one delivery item')
      return
    }

    setSaving(true)

    try {
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user?.id)
        .maybeSingle()

      if (!existingProfile) {
        await supabase.from('profiles').insert({
          id: user?.id,
          user_name: userProfile.user_name || 'User',
          contact_email: user?.email
        })
      }

      const total = allItems.reduce((sum, item) => sum + item.total, 0)
      const dueDate = format(
        new Date(new Date(formData.issue_date).getTime() + formData.due_date_days * 86400000),
        'yyyy-MM-dd'
      )

      const itemRows = (invoiceIdForItems: string) =>
        allItems.map(item => ({
          invoice_id: invoiceIdForItems,
          description: item.description,
          shipment_type: item.route || null,
          quantity: typeof item.cbm === 'string' ? parseFloat(item.cbm) : item.cbm,
          item_quantity: typeof item.item_quantity === 'string' ? parseFloat(item.item_quantity) : item.item_quantity,
          cbm: typeof item.cbm === 'string' ? parseFloat(item.cbm) : item.cbm,
          unit_price: typeof item.unit_price === 'string' ? parseFloat(item.unit_price) : item.unit_price,
          total: item.total
        }))

      if (isEditing && invoiceId) {
        const { error: invoiceError } = await supabase
          .from('invoices')
          .update({
            invoice_number: formData.invoice_number,
            issue_date: formData.issue_date,
            due_date: dueDate,
            currency: 'GHS',
            client_id: recipientClientId || null,
            subtotal: total,
            tax_rate: 0,
            tax_amount: 0,
            discount_amount: 0,
            total_amount: total,
            notes: formData.notes || null,
            sender_name: formData.sender_name,
            sender_phone: formData.sender_phone || null,
            sender_address: formData.sender_address || null,
            recipient_name: formData.recipient_name,
            recipient_phone: formData.recipient_phone || null,
            recipient_address: formData.recipient_address || null,
            signature: userProfile.user_name || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', invoiceId)
          .eq('user_id', user?.id)

        if (invoiceError) throw invoiceError

        await supabase.from('invoice_items').delete().eq('invoice_id', invoiceId)

        const { error: itemsError } = await supabase.from('invoice_items').insert(itemRows(invoiceId))

        if (itemsError) throw itemsError

        showSuccess('Updated', `Local delivery invoice ${formData.invoice_number} updated`)
      } else {
        const { data: invoice, error: invoiceError } = await supabase
          .from('invoices')
          .insert({
            user_id: user?.id,
            client_id: recipientClientId || null,
            invoice_type: 'local_delivery',
            invoice_number: formData.invoice_number,
            issue_date: formData.issue_date,
            due_date: dueDate,
            currency: 'GHS',
            subtotal: total,
            tax_rate: 0,
            tax_amount: 0,
            discount_amount: 0,
            total_amount: total,
            notes: formData.notes || null,
            sender_name: formData.sender_name,
            sender_phone: formData.sender_phone || null,
            sender_address: formData.sender_address || null,
            recipient_name: formData.recipient_name,
            recipient_phone: formData.recipient_phone || null,
            recipient_address: formData.recipient_address || null,
            signature: userProfile.user_name || null,
            status: 'draft'
          })
          .select()
          .single()

        if (invoiceError) throw invoiceError

        const { error: itemsError } = await supabase.from('invoice_items').insert(itemRows(invoice.id))

        if (itemsError) throw itemsError

        showSuccess('Created', `Local delivery invoice ${formData.invoice_number} created`)
      }

      setTimeout(() => navigate('/invoices'), 800)
    } catch (error) {
      console.error('Error saving local delivery invoice:', error)
      showError('Error', 'Failed to save this invoice. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto pb-12">
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate('/invoices')}
          className="text-gray-500 hover:text-gray-700 p-2 rounded-lg hover:bg-gray-100"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <Truck className="w-6 h-6 text-primary-500" />
        <h1 className="text-2xl font-bold text-secondary-900">
          {isEditing ? 'Edit Local Delivery Invoice' : 'New Local Delivery Invoice'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-lg font-semibold text-secondary-900 mb-4">Invoice Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Number</label>
              <input
                type="text"
                value={formData.invoice_number}
                onChange={e => setFormData({ ...formData, invoice_number: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input
                type="date"
                value={formData.issue_date}
                onChange={e => setFormData({ ...formData, issue_date: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ETA</label>
              <select
                value={formData.due_date_days}
                onChange={e => setFormData({ ...formData, due_date_days: parseInt(e.target.value) })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500"
              >
                {DUE_DATE_OPTIONS.map(opt => (
                  <option key={opt.days} value={opt.days}>{opt.label}</option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                ETA: {format(new Date(new Date(formData.issue_date).getTime() + formData.due_date_days * 86400000), 'MMM dd, yyyy')}
              </p>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">Currency is fixed to Ghanaian Cedis (₵) for local delivery invoices.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-secondary-900" />
                <h2 className="text-lg font-semibold text-secondary-900">Sender</h2>
              </div>
              <button
                type="button"
                onClick={() => setShowNewSenderForm(!showNewSenderForm)}
                className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                {showNewSenderForm ? 'Cancel' : 'New Client'}
              </button>
            </div>

            {showNewSenderForm ? (
              <div className="space-y-3 bg-gray-50 p-4 rounded-lg border border-gray-200">
                <input
                  type="text"
                  placeholder="Client name *"
                  value={newSender.name}
                  onChange={e => setNewSender({ ...newSender, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500"
                />
                <input
                  type="text"
                  placeholder="Phone number"
                  value={newSender.phone}
                  onChange={e => setNewSender({ ...newSender, phone: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500"
                />
                <textarea
                  placeholder="Address"
                  value={newSender.address}
                  onChange={e => setNewSender({ ...newSender, address: e.target.value })}
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500"
                />
                <button
                  type="button"
                  onClick={handleSaveNewSender}
                  disabled={savingNewSender}
                  className="w-full bg-secondary-900 hover:bg-secondary-800 text-white rounded-lg px-4 py-2 font-medium disabled:opacity-50"
                >
                  {savingNewSender ? 'Saving...' : 'Save & Select Client'}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <select
                  value={senderClientId}
                  onChange={e => handleSelectSenderClient(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">— Select a saved client —</option>
                  {clients.map(client => (
                    <option key={client.id} value={client.id}>{client.name}</option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Sender name"
                  value={formData.sender_name}
                  onChange={e => setFormData({ ...formData, sender_name: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500"
                />
                <input
                  type="text"
                  placeholder="Phone number"
                  value={formData.sender_phone}
                  onChange={e => setFormData({ ...formData, sender_phone: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500"
                />
                <textarea
                  placeholder="Address"
                  value={formData.sender_address}
                  onChange={e => setFormData({ ...formData, sender_address: e.target.value })}
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500"
                />
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-primary-500" />
                <h2 className="text-lg font-semibold text-secondary-900">Recipient</h2>
              </div>
              <button
                type="button"
                onClick={() => setShowNewClientForm(!showNewClientForm)}
                className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                {showNewClientForm ? 'Cancel' : 'New Client'}
              </button>
            </div>

            {showNewClientForm ? (
              <div className="space-y-3 bg-gray-50 p-4 rounded-lg border border-gray-200">
                <input
                  type="text"
                  placeholder="Client name *"
                  value={newClient.name}
                  onChange={e => setNewClient({ ...newClient, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500"
                />
                <input
                  type="text"
                  placeholder="Phone number"
                  value={newClient.phone}
                  onChange={e => setNewClient({ ...newClient, phone: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500"
                />
                <textarea
                  placeholder="Address"
                  value={newClient.address}
                  onChange={e => setNewClient({ ...newClient, address: e.target.value })}
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500"
                />
                <button
                  type="button"
                  onClick={handleSaveNewClient}
                  disabled={savingNewClient}
                  className="w-full bg-secondary-900 hover:bg-secondary-800 text-white rounded-lg px-4 py-2 font-medium disabled:opacity-50"
                >
                  {savingNewClient ? 'Saving...' : 'Save & Select Client'}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <select
                  value={recipientClientId}
                  onChange={e => handleSelectRecipientClient(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">— Select a saved client —</option>
                  {clients.map(client => (
                    <option key={client.id} value={client.id}>{client.name}</option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Recipient name"
                  value={formData.recipient_name}
                  onChange={e => setFormData({ ...formData, recipient_name: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500"
                />
                <input
                  type="text"
                  placeholder="Phone number"
                  value={formData.recipient_phone}
                  onChange={e => setFormData({ ...formData, recipient_phone: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500"
                />
                <textarea
                  placeholder="Address"
                  value={formData.recipient_address}
                  onChange={e => setFormData({ ...formData, recipient_address: e.target.value })}
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500"
                />
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-6">
          <div className="flex items-center gap-2 mb-4">
            <Calculator className="w-5 h-5 text-secondary-900" />
            <h2 className="text-lg font-semibold text-secondary-900">Delivery Items</h2>
          </div>
          <p className="text-xs text-gray-500 mb-4">Total is calculated as CBM × Price per CBM. The quantity of boxes is for reference only and doesn't affect the price.</p>

          {items.length > 0 && (
            <div className="mb-4 border border-gray-200 rounded-lg overflow-hidden overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-3 py-2">Route</th>
                    <th className="text-left px-3 py-2">Description</th>
                    <th className="text-center px-3 py-2">Qty</th>
                    <th className="text-center px-3 py-2">CBM</th>
                    <th className="text-right px-3 py-2">₵/CBM</th>
                    <th className="text-right px-3 py-2">Total</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(item => (
                    <tr key={item.id} className="border-t border-gray-200">
                      <td className="px-3 py-2">{item.route || '—'}</td>
                      <td className="px-3 py-2">{item.description}</td>
                      <td className="px-3 py-2 text-center">{item.item_quantity}</td>
                      <td className="px-3 py-2 text-center">{Number(item.cbm).toFixed(3)}</td>
                      <td className="px-3 py-2 text-right">₵{Number(item.unit_price).toFixed(2)}</td>
                      <td className="px-3 py-2 text-right font-medium">₵{item.total.toFixed(2)}</td>
                      <td className="px-3 py-2 text-right">
                        <button type="button" onClick={() => removeItem(item.id)} className="text-red-500 hover:text-red-700">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quick-fill from saved route</label>
              <select
                value={currentItem.route}
                onChange={e => handleRouteSelect(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500"
              >
                <option value="">— Choose a saved route —</option>
                {savedRoutes.map(route => (
                  <option key={route.id} value={route.shipment_type}>
                    {route.shipment_type} (₵{route.price_per_unit}/CBM)
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <input
                  type="text"
                  placeholder="e.g. 3 boxes of clothing"
                  value={currentItem.description}
                  onChange={e => handleCurrentItemChange('description', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Qty (boxes)</label>
                <input
                  type="number"
                  min="1"
                  value={currentItem.item_quantity}
                  onChange={e => handleCurrentItemChange('item_quantity', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">CBM</label>
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  placeholder="0.500"
                  value={currentItem.cbm}
                  onChange={e => handleCurrentItemChange('cbm', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">₵ / CBM</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={currentItem.unit_price}
                  onChange={e => handleCurrentItemChange('unit_price', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={addItem}
              className="w-full md:w-auto flex items-center justify-center gap-1 bg-secondary-900 hover:bg-secondary-800 text-white rounded-lg px-4 py-2 font-medium"
            >
              <Plus className="w-4 h-4" /> Add Item
            </button>
          </div>

          <div className="flex justify-end mt-6 pt-4 border-t border-gray-200">
            <div className="text-right">
              <p className="text-sm text-gray-500">Total</p>
              <p className="text-2xl font-bold text-primary-500">₵{calculateTotal().toFixed(2)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
          <textarea
            value={formData.notes}
            onChange={e => setFormData({ ...formData, notes: e.target.value })}
            rows={3}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate('/invoices')}
            className="px-5 py-2.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary-500 hover:bg-primary-600 text-white font-medium disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : isEditing ? 'Update Invoice' : 'Save Invoice'}
          </button>
        </div>
      </form>
    </div>
  )
}
