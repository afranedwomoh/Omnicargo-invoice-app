import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { 
  Package, 
  Plus, 
  Edit, 
  Trash2, 
  Save,
  X,
  DollarSign,
  Weight,
  Truck
} from 'lucide-react'

interface ShipmentPrice {
  id: string
  shipment_type: string
  weight_range_min: number
  weight_range_max: number | null
  price_per_unit: number
  unit_type: 'CBM' | 'TON'
  currency: string
  is_active: boolean
}

interface ShipmentPriceForm {
  shipment_type: string
  weight_range_min: number
  weight_range_max: number | null
  price_per_unit: number
  unit_type: 'CBM' | 'TON'
  currency: string
}

export const ShipmentPricing: React.FC = () => {
  const { user } = useAuth()
  const [prices, setPrices] = useState<ShipmentPrice[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingPrice, setEditingPrice] = useState<ShipmentPrice | null>(null)
  const [saving, setSaving] = useState(false)
  
  const [formData, setFormData] = useState<ShipmentPriceForm>({
    shipment_type: '',
    weight_range_min: 0,
    weight_range_max: null,
    price_per_unit: 0,
    unit_type: 'CBM',
    currency: 'USD'
  })

  useEffect(() => {
    if (user) {
      fetchPrices()
    }
  }, [user])

  const fetchPrices = async () => {
    try {
      const { data, error } = await supabase
        .from('shipment_pricing')
        .select('*')
        .eq('user_id', user?.id)
        .eq('is_active', true)
        .order('weight_range_min')

      if (error) throw error
      setPrices(data || [])
    } catch (error) {
      console.error('Error fetching shipment prices:', error)
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      shipment_type: '',
      weight_range_min: 0,
      weight_range_max: null,
      price_per_unit: 0,
      unit_type: 'CBM',
      currency: 'USD'
    })
    setShowForm(false)
    setEditingPrice(null)
  }

  const handleEdit = (price: ShipmentPrice) => {
    setEditingPrice(price)
    setFormData({
      shipment_type: price.shipment_type,
      weight_range_min: price.weight_range_min,
      weight_range_max: price.weight_range_max,
      price_per_unit: price.price_per_unit,
      unit_type: price.unit_type,
      currency: price.currency
    })
    setShowForm(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.shipment_type.trim() || formData.price_per_unit <= 0) {
      alert('Please fill in all required fields')
      return
    }

    setSaving(true)

    try {
      if (editingPrice) {
        // Update existing price
        const { error } = await supabase
          .from('shipment_pricing')
          .update({
            shipment_type: formData.shipment_type,
            weight_range_min: formData.weight_range_min,
            weight_range_max: formData.weight_range_max,
            price_per_unit: formData.price_per_unit,
            unit_type: formData.unit_type,
            currency: formData.currency,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingPrice.id)

        if (error) throw error
      } else {
        // Create new price
        const { error } = await supabase
          .from('shipment_pricing')
          .insert({
            user_id: user?.id,
            shipment_type: formData.shipment_type,
            weight_range_min: formData.weight_range_min,
            weight_range_max: formData.weight_range_max,
            price_per_unit: formData.price_per_unit,
            unit_type: formData.unit_type,
            currency: formData.currency
          })

        if (error) throw error
      }

      resetForm()
      fetchPrices()
    } catch (error) {
      console.error('Error saving shipment price:', error)
      alert('Error saving shipment price. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (priceId: string) => {
    if (!confirm('Are you sure you want to delete this shipment price?')) {
      return
    }

    try {
      const { error } = await supabase
        .from('shipment_pricing')
        .update({ is_active: false })
        .eq('id', priceId)

      if (error) throw error
      fetchPrices()
    } catch (error) {
      console.error('Error deleting shipment price:', error)
      alert('Error deleting shipment price. Please try again.')
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

  const formatWeightRange = (min: number, max: number | null): string => {
    if (max === null) {
      return `Over ${min}kg`
    }
    return `${min}-${max}kg`
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Shipment Pricing</h1>
          <p className="text-gray-600">Manage your sea cargo pricing structure</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors font-medium"
        >
          <Plus className="w-5 h-5 mr-2" />
          Add Price
        </button>
      </div>

      {/* Pricing Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingPrice ? 'Edit Shipment Price' : 'Add New Shipment Price'}
              </h2>
              <button
                onClick={resetForm}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Shipment Type *
                </label>
                <input
                  type="text"
                  value={formData.shipment_type}
                  onChange={(e) => setFormData({ ...formData, shipment_type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="e.g., General Goods (0-300kg)"
                  required
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Min Weight (kg) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.weight_range_min}
                    onChange={(e) => setFormData({ ...formData, weight_range_min: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max Weight (kg)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.weight_range_max || ''}
                    onChange={(e) => setFormData({ ...formData, weight_range_max: e.target.value ? parseFloat(e.target.value) : null })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Leave empty for unlimited"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Price per Unit *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.price_per_unit}
                    onChange={(e) => setFormData({ ...formData, price_per_unit: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Unit Type *
                  </label>
                  <select
                    value={formData.unit_type}
                    onChange={(e) => setFormData({ ...formData, unit_type: e.target.value as 'CBM' | 'TON' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="CBM">Per CBM</option>
                    <option value="TON">Per Ton</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
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
                  disabled={saving}
                  className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saving...' : (editingPrice ? 'Update Price' : 'Add Price')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pricing List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Current Pricing Structure</h2>
            <div className="flex items-center space-x-2">
              <Package className="w-5 h-5 text-gray-400" />
              <span className="text-sm text-gray-600">{prices.length} price tiers</span>
            </div>
          </div>
        </div>

        {prices.length === 0 ? (
          <div className="text-center py-12">
            <Truck className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 text-lg mb-2">No shipment prices configured</p>
            <p className="text-gray-400 mb-6">Add your first shipment price to get started</p>
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors font-medium"
            >
              <Plus className="w-5 h-5 mr-2" />
              Add Price
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Shipment Type
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Weight Range
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Price
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Unit
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {prices.map((price) => (
                  <tr key={price.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="p-2 bg-primary-100 rounded-lg mr-3">
                          <Package className="w-4 h-4 text-primary-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{price.shipment_type}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-600">
                        <Weight className="w-4 h-4 mr-1" />
                        {formatWeightRange(price.weight_range_min, price.weight_range_max)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end text-sm font-medium text-gray-900">
                        <DollarSign className="w-4 h-4 mr-1" />
                        {getCurrencySymbol(price.currency)}{price.price_per_unit.toFixed(2)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        Per {price.unit_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-1">
                        <button
                          onClick={() => handleEdit(price)}
                          className="text-gray-400 hover:text-primary-600 p-2 rounded-lg hover:bg-primary-50 transition-colors"
                          title="Edit Price"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(price.id)}
                          className="text-gray-400 hover:text-red-600 p-2 rounded-lg hover:bg-red-50 transition-colors"
                          title="Delete Price"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pricing Guidelines */}
      <div className="bg-blue-50 p-6 rounded-xl border border-blue-200">
        <div className="flex items-start">
          <Package className="w-6 h-6 text-blue-600 mr-3 mt-0.5" />
          <div>
            <h3 className="text-lg font-semibold text-blue-900 mb-2">Pricing Guidelines</h3>
            <div className="text-sm text-blue-800 space-y-2">
              <p>• <strong>Weight Ranges:</strong> Define clear weight categories for different pricing tiers</p>
              <p>• <strong>Unit Types:</strong> Use CBM for volume-based pricing, TON for weight-based pricing</p>
              <p>• <strong>Overlapping Ranges:</strong> Avoid overlapping weight ranges to prevent pricing conflicts</p>
              <p>• <strong>Regular Updates:</strong> Review and update prices regularly based on market conditions</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
