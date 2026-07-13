import { supabase } from '../lib/supabase'
import { generateInvoicePDFBase64 } from './pdfGenerator'

interface EmailData {
  to_email: string
  to_name: string
  invoice_number: string
  invoice_amount: string
  due_date: string
  business_name: string
  invoice_url?: string
}

interface EmailFormData {
  to_email: string
  subject: string
  message: string
}

interface InvoiceEmailData {
  to_email: string
  to_name?: string
  subject: string
  message: string
  invoice_number: string
  invoice_amount: string
  eta: string
  business_name: string
  invoice_pdf_base64?: string
}

// Send invoice email directly through Supabase Edge Function with PDF attachment
export const sendEmailToClient = async (emailData: EmailFormData, invoiceData?: any): Promise<void> => {
  try {
    // Get the Supabase URL for the edge function
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
    
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Supabase configuration missing')
    }

    // Generate PDF as base64 for attachment if invoice details are provided
    let pdfBase64 = ''
    if (invoiceData) {
      try {
        pdfBase64 = await generateInvoicePDFBase64(invoiceData)
      } catch (error) {
        console.error('Error generating PDF for email:', error)
        throw new Error('Failed to generate PDF attachment')
      }
    }

    // Prepare the email payload
    const emailPayload: InvoiceEmailData = {
      to_email: emailData.to_email,
      to_name: extractNameFromEmail(emailData.to_email),
      subject: emailData.subject,
      message: emailData.message,
      invoice_number: invoiceData?.invoice_number || 'N/A',
      invoice_amount: invoiceData?.total_amount ? `${getCurrencySymbol(invoiceData.currency || 'USD')}${invoiceData.total_amount.toFixed(2)}` : 'N/A',
      eta: invoiceData?.due_date ? new Date(invoiceData.due_date).toLocaleDateString() : 'N/A',
      business_name: invoiceData?.business?.name || 'OmniCargo Solutions Limited',
      invoice_pdf_base64: pdfBase64
    }

    // Call the Supabase Edge Function
    const response = await fetch(`${supabaseUrl}/functions/v1/send-invoice-email`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailPayload)
    })

    if (!response.ok) {
      const errorData = await response.json()
      
      // Handle specific email service configuration error
      if (errorData.error === 'Email service not configured') {
        throw new EmailConfigurationError('Email service is not properly configured. Please set up your email service in Supabase.')
      }
      
      throw new Error(errorData.error || 'Failed to send email')
    }

    const result = await response.json()
    console.log('Email sent successfully with PDF attachment:', result)
    
  } catch (error) {
    console.error('Failed to send email:', error)
    
    // Re-throw EmailConfigurationError as-is for specific handling
    if (error instanceof EmailConfigurationError) {
      throw error
    }
    
    throw new Error(`Failed to send email: ${error.message}`)
  }
}

// Custom error class for email configuration issues
export class EmailConfigurationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'EmailConfigurationError'
  }
}

// Enhanced email service with proper sender configuration
export const sendInvoiceEmailDirect = async (emailData: InvoiceEmailData): Promise<void> => {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
    
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Supabase configuration missing')
    }

    const response = await fetch(`${supabaseUrl}/functions/v1/send-invoice-email`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailData)
    })

    if (!response.ok) {
      const errorData = await response.json()
      
      if (errorData.error === 'Email service not configured') {
        throw new EmailConfigurationError('Email service is not properly configured. Please set up your email service in Supabase.')
      }
      
      throw new Error(errorData.error || 'Failed to send email')
    }

    const result = await response.json()
    console.log('Email sent successfully:', result)
    
  } catch (error) {
    console.error('Failed to send email:', error)
    
    if (error instanceof EmailConfigurationError) {
      throw error
    }
    
    throw new Error(`Failed to send email: ${error.message}`)
  }
}

// Helper function to extract name from email
const extractNameFromEmail = (email: string): string => {
  const localPart = email.split('@')[0]
  return localPart
    .replace(/[._]/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

// Helper function to get currency symbol
const getCurrencySymbol = (currency: string): string => {
  switch (currency) {
    case 'USD': return '$'
    case 'EUR': return '€'
    case 'GBP': return '£'
    case 'GHS': return '₵'
    default: return '$'
  }
}

// Fallback method using a simple mailto link
export const sendInvoiceEmailSimple = (emailData: EmailData): void => {
  const subject = `Invoice ${emailData.invoice_number} from ${emailData.business_name || 'OmniCargo Solutions'}`
  const body = `Dear ${emailData.to_name},

Please find your invoice details below:

Invoice Number: ${emailData.invoice_number}
Amount: ${emailData.invoice_amount}
Due Date: ${emailData.due_date}

Thank you for your business!

Best regards,
OmniCargo Solutions Limited
Email: omnicargosolutionslimited@gmail.com`

  const mailtoLink = `mailto:${emailData.to_email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  window.open(mailtoLink)
}

// Check if email service is configured
export const checkEmailServiceConfiguration = async (): Promise<boolean> => {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
    
    if (!supabaseUrl || !supabaseAnonKey) {
      return false
    }

    // Test the email service configuration with a minimal request
    const response = await fetch(`${supabaseUrl}/functions/v1/send-invoice-email`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to_email: 'test@example.com',
        subject: 'Configuration Test',
        message: 'Test',
        invoice_number: 'TEST',
        invoice_amount: '$0.00',
        due_date: 'N/A',
        business_name: 'Test'
      })
    })

    const result = await response.json()
    
    // If we get the specific configuration error, service is not configured
    if (result.error === 'Email service not configured') {
      return false
    }
    
    // Any other response (including other errors) means the service is configured
    return true
    
  } catch (error) {
    console.error('Error checking email service configuration:', error)
    return false
  }
}

// Configuration helper for email setup
export const getEmailSetupInstructions = (): string => {
  return `
🔧 Email Service Setup Required

To send invoices via email, you need to configure an email service:

📋 STEP-BY-STEP SETUP:

1. 📧 Sign up for Resend (https://resend.com/)
   - Free tier: 3,000 emails/month
   - Professional email delivery
   - Easy integration

2. 🔑 Get your API key:
   - Login to Resend dashboard
   - Go to API Keys section
   - Create a new API key
   - Copy the key (starts with 're_')

3. ⚙️ Configure in Supabase:
   - Open your Supabase project dashboard
   - Go to Project Settings → Edge Functions
   - Add environment variable:
     Name: RESEND_API_KEY
     Value: [your API key from step 2]

4. ✅ Verify setup:
   - Save the environment variable
   - Try sending an email again

🔄 ALTERNATIVE SERVICES:
- SendGrid (sendgrid.com)
- Postmark (postmarkapp.com)
- Amazon SES (aws.amazon.com/ses)

💡 TEMPORARY WORKAROUND:
Use the "Open in Email Client" option to compose emails manually until the service is configured.

Need help? Contact support with your Supabase project details.
  `
}
