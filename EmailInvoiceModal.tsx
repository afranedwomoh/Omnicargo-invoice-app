import React, { useState } from 'react'
import { Modal } from './Modal'
import { Mail, Send, User, FileText, Download, Eye, Info, AlertCircle, Paperclip } from 'lucide-react'
import { generateInvoicePDF } from '../../utils/pdfGenerator'
import { useToast } from '../../hooks/useToast'

interface EmailInvoiceModalProps {
  isOpen: boolean
  onClose: () => void
  onSend: (emailData: { to_email: string; subject: string; message: string }) => Promise<void>
  invoice: {
    id: string
    invoice_number: string
    client_name: string
    client_email: string | null
    total_amount: number
    due_date: string
    currency: string
  } | null
  businessName: string
  loading?: boolean
  onPreviewInvoice?: () => void
  invoiceDetails?: any
}

export const EmailInvoiceModal: React.FC<EmailInvoiceModalProps> = ({
  isOpen,
  onClose,
  onSend,
  invoice,
  businessName,
  loading = false,
  onPreviewInvoice,
  invoiceDetails
}) => {
  const [emailData, setEmailData] = useState({
    to_email: '',
    subject: '',
    message: ''
  })
  const [sendingEmail, setSendingEmail] = useState(false)
  const [emailValidation, setEmailValidation] = useState({ isValid: true, message: '' })
  const { showSuccess, showError, showInfo } = useToast()

  React.useEffect(() => {
    if (invoice && isOpen) {
      const getCurrencySymbol = (currency: string): string => {
        switch (currency) {
          case 'USD': return '$'
          case 'EUR': return '€'
          case 'GBP': return '£'
          case 'GHS': return '₵'
          default: return '$'
        }
      }

      // Prepopulate client's email
      const clientEmail = invoice.client_email || ''
      
      setEmailData({
        to_email: clientEmail,
        subject: `Invoice ${invoice.invoice_number} from ${businessName}`,
        message: `Dear ${invoice.client_name},

I hope this email finds you well.

Please find attached your invoice for our freight forwarding services:

Invoice Number: ${invoice.invoice_number}
Amount: ${getCurrencySymbol(invoice.currency)}${invoice.total_amount.toFixed(2)}
Due Date: ${new Date(invoice.due_date).toLocaleDateString()}

We appreciate your business and look forward to your prompt payment.

If you have any questions regarding this invoice, please don't hesitate to contact us at omnicargosolutionslimited@gmail.com.

Thank you for choosing OmniCargo Solutions Limited for your freight forwarding needs.

Best regards,
OmniCargo Solutions Limited
Website: omnicargosolutions.com
Professional Freight Forwarding Services`
      })

      // Validate email if provided
      if (clientEmail) {
        validateEmail(clientEmail)
      } else {
        setEmailValidation({ 
          isValid: false, 
          message: 'No email address found for this client. Please add an email address in the client details.' 
        })
      }
    }
  }, [invoice, isOpen, businessName])

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    
    if (!email.trim()) {
      setEmailValidation({ 
        isValid: false, 
        message: 'Email address is required' 
      })
      return false
    }
    
    if (!emailRegex.test(email)) {
      setEmailValidation({ 
        isValid: false, 
        message: 'Please enter a valid email address' 
      })
      return false
    }
    
    setEmailValidation({ 
      isValid: true, 
      message: '' 
    })
    return true
  }

  const handleEmailChange = (email: string) => {
    setEmailData({ ...emailData, to_email: email })
    validateEmail(email)
  }

  const handleSend = async () => {
    if (!emailData.to_email.trim() || !emailData.subject.trim() || !emailData.message.trim()) {
      showError('Validation Error', 'Please fill in all required fields')
      return
    }

    if (!validateEmail(emailData.to_email)) {
      showError('Invalid Email', 'Please enter a valid email address')
      return
    }

    setSendingEmail(true)
    try {
      await onSend(emailData)
      showSuccess('Email Sent Successfully!', `Invoice ${invoice?.invoice_number} has been sent to ${emailData.to_email}`)
      onClose()
    } catch (error) {
      console.error('Error sending email:', error)
      showError('Email Failed', error.message || 'Failed to send email. Please try again.')
    } finally {
      setSendingEmail(false)
    }
  }

  const handleDownloadInvoice = () => {
    if (invoiceDetails) {
      generateInvoicePDF(invoiceDetails)
      showInfo('PDF Downloaded', 'Invoice PDF has been downloaded to your device')
    }
  }

  if (!invoice) return null

  const getCurrencySymbol = (currency: string): string => {
    switch (currency) {
      case 'USD': return '$'
      case 'EUR': return '€'
      case 'GBP': return '£'
      case 'GHS': return '₵'
      default: return '$'
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Send Invoice via Email" size="lg">
      <div className="p-6">
        {/* Sender Information */}
        <div className="bg-blue-50 p-4 rounded-lg mb-6 border border-blue-200">
          <div className="flex items-start space-x-3">
            <Mail className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-blue-900">Email Sender Information</h4>
              <p className="text-sm text-blue-700 mt-1">
                <strong>From:</strong> OmniCargo Solutions Limited
              </p>
              <p className="text-sm text-blue-700">
                <strong>Email:</strong> omnicargosolutionslimited@gmail.com
              </p>
              <p className="text-xs text-blue-600 mt-2">
                This email will be sent from the official OmniCargo Solutions email address with the invoice attached as PDF.
              </p>
            </div>
          </div>
        </div>

        {/* Invoice Info */}
        <div className="bg-gray-50 p-4 rounded-lg mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-primary-100 rounded-lg">
                <FileText className="w-5 h-5 text-primary-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Invoice #{invoice.invoice_number}</h3>
                <p className="text-sm text-gray-600">To: {invoice.client_name}</p>
                <p className="text-sm text-gray-600">
                  Amount: {getCurrencySymbol(invoice.currency)}{invoice.total_amount.toFixed(2)}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {onPreviewInvoice && (
                <button
                  onClick={onPreviewInvoice}
                  className="flex items-center px-3 py-2 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                  title="Preview Invoice"
                >
                  <Eye className="w-4 h-4 mr-1" />
                  Preview
                </button>
              )}
              {invoiceDetails && (
                <button
                  onClick={handleDownloadInvoice}
                  className="flex items-center px-3 py-2 text-sm text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors"
                  title="Download Invoice PDF"
                >
                  <Download className="w-4 h-4 mr-1" />
                  Download PDF
                </button>
              )}
            </div>
          </div>
        </div>

        {/* PDF Attachment Notice */}
        <div className="bg-green-50 border border-green-200 p-4 rounded-lg mb-6">
          <div className="flex items-start space-x-3">
            <Paperclip className="w-5 h-5 text-green-600 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-green-900">PDF Attachment</h4>
              <p className="text-sm text-green-700 mt-1">
                The invoice will be automatically attached as a PDF file to the email.
              </p>
            </div>
          </div>
        </div>

        {/* Email Form */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Mail className="w-4 h-4 inline mr-1" />
              Recipient Email *
            </label>
            <input
              type="email"
              value={emailData.to_email}
              onChange={(e) => handleEmailChange(e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                emailValidation.isValid ? 'border-gray-300' : 'border-red-300 bg-red-50'
              }`}
              placeholder="client@example.com"
              required
            />
            {!emailValidation.isValid && (
              <p className="text-sm text-red-600 mt-1 flex items-center">
                <AlertCircle className="w-4 h-4 mr-1" />
                {emailValidation.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Subject *
            </label>
            <input
              type="text"
              value={emailData.subject}
              onChange={(e) => setEmailData({ ...emailData, subject: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Invoice subject"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Message *
            </label>
            <textarea
              value={emailData.message}
              onChange={(e) => setEmailData({ ...emailData, message: e.target.value })}
              rows={16}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Email message"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              This message will be sent to the client along with the attached invoice PDF.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3 mt-6 pt-6 border-t border-gray-200">
          <button
            onClick={onClose}
            disabled={sendingEmail}
            className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={sendingEmail || !emailValidation.isValid || !emailData.to_email.trim()}
            className="flex items-center px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            {sendingEmail ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Sending Email...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Send Email with PDF
              </>
            )}
          </button>
        </div>

        {/* Help Section */}
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-600">
            <strong>Email Delivery:</strong> The email will be sent directly from omnicargosolutionslimited@gmail.com 
            with the invoice attached as a PDF. The client will receive a professional email with all invoice details 
            and can download or print the PDF attachment.
          </p>
        </div>
      </div>
    </Modal>
  )
}