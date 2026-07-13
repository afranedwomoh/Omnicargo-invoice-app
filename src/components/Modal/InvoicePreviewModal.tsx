import React from 'react'
import { Modal } from './Modal'
import { format } from 'date-fns'
import { Building, User, Mail, Phone, MapPin, Hash, UserCheck } from 'lucide-react'

interface InvoicePreviewData {
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
    logo?: string | null
  }
}

interface InvoicePreviewModalProps {
  isOpen: boolean
  onClose: () => void
  invoice: InvoicePreviewData | null
}

export const InvoicePreviewModal: React.FC<InvoicePreviewModalProps> = ({
  isOpen,
  onClose,
  invoice
}) => {
  if (!invoice) return null

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

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Invoice Preview" size="xl">
      <div className="p-6 bg-white relative">
        {/* Watermark */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <img 
            src="/logoomni-removebg-preview.png" 
            alt="Watermark" 
            className="w-80 h-80 opacity-5"
          />
        </div>

        {/* Content */}
        <div className="relative z-10">
          {/* Header */}
          <div className="flex justify-between items-start mb-8">
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-3 bg-primary-100 rounded-xl">
                  <img 
                    src="/logoomni-removebg-preview.png" 
                    alt="Company Logo" 
                    className="w-8 h-8 object-contain"
                  />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    {invoice.business.name || 'OmniCargo Solutions'}
                  </h1>
                  <p className="text-gray-600">Invoice Management</p>
                </div>
              </div>
              
              {invoice.business.address && (
                <div className="flex items-start space-x-2 text-sm text-gray-600 mb-2">
                  <MapPin className="w-4 h-4 mt-0.5" />
                  <span>{invoice.business.address}</span>
                </div>
              )}
              
              {invoice.business.phone && (
                <div className="flex items-center space-x-2 text-sm text-gray-600 mb-2">
                  <Phone className="w-4 h-4" />
                  <span>{invoice.business.phone}</span>
                </div>
              )}
              
              {invoice.business.email && (
                <div className="flex items-center space-x-2 text-sm text-gray-600 mb-2">
                  <Mail className="w-4 h-4" />
                  <span>{invoice.business.email}</span>
                </div>
              )}
              
              {invoice.business.tax_id && (
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Hash className="w-4 h-4" />
                  <span>Tax ID: {invoice.business.tax_id}</span>
                </div>
              )}
            </div>
            
            <div className="text-right">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">INVOICE</h2>
              <p className="text-lg text-gray-600 mb-4">#{invoice.invoice_number}</p>
              
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-gray-600">Issue Date: </span>
                  <span className="font-medium">{format(new Date(invoice.issue_date), 'MMM dd, yyyy')}</span>
                </div>
                <div>
                  <span className="text-gray-600">ETA: </span>
                  <span className="font-medium">{format(new Date(invoice.due_date), 'MMM dd, yyyy')}</span>
                </div>
                <div>
                  <span className="text-gray-600">Status: </span>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getStatusColor(invoice.status)}`}>
                    {invoice.status}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Bill To */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Bill To:</h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-start space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <User className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">{invoice.client.name}</h4>
                  
                  {invoice.client.address && (
                    <div className="flex items-start space-x-2 text-sm text-gray-600 mb-1">
                      <MapPin className="w-4 h-4 mt-0.5" />
                      <span>{invoice.client.address}</span>
                    </div>
                  )}
                  
                  {invoice.client.email && (
                    <div className="flex items-center space-x-2 text-sm text-gray-600 mb-1">
                      <Mail className="w-4 h-4" />
                      <span>{invoice.client.email}</span>
                    </div>
                  )}
                  
                  {invoice.client.phone && (
                    <div className="flex items-center space-x-2 text-sm text-gray-600 mb-1">
                      <Phone className="w-4 h-4" />
                      <span>{invoice.client.phone}</span>
                    </div>
                  )}
                  
                  {invoice.client.tax_id && (
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Hash className="w-4 h-4" />
                      <span>Tax ID: {invoice.client.tax_id}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Items:</h3>
            <div className="overflow-x-auto">
              <table className="w-full border border-gray-200 rounded-lg">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Shipment Type</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Description</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">Qty</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">CBM</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Price</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {invoice.items.map((item, index) => {
                    // Parse shipment type and description from the description field
                    const parts = item.description.split(': ')
                    const shipmentType = parts.length > 1 ? parts[0] : (item.shipment_type || 'N/A')
                    const description = parts.length > 1 ? parts[1] : item.description

                    // Calculate individual values from stored data
                    const totalCBM = item.quantity // This was stored as total CBM
                    const individualQty = item.item_quantity || 1
                    const individualCBM = item.cbm || (totalCBM / individualQty)

                    return (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-900">{shipmentType}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{description}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 text-center">{individualQty}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 text-center">{individualCBM.toFixed(3)}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 text-right">
                          {getCurrencySymbol(invoice.currency)}{item.unit_price.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right">
                          {getCurrencySymbol(invoice.currency)}{item.total.toFixed(2)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals */}
          <div className="flex justify-end mb-8">
            <div className="w-80">
              <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-medium">{getCurrencySymbol(invoice.currency)}{invoice.subtotal.toFixed(2)}</span>
                </div>
                
                {invoice.tax_rate > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Tax ({invoice.tax_rate}%):</span>
                    <span className="font-medium">{getCurrencySymbol(invoice.currency)}{invoice.tax_amount.toFixed(2)}</span>
                  </div>
                )}
                
                {invoice.discount_amount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Discount:</span>
                    <span className="font-medium text-red-600">-{getCurrencySymbol(invoice.currency)}{invoice.discount_amount.toFixed(2)}</span>
                  </div>
                )}
                
                <div className="border-t border-gray-200 pt-2">
                  <div className="flex justify-between text-lg font-semibold">
                    <span>Total:</span>
                    <span className="text-primary-600">{getCurrencySymbol(invoice.currency)}{invoice.total_amount.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Created By */}
          {invoice.signature && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <UserCheck className="w-5 h-5 mr-2" />
                Created By:
              </h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="border-b border-gray-300 pb-2 mb-2 w-64">
                  <p className="text-lg font-medium text-gray-900">{invoice.signature}</p>
                </div>
                <p className="text-sm text-gray-600">Authorized Representative</p>
              </div>
            </div>
          )}

          {/* Notes and Payment Instructions */}
          {(invoice.notes || invoice.payment_instructions) && (
            <div className="space-y-6">
              {invoice.notes && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Notes:</h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{invoice.notes}</p>
                  </div>
                </div>
              )}
              
              {invoice.payment_instructions && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Terms and Conditions:</h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{invoice.payment_instructions}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}
