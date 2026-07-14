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
  description: string
  quantity: number | string
  unit_price: number | string
  total: number
}

const DUE_DATE_OPTIONS = [
  { label: 'Same day', days: 0 },
  { label: '1 day', days: 1 },
  { label: '3 days', days: 3 },
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

  const [formData, setFormData] = useState({
    invoice_number: '',
    issue_date: format(new Date(), 'yyyy-MM-dd'),
    due_date_days: 0,
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
    description: '',
    quantity: 1,
    unit_price: '',
    total: 0
  })

  useEffect(() => {
    if (user) {
      fetchUserProfile()
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
        due_date_days: 0,
        sender_name: invoice.sender_name || '',
        sender_phone: invoice.sender_phone || '',
        sender_address: invoice.sender_address || '',
        recipient_name: invoice.recipient_name || '',
        recipient_phone: invoice.recipient_phone || '',
        recipient_address: invoice.recipient_address || '',
        notes: invoice.notes || ''
      })

      const { data: itemsData, error: itemsError } = await supabase
        .from('invoice_items')
        .select('*')
        .eq('invoice_id', id)

      if (itemsError) throw itemsError

      setItems(
        (itemsData || []).map((item: any) => ({
          id: item.id,
          description: item.description,
          quantity: item.quantity,
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

  const calculateItemTotal = (quantity: number | string, unitPrice: number | string) => {
    const qty = typeof quantity === 'string' ? parseFloat(quantity) || 0 : quantity
    const price = typeof unitPrice === 'string' ? parseFloat(unitPrice) || 0 : unitPrice
    return qty * price
  }

  const handleCurrentItemChange = (field: keyof DeliveryItem, value: string | number) => {
    const updated = { ...currentItem, [field]: value }
    updated.total = calculateItemTotal(updated.quantity, updated.unit_price)
    setCurrentItem(updated)
  }

  const addItem = () => {
    if (!currentItem.description.trim()) {
      showError('Validation Error', 'Enter a description for this item')
      return
    }
    const qty = typeof currentItem.quantity === 'string' ? parseFloat(currentItem.quantity) || 0 : currentItem.quantity
    if (qty <= 0) {
      showError('Validation Error', 'Quantity must be greater than 0')
      return
    }

    setItems(prev => [...prev, { ...currentItem, id: Date.now().toString() }])
    setCurrentItem({
      id: Date.now().toString(),
      description: '',
      quantity: 1,
      unit_price: '',
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
    if (items.length === 0) {
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

      const total = calculateTotal()
      const dueDate = format(
        new Date(new Date(formData.issue_date).getTime() + formData.due_date_days * 86400000),
        'yyyy-MM-dd'
      )

      if (isEditing && invoiceId) {
        const { error: invoiceError } = await supabase
          .from('invoices')
          .update({
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
            updated_at: new Date().toISOString()
          })
          .eq('id', invoiceId)
          .eq('user_id', user?.id)

        if (invoiceError) throw invoiceError

        await supabase.from('invoice_items').delete().eq('invoice_id', invoiceId)

        const { error: itemsError } = await supabase.from('invoice_items').insert(
          items.map(item => ({
            invoice_id: invoiceId,
            description: item.description,
            quantity: typeof item.quantity === 'string' ? parseFloat(item.quantity) : item.quantity,
            unit_price: typeof item.unit_price === 'string' ? parseFloat(item.unit_price) : item.unit_price,
            total: item.total
          }))
        )

        if (itemsError) throw itemsError

        showSuccess('Updated', `Local delivery invoice ${formData.invoice_number} updated`)
      } else {
        const { data: invoice, error: invoiceError } = await supabase
          .from('invoices')
          .insert({
            user_id: user?.id,
            client_id: null,
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

        const { error: itemsError } = await supabase.from('invoice_items').insert(
          items.map(item => ({
            invoice_id: invoice.id,
            description: item.description,
            quantity: typeof item.quantity === 'string' ? parseFloat(item.quantity) : item.quantity,
            unit_price: typeof item.unit_price === 'string' ? parseFloat(item.unit_price) : item.unit_price,
            total: item.total
          }))
        )

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
              <label className="block text-sm font-medium text-gray-700 mb-1">Due</label>
              <select
                value={formData.due_date_days}
                onChange={e => setFormData({ ...formData, due_date_days: parseInt(e.target.value) })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500"
              >
                {DUE_DATE_OPTIONS.map(opt => (
                  <option key={opt.days} value={opt.days}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">Currency is fixed to Ghanaian Cedis (₵) for local delivery invoices.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex items-center gap-2 mb-4">
              <User className="w-5 h-5 text-secondary-900" />
              <h2 className="text-lg font-semibold text-secondary-900">Sender</h2>
            </div>
            <div className="space-y-3">
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
          </div>

          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex items-center gap-2 mb-4">
              <User className="w-5 h-5 text-primary-500" />
              <h2 className="text-lg font-semibold text-secondary-900">Recipient</h2>
            </div>
            <div className="space-y-3">
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
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-6">
          <div className="flex items-center gap-2 mb-4">
            <Calculator className="w-5 h-5 text-secondary-900" />
            <h2 className="text-lg font-semibold text-secondary-900">Delivery Items</h2>
          </div>

          {items.length > 0 && (
            <div className="mb-4 border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-3 py-2">Description</th>
                    <th className="text-center px-3 py-2">Qty</th>
                    <th className="text-right px-3 py-2">Price</th>
                    <th className="text-right px-3 py-2">Total</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(item => (
                    <tr key={item.id} className="border-t border-gray-200">
                      <td className="px-3 py-2">{item.description}</td>
                      <td className="px-3 py-2 text-center">{item.quantity}</td>
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

          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <input
                type="text"
                placeholder="e.g. Package delivery to East Legon"
                value={currentItem.description}
                onChange={e => handleCurrentItemChange('description', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Qty</label>
              <input
                type="number"
                min="1"
                value={currentItem.quantity}
                onChange={e => handleCurrentItemChange('quantity', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Price (₵)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={currentItem.unit_price}
                onChange={e => handleCurrentItemChange('unit_price', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <button
              type="button"
              onClick={addItem}
              className="flex items-center justify-center gap-1 bg-secondary-900 hover:bg-secondary-800 text-white rounded-lg px-3 py-2 font-medium"
            >
              <Plus className="w-4 h-4" /> Add
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
