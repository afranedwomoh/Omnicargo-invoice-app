import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import { format } from 'date-fns'

interface InvoiceData {
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
  invoice_type?: string
  sender?: {
    name: string | null
    phone: string | null
    address: string | null
  }
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

const generateLocalDeliveryPDF = async (invoiceData: InvoiceData): Promise<void> => {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.width
  const pageHeight = doc.internal.pageSize.height
  let yPosition = 15

  const primaryColor = '#FB6600'
  const secondaryColor = '#022A65'
  const lightGray = '#F8F9FA'
  const darkGray = '#374151'
  const sender = invoiceData.sender || { name: null, phone: null, address: null }

  doc.setFillColor(primaryColor)
  doc.rect(0, 0, pageWidth, 40, 'F')

  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor('#FFFFFF')
  doc.text('OmniCargo Solutions - Local Delivery', 15, 18)

  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.text('INVOICE', pageWidth - 50, 18)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.text(`#${invoiceData.invoice_number}`, pageWidth - 50, 28)

  yPosition = 55
  doc.setFontSize(9)
  doc.setTextColor(darkGray)
  doc.setFont('helvetica', 'normal')
  doc.text(`Invoice Date: ${format(new Date(invoiceData.issue_date), 'MMM dd, yyyy')}`, 15, yPosition)
  doc.text(`Due: ${format(new Date(invoiceData.due_date), 'MMM dd, yyyy')}`, pageWidth - 70, yPosition)

  yPosition += 15
  const boxWidth = (pageWidth - 30 - 10) / 2

  doc.setFillColor(lightGray)
  doc.rect(15, yPosition, boxWidth, 35, 'F')
  doc.rect(15 + boxWidth + 10, yPosition, boxWidth, 35, 'F')

  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(secondaryColor)
  doc.text('SENDER', 19, yPosition + 8)
  doc.setTextColor(primaryColor)
  doc.text('RECIPIENT', 19 + boxWidth + 10, yPosition + 8)

  doc.setFont('helvetica', 'normal')
  doc.setTextColor(darkGray)
  doc.setFontSize(9)
  doc.text(sender.name || '-', 19, yPosition + 15)
  if (sender.phone) doc.text(sender.phone, 19, yPosition + 21)
  if (sender.address) doc.text(doc.splitTextToSize(sender.address, boxWidth - 8).slice(0, 2), 19, yPosition + 27)

  doc.text(invoiceData.client.name, 19 + boxWidth + 10, yPosition + 15)
  if (invoiceData.client.phone) doc.text(invoiceData.client.phone, 19 + boxWidth + 10, yPosition + 21)
  if (invoiceData.client.address) doc.text(doc.splitTextToSize(invoiceData.client.address, boxWidth - 8).slice(0, 2), 19 + boxWidth + 10, yPosition + 27)

  yPosition += 50

  const tableX = 15
  const tableWidth = pageWidth - 30
  const columns = [
    { label: 'ROUTE', width: tableWidth * 0.22, align: 'left' },
    { label: 'DESCRIPTION', width: tableWidth * 0.28, align: 'left' },
    { label: 'QTY', width: tableWidth * 0.1, align: 'center' },
    { label: 'CBM', width: tableWidth * 0.15, align: 'center' },
    { label: 'PRICE', width: tableWidth * 0.125, align: 'right' },
    { label: 'TOTAL', width: tableWidth * 0.125, align: 'right' }
  ]
  let colX = tableX
  const colPositions = columns.map(col => {
    const pos = { x: colX, width: col.width, align: col.align }
    colX += col.width
    return pos
  })

  doc.setFillColor(secondaryColor)
  doc.rect(tableX, yPosition, tableWidth, 10, 'F')
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor('#FFFFFF')
  columns.forEach((col, i) => {
    const pos = colPositions[i]
    let textX = pos.x + 2
    if (col.align === 'center') textX = pos.x + pos.width / 2
    if (col.align === 'right') textX = pos.x + pos.width - 2
    doc.text(col.label, textX, yPosition + 7, { align: col.align as any })
  })

  yPosition += 10
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(darkGray)

  invoiceData.items.forEach((item, index) => {
    if (index % 2 === 0) {
      doc.setFillColor('#F9FAFB')
      doc.rect(tableX, yPosition, tableWidth, 8, 'F')
    }
    doc.setFontSize(7)
    const cbmVal = item.cbm ?? item.quantity
    const rowData = [
      item.shipment_type || '-',
      item.description,
      String(item.item_quantity ?? '-'),
      cbmVal.toFixed(3),
      `₵${item.unit_price.toFixed(2)}`,
      `₵${item.total.toFixed(2)}`
    ]
    rowData.forEach((cell, i) => {
      const col = columns[i]
      const pos = colPositions[i]
      let textX = pos.x + 2
      if (col.align === 'center') textX = pos.x + pos.width / 2
      if (col.align === 'right') textX = pos.x + pos.width - 2
      doc.text(doc.splitTextToSize(cell, pos.width - 4)[0] || cell, textX, yPosition + 5.5, { align: col.align as any })
    })
    yPosition += 8
  })

  doc.setDrawColor('#E5E7EB')
  doc.rect(tableX, yPosition - (invoiceData.items.length * 8) - 10, tableWidth, (invoiceData.items.length * 8) + 10)

  yPosition += 12
  doc.setDrawColor(primaryColor)
  doc.setLineWidth(1)
  doc.line(pageWidth - 90, yPosition, pageWidth - 15, yPosition)
  yPosition += 8
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(primaryColor)
  doc.text('TOTAL:', pageWidth - 90, yPosition)
  doc.text(`₵${invoiceData.total_amount.toFixed(2)}`, pageWidth - 15, yPosition, { align: 'right' })

  yPosition += 15
  if (invoiceData.signature) {
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(secondaryColor)
    doc.text('CREATED BY:', 15, yPosition)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(darkGray)
    doc.setFontSize(9)
    doc.text(invoiceData.signature, 15, yPosition + 8)
    yPosition += 15
  }

  if (invoiceData.notes && yPosition < pageHeight - 30) {
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(secondaryColor)
    doc.text('NOTES:', 15, yPosition)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(darkGray)
    doc.setFontSize(7)
    doc.text(doc.splitTextToSize(invoiceData.notes, pageWidth - 30).slice(0, 3), 15, yPosition + 6)
  }

  const footerY = pageHeight - 15
  doc.setFillColor(lightGray)
  doc.rect(0, footerY - 5, pageWidth, 20, 'F')
  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(darkGray)
  doc.text(`Generated on ${format(new Date(), 'MMM dd, yyyy')}`, 15, footerY)
  doc.text(`Invoice #${invoiceData.invoice_number}`, pageWidth - 60, footerY)

  doc.save(`Invoice-${invoiceData.invoice_number}.pdf`)
}

export const generateInvoicePDF = async (invoiceData: InvoiceData): Promise<void> => {
  if (invoiceData.invoice_type === 'local_delivery') {
    return generateLocalDeliveryPDF(invoiceData)
  }

  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.width
  const pageHeight = doc.internal.pageSize.height
  let yPosition = 15

  const primaryColor = '#FB6600'
  const secondaryColor = '#022A65'
  const lightGray = '#F8F9FA'
  const darkGray = '#374151'

  const addWatermark = async () => {
    try {
      const logoUrl = '/logoomni-removebg-preview.png'
      const img = new Image()
      img.crossOrigin = 'anonymous'
      
      return new Promise<void>((resolve) => {
        img.onload = () => {
          const canvas = document.createElement('canvas')
          const ctx = canvas.getContext('2d')
          
          if (ctx) {
            const watermarkWidth = 40
            const watermarkHeight = 40
            const x = (pageWidth - watermarkWidth) / 2
            const y = (pageHeight - watermarkHeight) / 2 + 10
            
            canvas.width = watermarkWidth
            canvas.height = watermarkHeight
            
            ctx.globalAlpha = 0.01
            ctx.drawImage(img, 0, 0, watermarkWidth, watermarkHeight)
            
            const dataUrl = canvas.toDataURL('image/png')
            doc.addImage(dataUrl, 'PNG', x, y, watermarkWidth, watermarkHeight)
          }
          resolve()
        }
        img.onerror = () => resolve()
        img.src = logoUrl
      })
    } catch (error) {
      console.error('Error adding watermark:', error)
    }
  }

  await addWatermark()

  doc.setFillColor(primaryColor)
  doc.rect(0, 0, pageWidth, 45, 'F')

  const companyInfoX = 15
  let companyInfoY = 15

  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor('#FFFFFF')
  doc.text(invoiceData.business.name || 'OmniCargo Solutions', companyInfoX, companyInfoY)
  companyInfoY += 7

  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor('#FFFFFF')
  
  if (invoiceData.business.address) {
    const addressLines = doc.splitTextToSize(invoiceData.business.address, 70)
    doc.text(addressLines.slice(0, 1), companyInfoX, companyInfoY)
    companyInfoY += 4
  }
  
  if (invoiceData.business.phone) {
    doc.text(`${invoiceData.business.phone}`, companyInfoX, companyInfoY)
    companyInfoY += 4
  }
  
  if (invoiceData.business.email) {
    doc.text(`${invoiceData.business.email}`, companyInfoX, companyInfoY)
  }

  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor('#FFFFFF')
  doc.text('INVOICE', pageWidth - 50, 20)
  
  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.text(`#${invoiceData.invoice_number}`, pageWidth - 50, 30)

  doc.setFillColor(lightGray)
  doc.rect(pageWidth - 70, 50, 65, 30, 'F')
  
  doc.setFontSize(8)
  doc.setTextColor(darkGray)
  doc.setFont('helvetica', 'bold')
  doc.text('Invoice Date:', pageWidth - 65, 58)
  doc.setFont('helvetica', 'normal')
  doc.text(format(new Date(invoiceData.issue_date), 'MMM dd, yyyy'), pageWidth - 65, 64)
  
  doc.setFont('helvetica', 'bold')
  doc.text('ETA:', pageWidth - 65, 70)
  doc.setFont('helvetica', 'normal')
  doc.text(format(new Date(invoiceData.due_date), 'MMM dd, yyyy'), pageWidth - 65, 76)

  const statusColors = {
    'paid': '#10B981',
    'sent': '#F59E0B',
    'overdue': '#EF4444',
    'draft': '#6B7280'
  }
  const statusColor = statusColors[invoiceData.status as keyof typeof statusColors] || statusColors.draft
  
  doc.setFillColor(statusColor)
  doc.roundedRect(pageWidth - 35, 50, 25, 8, 1, 1, 'F')
  doc.setFontSize(7)
  doc.setTextColor('#FFFFFF')
  doc.setFont('helvetica', 'bold')
  doc.text(invoiceData.status.toUpperCase(), pageWidth - 32, 55)

  yPosition = 90
  doc.setFillColor(secondaryColor)
  doc.rect(12, yPosition - 3, 45, 8, 'F')
  
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor('#FFFFFF')
  doc.text('BILL TO', 15, yPosition + 2)
  yPosition += 15

  doc.setFillColor(lightGray)
  doc.rect(12, yPosition - 3, 110, 25, 'F')
  
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(darkGray)
  doc.text(invoiceData.client.name, 16, yPosition + 5)
  yPosition += 8

  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  
  if (invoiceData.client.address) {
    const addressLines = doc.splitTextToSize(invoiceData.client.address, 100)
    doc.text(addressLines.slice(0, 1), 16, yPosition)
    yPosition += 4
  }
  
  if (invoiceData.client.email) {
    doc.text(invoiceData.client.email, 16, yPosition)
    yPosition += 4
  }
  
  if (invoiceData.client.phone) {
    doc.text(invoiceData.client.phone, 16, yPosition)
  }

  const tableStartY = 135
  const tableMargin = 10
  const tableWidth = pageWidth - (tableMargin * 2)
  const tableX = tableMargin
  
  const availableHeight = pageHeight - tableStartY - 120
  const baseRowHeight = 8
  const tableHeaderHeight = 12
  
  const maxPossibleItems = Math.floor((availableHeight - tableHeaderHeight) / baseRowHeight)
  const actualRowHeight = invoiceData.items.length > maxPossibleItems ? 
    Math.max(6, (availableHeight - tableHeaderHeight) / invoiceData.items.length) : baseRowHeight

  yPosition = tableStartY

  const columns = [
    { label: 'SHIPMENT TYPE', width: tableWidth * 0.20, align: 'left' },
    { label: 'DESCRIPTION', width: tableWidth * 0.30, align: 'left' },
    { label: 'QTY', width: tableWidth * 0.08, align: 'center' },
    { label: 'CBM', width: tableWidth * 0.12, align: 'center' },
    { label: 'PRICE', width: tableWidth * 0.15, align: 'right' },
    { label: 'AMOUNT', width: tableWidth * 0.15, align: 'right' }
  ]

  let currentX = tableX
  const columnPositions: Array<{ x: number; width: number; align: string }> = []
  
  columns.forEach(col => {
    columnPositions.push({
      x: currentX,
      width: col.width,
      align: col.align
    })
    currentX += col.width
  })

  doc.setFillColor(secondaryColor)
  doc.rect(tableX, tableStartY, tableWidth, tableHeaderHeight, 'F')

  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor('#FFFFFF')

  columns.forEach((col, index) => {
    const colPos = columnPositions[index]
    let textX = colPos.x + 3
    
    if (col.align === 'center') {
      textX = colPos.x + (colPos.width / 2)
    } else if (col.align === 'right') {
      textX = colPos.x + colPos.width - 3
    }
    
    doc.text(col.label, textX, tableStartY + 8, { align: col.align as any })
  })

  doc.setDrawColor('#FFFFFF')
  doc.setLineWidth(0.5)
  columnPositions.forEach((colPos, index) => {
    if (index > 0) {
      doc.line(colPos.x, tableStartY, colPos.x, tableStartY + tableHeaderHeight)
    }
  })

  yPosition = tableStartY + tableHeaderHeight
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(darkGray)

  for (const [index, item] of invoiceData.items.entries()) {
    if (index % 2 === 0) {
      doc.setFillColor('#F9FAFB')
      doc.rect(tableX, yPosition, tableWidth, actualRowHeight, 'F')
    }

    const parts = item.description.split(': ')
    const shipmentType = parts.length > 1 ? parts[0] : (item.shipment_type || 'N/A')
    const description = parts.length > 1 ? parts[1] : item.description

    const totalCBM = item.quantity
    const individualQty = item.item_quantity || 1
    const individualCBM = item.cbm || (totalCBM / individualQty)

    doc.setFontSize(7)
    doc.setTextColor(darkGray)
    
    const rowData = [
      doc.splitTextToSize(shipmentType, columnPositions[0].width - 6)[0] || shipmentType.substring(0, 18),
      doc.splitTextToSize(description, columnPositions[1].width - 6)[0] || description.substring(0, 25),
      individualQty.toString(),
      individualCBM.toFixed(3),
      `${getCurrencySymbol(invoiceData.currency)}${item.unit_price.toFixed(2)}`,
      `${getCurrencySymbol(invoiceData.currency)}${item.total.toFixed(2)}`
    ]

    rowData.forEach((cellData, colIndex) => {
      const colPos = columnPositions[colIndex]
      const col = columns[colIndex]
      let textX = colPos.x + 3
      
      if (col.align === 'center') {
        textX = colPos.x + (colPos.width / 2)
      } else if (col.align === 'right') {
        textX = colPos.x + colPos.width - 3
      }
      
      doc.text(cellData, textX, yPosition + (actualRowHeight / 2) + 2, { align: col.align as any })
    })
    
    yPosition += actualRowHeight
  }

  const tableEndY = yPosition
  const tableHeight = tableEndY - tableStartY
  
  doc.setDrawColor('#E5E7EB')
  doc.setLineWidth(0.8)
  doc.rect(tableX, tableStartY, tableWidth, tableHeight)

  doc.setDrawColor('#E5E7EB')
  doc.setLineWidth(0.3)
  columnPositions.forEach((colPos, index) => {
    if (index > 0) {
      doc.line(colPos.x, tableStartY, colPos.x, tableEndY)
    }
  })

  doc.setLineWidth(0.5)
  doc.line(tableX, tableStartY + tableHeaderHeight, tableX + tableWidth, tableStartY + tableHeaderHeight)

  yPosition = tableEndY + 10
  const totalsX = pageWidth - 75

  doc.setFillColor(lightGray)
  doc.rect(totalsX - 35, yPosition - 3, 70, 30, 'F')

  doc.setFontSize(9)
  doc.setTextColor(darkGray)
  doc.setFont('helvetica', 'normal')
  doc.text('Subtotal:', totalsX - 30, yPosition + 5)
  doc.text(`${getCurrencySymbol(invoiceData.currency)}${invoiceData.subtotal.toFixed(2)}`, totalsX + 30, yPosition + 5, { align: 'right' })
  yPosition += 7

  if (invoiceData.discount_amount > 0) {
    doc.text('Discount:', totalsX - 30, yPosition)
    doc.setTextColor('#EF4444')
    doc.text(`-${getCurrencySymbol(invoiceData.currency)}${invoiceData.discount_amount.toFixed(2)}`, totalsX + 30, yPosition, { align: 'right' })
    doc.setTextColor(darkGray)
    yPosition += 7
  }

  doc.setDrawColor(primaryColor)
  doc.setLineWidth(1)
  doc.line(totalsX - 30, yPosition, totalsX + 30, yPosition)
  yPosition += 8

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(primaryColor)
  doc.text('TOTAL:', totalsX - 30, yPosition)
  doc.text(`${getCurrencySymbol(invoiceData.currency)}${invoiceData.total_amount.toFixed(2)}`, totalsX + 30, yPosition, { align: 'right' })

  yPosition += 15
  if (invoiceData.signature) {
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(secondaryColor)
    doc.text('CREATED BY:', 12, yPosition)
    yPosition += 6
    
    doc.setDrawColor('#E5E7EB')
    doc.setLineWidth(0.5)
    doc.line(12, yPosition + 8, 80, yPosition + 8)
    
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(darkGray)
    doc.setFontSize(9)
    doc.text(invoiceData.signature, 12, yPosition + 14)
    
    yPosition += 20
  }

  if (invoiceData.notes || invoiceData.payment_instructions) {
    const notesText = invoiceData.notes || ''
    const paymentText = invoiceData.payment_instructions || ''
    const combinedText = [notesText, paymentText].filter(Boolean).join(' ')
    
    if (combinedText && yPosition < pageHeight - 25) {
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(secondaryColor)
      doc.text('NOTES:', 12, yPosition)
      yPosition += 5
      
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(darkGray)
      doc.setFontSize(7)
      const textLines = doc.splitTextToSize(combinedText, pageWidth - 24)
      doc.text(textLines.slice(0, 2), 12, yPosition)
    }
  }

  const footerY = pageHeight - 15
  doc.setFillColor(lightGray)
  doc.rect(0, footerY - 5, pageWidth, 20, 'F')
  
  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(darkGray)
  doc.text(`Generated on ${format(new Date(), 'MMM dd, yyyy')}`, 12, footerY)
  doc.text(`Invoice #${invoiceData.invoice_number}`, pageWidth - 60, footerY)

  doc.save(`Invoice-${invoiceData.invoice_number}.pdf`)
}

export const generateInvoicePDFBase64 = async (invoiceData: InvoiceData): Promise<string> => {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.width
  const pageHeight = doc.internal.pageSize.height
  let yPosition = 15

  const primaryColor = '#FB6600'
  const secondaryColor = '#022A65'
  const lightGray = '#F8F9FA'
  const darkGray = '#374151'

  const addWatermark = async () => {
    try {
      const logoUrl = '/logoomni-removebg-preview.png'
      const img = new Image()
      img.crossOrigin = 'anonymous'
      
      return new Promise<void>((resolve) => {
        img.onload = () => {
          const canvas = document.createElement('canvas')
          const ctx = canvas.getContext('2d')
          
          if (ctx) {
            const watermarkWidth = 40
            const watermarkHeight = 40
            const x = (pageWidth - watermarkWidth) / 2
            const y = (pageHeight - watermarkHeight) / 2 + 10
            
            canvas.width = watermarkWidth
            canvas.height = watermarkHeight
            
            ctx.globalAlpha = 0.01
            ctx.drawImage(img, 0, 0, watermarkWidth, watermarkHeight)
            
            const dataUrl = canvas.toDataURL('image/png')
            doc.addImage(dataUrl, 'PNG', x, y, watermarkWidth, watermarkHeight)
          }
          resolve()
        }
        img.onerror = () => resolve()
        img.src = logoUrl
      })
    } catch (error) {
      console.error('Error adding watermark:', error)
    }
  }

  await addWatermark()

  doc.setFillColor(primaryColor)
  doc.rect(0, 0, pageWidth, 45, 'F')

  const companyInfoX = 15
  let companyInfoY = 15

  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor('#FFFFFF')
  doc.text(invoiceData.business.name || 'OmniCargo Solutions', companyInfoX, companyInfoY)
  companyInfoY += 7

  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor('#FFFFFF')
  
  if (invoiceData.business.address) {
    const addressLines = doc.splitTextToSize(invoiceData.business.address, 70)
    doc.text(addressLines.slice(0, 1), companyInfoX, companyInfoY)
    companyInfoY += 4
  }
  
  if (invoiceData.business.phone) {
    doc.text(`${invoiceData.business.phone}`, companyInfoX, companyInfoY)
    companyInfoY += 4
  }
  
  if (invoiceData.business.email) {
    doc.text(`${invoiceData.business.email}`, companyInfoX, companyInfoY)
  }

  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor('#FFFFFF')
  doc.text('INVOICE', pageWidth - 50, 20)
  
  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.text(`#${invoiceData.invoice_number}`, pageWidth - 50, 30)

  doc.setFillColor(lightGray)
  doc.rect(pageWidth - 70, 50, 65, 30, 'F')
  
  doc.setFontSize(8)
  doc.setTextColor(darkGray)
  doc.setFont('helvetica', 'bold')
  doc.text('Invoice Date:', pageWidth - 65, 58)
  doc.setFont('helvetica', 'normal')
  doc.text(format(new Date(invoiceData.issue_date), 'MMM dd, yyyy'), pageWidth - 65, 64)
  
  doc.setFont('helvetica', 'bold')
  doc.text('ETA:', pageWidth - 65, 70)
  doc.setFont('helvetica', 'normal')
  doc.text(format(new Date(invoiceData.due_date), 'MMM dd, yyyy'), pageWidth - 65, 76)

  const statusColors = {
    'paid': '#10B981',
    'sent': '#F59E0B',
    'overdue': '#EF4444',
    'draft': '#6B7280'
  }
  const statusColor = statusColors[invoiceData.status as keyof typeof statusColors] || statusColors.draft
  
  doc.setFillColor(statusColor)
  doc.roundedRect(pageWidth - 35, 50, 25, 8, 1, 1, 'F')
  doc.setFontSize(7)
  doc.setTextColor('#FFFFFF')
  doc.setFont('helvetica', 'bold')
  doc.text(invoiceData.status.toUpperCase(), pageWidth - 32, 55)

  yPosition = 90
  doc.setFillColor(secondaryColor)
  doc.rect(12, yPosition - 3, 45, 8, 'F')
  
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor('#FFFFFF')
  doc.text('BILL TO', 15, yPosition + 2)
  yPosition += 15

  doc.setFillColor(lightGray)
  doc.rect(12, yPosition - 3, 110, 25, 'F')
  
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(darkGray)
  doc.text(invoiceData.client.name, 16, yPosition + 5)
  yPosition += 8

  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  
  if (invoiceData.client.address) {
    const addressLines = doc.splitTextToSize(invoiceData.client.address, 100)
    doc.text(addressLines.slice(0, 1), 16, yPosition)
    yPosition += 4
  }
  
  if (invoiceData.client.email) {
    doc.text(invoiceData.client.email, 16, yPosition)
    yPosition += 4
  }
  
  if (invoiceData.client.phone) {
    doc.text(invoiceData.client.phone, 16, yPosition)
  }

  const tableStartY = 135
  const tableMargin = 10
  const tableWidth = pageWidth - (tableMargin * 2)
  const tableX = tableMargin
  
  const availableHeight = pageHeight - tableStartY - 120
  const baseRowHeight = 8
  const tableHeaderHeight = 12
  
  const maxPossibleItems = Math.floor((availableHeight - tableHeaderHeight) / baseRowHeight)
  const actualRowHeight = invoiceData.items.length > maxPossibleItems ? 
    Math.max(6, (availableHeight - tableHeaderHeight) / invoiceData.items.length) : baseRowHeight

  yPosition = tableStartY

  const columns = [
    { label: 'SHIPMENT TYPE', width: tableWidth * 0.20, align: 'left' },
    { label: 'DESCRIPTION', width: tableWidth * 0.30, align: 'left' },
    { label: 'QTY', width: tableWidth * 0.08, align: 'center' },
    { label: 'CBM', width: tableWidth * 0.12, align: 'center' },
    { label: 'PRICE', width: tableWidth * 0.15, align: 'right' },
    { label: 'AMOUNT', width: tableWidth * 0.15, align: 'right' }
  ]

  let currentX = tableX
  const columnPositions: Array<{ x: number; width: number; align: string }> = []
  
  columns.forEach(col => {
    columnPositions.push({
      x: currentX,
      width: col.width,
      align: col.align
    })
    currentX += col.width
  })

  doc.setFillColor(secondaryColor)
  doc.rect(tableX, tableStartY, tableWidth, tableHeaderHeight, 'F')

  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor('#FFFFFF')

  columns.forEach((col, index) => {
    const colPos = columnPositions[index]
    let textX = colPos.x + 3
    
    if (col.align === 'center') {
      textX = colPos.x + (colPos.width / 2)
    } else if (col.align === 'right') {
      textX = colPos.x + colPos.width - 3
    }
    
    doc.text(col.label, textX, tableStartY + 8, { align: col.align as any })
  })

  doc.setDrawColor('#FFFFFF')
  doc.setLineWidth(0.5)
  columnPositions.forEach((colPos, index) => {
    if (index > 0) {
      doc.line(colPos.x, tableStartY, colPos.x, tableStartY + tableHeaderHeight)
    }
  })

  yPosition = tableStartY + tableHeaderHeight
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(darkGray)

  for (const [index, item] of invoiceData.items.entries()) {
    if (index % 2 === 0) {
      doc.setFillColor('#F9FAFB')
      doc.rect(tableX, yPosition, tableWidth, actualRowHeight, 'F')
    }

    const parts = item.description.split(': ')
    const shipmentType = parts.length > 1 ? parts[0] : (item.shipment_type || 'N/A')
    const description = parts.length > 1 ? parts[1] : item.description

    const totalCBM = item.quantity
    const individualQty = item.item_quantity || 1
    const individualCBM = item.cbm || (totalCBM / individualQty)

    doc.setFontSize(7)
    doc.setTextColor(darkGray)
    
    const rowData = [
      doc.splitTextToSize(shipmentType, columnPositions[0].width - 6)[0] || shipmentType.substring(0, 18),
      doc.splitTextToSize(description, columnPositions[1].width - 6)[0] || description.substring(0, 25),
      individualQty.toString(),
      individualCBM.toFixed(3),
      `${getCurrencySymbol(invoiceData.currency)}${item.unit_price.toFixed(2)}`,
      `${getCurrencySymbol(invoiceData.currency)}${item.total.toFixed(2)}`
    ]

    rowData.forEach((cellData, colIndex) => {
      const colPos = columnPositions[colIndex]
      const col = columns[colIndex]
      let textX = colPos.x + 3
      
      if (col.align === 'center') {
        textX = colPos.x + (colPos.width / 2)
      } else if (col.align === 'right') {
        textX = colPos.x + colPos.width - 3
      }
      
      doc.text(cellData, textX, yPosition + (actualRowHeight / 2) + 2, { align: col.align as any })
    })
    
    yPosition += actualRowHeight
  }

  const tableEndY = yPosition
  const tableHeight = tableEndY - tableStartY
  
  doc.setDrawColor('#E5E7EB')
  doc.setLineWidth(0.8)
  doc.rect(tableX, tableStartY, tableWidth, tableHeight)

  doc.setLineWidth(0.3)
  columnPositions.forEach((colPos, index) => {
    if (index > 0) {
      doc.line(colPos.x, tableStartY, colPos.x, tableEndY)
    }
  })

  doc.setLineWidth(0.5)
  doc.line(tableX, tableStartY + tableHeaderHeight, tableX + tableWidth, tableStartY + tableHeaderHeight)

  yPosition = tableEndY + 10
  const totalsX = pageWidth - 75

  doc.setFillColor(lightGray)
  doc.rect(totalsX - 35, yPosition - 3, 70, 30, 'F')

  doc.setFontSize(9)
  doc.setTextColor(darkGray)
  doc.setFont('helvetica', 'normal')
  doc.text('Subtotal:', totalsX - 30, yPosition + 5)
  doc.text(`${getCurrencySymbol(invoiceData.currency)}${invoiceData.subtotal.toFixed(2)}`, totalsX + 30, yPosition + 5, { align: 'right' })
  yPosition += 7

  if (invoiceData.discount_amount > 0) {
    doc.text('Discount:', totalsX - 30, yPosition)
    doc.setTextColor('#EF4444')
    doc.text(`-${getCurrencySymbol(invoiceData.currency)}${invoiceData.discount_amount.toFixed(2)}`, totalsX + 30, yPosition, { align: 'right' })
    doc.setTextColor(darkGray)
    yPosition += 7
  }

  doc.setDrawColor(primaryColor)
  doc.setLineWidth(1)
  doc.line(totalsX - 30, yPosition, totalsX + 30, yPosition)
  yPosition += 8

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(primaryColor)
  doc.text('TOTAL:', totalsX - 30, yPosition)
  doc.text(`${getCurrencySymbol(invoiceData.currency)}${invoiceData.total_amount.toFixed(2)}`, totalsX + 30, yPosition, { align: 'right' })

  yPosition += 15
  if (invoiceData.signature) {
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(secondaryColor)
    doc.text('CREATED BY:', 12, yPosition)
    yPosition += 6
    
    doc.setDrawColor('#E5E7EB')
    doc.setLineWidth(0.5)
    doc.line(12, yPosition + 8, 80, yPosition + 8)
    
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(darkGray)
    doc.setFontSize(9)
    doc.text(invoiceData.signature, 12, yPosition + 14)
    
    yPosition += 20
  }

  if (invoiceData.notes || invoiceData.payment_instructions) {
    const notesText = invoiceData.notes || ''
    const paymentText = invoiceData.payment_instructions || ''
    const combinedText = [notesText, paymentText].filter(Boolean).join(' ')
    
    if (combinedText && yPosition < pageHeight - 25) {
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(secondaryColor)
      doc.text('NOTES:', 12, yPosition)
      yPosition += 5
      
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(darkGray)
      doc.setFontSize(7)
      const textLines = doc.splitTextToSize(combinedText, pageWidth - 24)
      doc.text(textLines.slice(0, 2), 12, yPosition)
    }
  }

  const footerY = pageHeight - 15
  doc.setFillColor(lightGray)
  doc.rect(0, footerY - 5, pageWidth, 20, 'F')
  
  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(darkGray)
  doc.text(`Generated on ${format(new Date(), 'MMM dd, yyyy')}`, 12, footerY)
  doc.text(`Invoice #${invoiceData.invoice_number}`, pageWidth - 60, footerY)

  return doc.output('datauristring').split(',')[1]
}

export const generateInvoiceImage = async (invoiceData: InvoiceData): Promise<string> => {
  if (invoiceData.invoice_type === 'local_delivery') {
    return generateLocalDeliveryImage(invoiceData)
  }

  return new Promise((resolve, reject) => {
    const invoiceDiv = document.createElement('div')
    invoiceDiv.style.position = 'absolute'
    invoiceDiv.style.left = '-9999px'
    invoiceDiv.style.width = '800px'
    invoiceDiv.style.backgroundColor = 'white'
    invoiceDiv.style.padding = '40px'
    invoiceDiv.style.fontFamily = 'Arial, sans-serif'
    invoiceDiv.style.lineHeight = '1.4'

    invoiceDiv.innerHTML = `
      <div style="position: relative; min-height: 1000px;">
        <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); opacity: 0.015; z-index: 0;">
          <img src="/logoomni-removebg-preview.png" style="width: 120px; height: 120px;" />
        </div>
        
        <div style="position: relative; z-index: 1;">
          <div style="background: #FB6600; color: white; padding: 25px; margin-bottom: 30px; border-radius: 8px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div>
                <h1 style="margin: 0; font-size: 26px; font-weight: bold;">${invoiceData.business.name || 'OmniCargo Solutions'}</h1>
                <p style="margin: 8px 0 0 0; font-size: 14px; opacity: 0.9;">${invoiceData.business.address || ''}</p>
                <p style="margin: 4px 0 0 0; font-size: 12px; opacity: 0.9;">${invoiceData.business.phone || ''} | ${invoiceData.business.email || ''}</p>
              </div>
              <div style="text-align: right;">
                <h2 style="margin: 0; font-size: 32px; font-weight: bold;">INVOICE</h2>
                <p style="margin: 8px 0 0 0; font-size: 18px; font-weight: 500;">#${invoiceData.invoice_number}</p>
              </div>
            </div>
          </div>

          <div style="display: flex; justify-content: space-between; margin-bottom: 35px; gap: 20px;">
            <div style="background: #f8f9fa; padding: 25px; border-radius: 8px; width: 45%;">
              <h3 style="margin: 0 0 18px 0; color: #022A65; font-size: 16px; font-weight: bold;">BILL TO:</h3>
              <p style="margin: 0; font-weight: bold; font-size: 18px; color: #374151;">${invoiceData.client.name}</p>
              ${invoiceData.client.address ? `<p style="margin: 8px 0; color: #6B7280; line-height: 1.5;">${invoiceData.client.address}</p>` : ''}
              ${invoiceData.client.email ? `<p style="margin: 6px 0; color: #6B7280;">${invoiceData.client.email}</p>` : ''}
              ${invoiceData.client.phone ? `<p style="margin: 6px 0; color: #6B7280;">${invoiceData.client.phone}</p>` : ''}
            </div>
            <div style="background: #f8f9fa; padding: 25px; border-radius: 8px; width: 45%;">
              <p style="margin: 0 0 12px 0; font-size: 14px;"><strong>Invoice Date:</strong> ${format(new Date(invoiceData.issue_date), 'MMM dd, yyyy')}</p>
              <p style="margin: 0 0 12px 0; font-size: 14px;"><strong>ETA:</strong> ${format(new Date(invoiceData.due_date), 'MMM dd, yyyy')}</p>
              <p style="margin: 0; font-size: 14px;"><strong>Status:</strong> <span style="background: ${getStatusColor(invoiceData.status)}; color: white; padding: 6px 12px; border-radius: 6px; font-size: 12px; font-weight: bold;">${invoiceData.status.toUpperCase()}</span></p>
            </div>
          </div>

          <table style="width: 100%; border-collapse: collapse; margin-bottom: 35px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <thead>
              <tr style="background: #022A65; color: white;">
                <th style="padding: 15px 8px; text-align: left; border: 1px solid #ddd; font-size: 11px; font-weight: bold; width: 20%;">SHIPMENT TYPE</th>
                <th style="padding: 15px 8px; text-align: left; border: 1px solid #ddd; font-size: 11px; font-weight: bold; width: 30%;">DESCRIPTION</th>
                <th style="padding: 15px 8px; text-align: center; border: 1px solid #ddd; font-size: 11px; font-weight: bold; width: 8%;">QTY</th>
                <th style="padding: 15px 8px; text-align: center; border: 1px solid #ddd; font-size: 11px; font-weight: bold; width: 12%;">CBM</th>
                <th style="padding: 15px 8px; text-align: right; border: 1px solid #ddd; font-size: 11px; font-weight: bold; width: 15%;">PRICE</th>
                <th style="padding: 15px 8px; text-align: right; border: 1px solid #ddd; font-size: 11px; font-weight: bold; width: 15%;">AMOUNT</th>
              </tr>
            </thead>
            <tbody>
              ${invoiceData.items.map((item, index) => {
                const parts = item.description.split(': ')
                const shipmentType = parts.length > 1 ? parts[0] : (item.shipment_type || 'N/A')
                const description = parts.length > 1 ? parts[1] : item.description
                const totalCBM = item.quantity
                const individualQty = item.item_quantity || 1
                const individualCBM = item.cbm || (totalCBM / individualQty)
                
                return `
                  <tr style="background: ${index % 2 === 0 ? '#f9fafb' : 'white'};">
                    <td style="padding: 12px 8px; border: 1px solid #ddd; font-size: 10px; color: #374151; width: 20%;">${shipmentType}</td>
                    <td style="padding: 12px 8px; border: 1px solid #ddd; font-size: 10px; color: #374151; width: 30%;">${description}</td>
                    <td style="padding: 12px 8px; text-align: center; border: 1px solid #ddd; font-size: 10px; color: #374151; width: 8%;">${individualQty}</td>
                    <td style="padding: 12px 8px; text-align: center; border: 1px solid #ddd; font-size: 10px; color: #374151; width: 12%;">${individualCBM.toFixed(3)}</td>
                    <td style="padding: 12px 8px; text-align: right; border: 1px solid #ddd; font-size: 10px; color: #374151; width: 15%;">${getCurrencySymbol(invoiceData.currency)}${item.unit_price.toFixed(2)}</td>
                    <td style="padding: 12px 8px; text-align: right; border: 1px solid #ddd; font-size: 10px; font-weight: bold; color: #374151; width: 15%;">${getCurrencySymbol(invoiceData.currency)}${item.total.toFixed(2)}</td>
                  </tr>
                `
              }).join('')}
            </tbody>
          </table>

          <div style="display: flex; justify-content: flex-end; margin-bottom: 35px;">
            <div style="background: #f8f9fa; padding: 25px; border-radius: 8px; min-width: 320px;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 14px;">
                <span style="color: #6B7280;">Subtotal:</span>
                <span style="font-weight: 500; color: #374151;">${getCurrencySymbol(invoiceData.currency)}${invoiceData.subtotal.toFixed(2)}</span>
              </div>
              ${invoiceData.discount_amount > 0 ? `
                <div style="display: flex; justify-content: space-between; margin-bottom: 12px; color: #ef4444; font-size: 14px;">
                  <span>Discount:</span>
                  <span style="font-weight: 500;">-${getCurrencySymbol(invoiceData.currency)}${invoiceData.discount_amount.toFixed(2)}</span>
                </div>
              ` : ''}
              <hr style="margin: 18px 0; border: 1.5px solid #FB6600;">
              <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 20px; color: #FB6600;">
                <span>TOTAL:</span>
                <span>${getCurrencySymbol(invoiceData.currency)}${invoiceData.total_amount.toFixed(2)}</span>
              </div>
            </div>
          </div>

          ${invoiceData.signature ? `
            <div style="margin-bottom: 35px;">
              <h3 style="color: #022A65; margin-bottom: 15px; font-size: 14px; font-weight: bold;">CREATED BY:</h3>
              <div style="border-bottom: 2px solid #ddd; width: 220px; padding-bottom: 8px;">
                <p style="margin: 0; font-weight: bold; font-size: 16px; color: #374151;">${invoiceData.signature}</p>
              </div>
              <p style="margin: 8px 0 0 0; font-size: 11px; color: #6B7280;">Authorized Representative</p>
            </div>
          ` : ''}

          ${(invoiceData.notes || invoiceData.payment_instructions) ? `
            <div style="background: #f8f9fa; padding: 25px; border-radius: 8px;">
              <h3 style="color: #022A65; margin: 0 0 18px 0; font-size: 14px; font-weight: bold;">NOTES & TERMS AND CONDITIONS:</h3>
              <p style="margin: 0; line-height: 1.6; color: #374151; font-size: 12px;">${[invoiceData.notes, invoiceData.payment_instructions].filter(Boolean).join('\n\n')}</p>
            </div>
          ` : ''}

          <div style="text-align: center; margin-top: 45px; padding-top: 25px; border-top: 1px solid #ddd; color: #6B7280; font-size: 11px;">
            <p style="margin: 0;">Generated on ${format(new Date(), 'MMM dd, yyyy')} | Invoice #${invoiceData.invoice_number}</p>
          </div>
        </div>
      </div>
    `

    document.body.appendChild(invoiceDiv)

    html2canvas(invoiceDiv, {
      scale: 2.5,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      width: 800,
      height: 1000
    }).then(canvas => {
      document.body.removeChild(invoiceDiv)
      const imageDataUrl = canvas.toDataURL('image/png', 0.95)
      resolve(imageDataUrl)
    }).catch(error => {
      document.body.removeChild(invoiceDiv)
      reject(error)
    })
  })
}

const generateLocalDeliveryImage = async (invoiceData: InvoiceData): Promise<string> => {
  return new Promise((resolve, reject) => {
    const invoiceDiv = document.createElement('div')
    invoiceDiv.style.position = 'absolute'
    invoiceDiv.style.left = '-9999px'
    invoiceDiv.style.width = '800px'
    invoiceDiv.style.backgroundColor = 'white'
    invoiceDiv.style.padding = '40px'
    invoiceDiv.style.fontFamily = 'Arial, sans-serif'
    invoiceDiv.style.lineHeight = '1.4'

    const sender = invoiceData.sender || { name: null, phone: null, address: null }

    invoiceDiv.innerHTML = `
      <div style="position: relative; min-height: 900px;">
        <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); opacity: 0.015; z-index: 0;">
          <img src="/logoomni-removebg-preview.png" style="width: 120px; height: 120px;" />
        </div>

        <div style="position: relative; z-index: 1;">
          <div style="background: #FB6600; color: white; padding: 25px; margin-bottom: 30px; border-radius: 8px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div>
                <h1 style="margin: 0; font-size: 24px; font-weight: bold;">${invoiceData.business.name || 'OmniCargo Solutions'}</h1>
                <p style="margin: 6px 0 0 0; font-size: 12px; opacity: 0.9;">LOCAL DELIVERY INVOICE</p>
              </div>
              <div style="text-align: right;">
                <h2 style="margin: 0; font-size: 28px; font-weight: bold;">INVOICE</h2>
                <p style="margin: 6px 0 0 0; font-size: 16px; font-weight: 500;">#${invoiceData.invoice_number}</p>
              </div>
            </div>
          </div>

          <div style="display: flex; justify-content: space-between; margin-bottom: 25px; gap: 20px;">
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; width: 45%;">
              <p style="margin: 0 0 10px 0; font-size: 13px;"><strong>Invoice Date:</strong> ${format(new Date(invoiceData.issue_date), 'MMM dd, yyyy')}</p>
              <p style="margin: 0; font-size: 13px;"><strong>Due:</strong> ${format(new Date(invoiceData.due_date), 'MMM dd, yyyy')}</p>
            </div>
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; width: 45%; text-align: right;">
              <p style="margin: 0; font-size: 13px;"><strong>Status:</strong> <span style="background: ${getStatusColor(invoiceData.status)}; color: white; padding: 5px 10px; border-radius: 6px; font-size: 11px; font-weight: bold;">${invoiceData.status.toUpperCase()}</span></p>
            </div>
          </div>

          <div style="display: flex; justify-content: space-between; margin-bottom: 30px; gap: 20px;">
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; width: 47%;">
              <h3 style="margin: 0 0 12px 0; color: #022A65; font-size: 13px; font-weight: bold; letter-spacing: 0.05em;">SENDER</h3>
              <p style="margin: 0; font-weight: bold; font-size: 15px; color: #374151;">${sender.name || '—'}</p>
              ${sender.phone ? `<p style="margin: 6px 0 0 0; color: #6B7280; font-size: 12px;">${sender.phone}</p>` : ''}
              ${sender.address ? `<p style="margin: 6px 0 0 0; color: #6B7280; font-size: 12px;">${sender.address}</p>` : ''}
            </div>
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; width: 47%;">
              <h3 style="margin: 0 0 12px 0; color: #FB6600; font-size: 13px; font-weight: bold; letter-spacing: 0.05em;">RECIPIENT</h3>
              <p style="margin: 0; font-weight: bold; font-size: 15px; color: #374151;">${invoiceData.client.name}</p>
              ${invoiceData.client.phone ? `<p style="margin: 6px 0 0 0; color: #6B7280; font-size: 12px;">${invoiceData.client.phone}</p>` : ''}
              ${invoiceData.client.address ? `<p style="margin: 6px 0 0 0; color: #6B7280; font-size: 12px;">${invoiceData.client.address}</p>` : ''}
            </div>
          </div>

          <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <thead>
              <tr style="background: #022A65; color: white;">
                <th style="padding: 12px 8px; text-align: left; border: 1px solid #ddd; font-size: 11px; font-weight: bold;">ROUTE</th>
                <th style="padding: 12px 8px; text-align: left; border: 1px solid #ddd; font-size: 11px; font-weight: bold;">DESCRIPTION</th>
                <th style="padding: 12px 8px; text-align: center; border: 1px solid #ddd; font-size: 11px; font-weight: bold;">QTY</th>
                <th style="padding: 12px 8px; text-align: center; border: 1px solid #ddd; font-size: 11px; font-weight: bold;">CBM</th>
                <th style="padding: 12px 8px; text-align: right; border: 1px solid #ddd; font-size: 11px; font-weight: bold;">₵/CBM</th>
                <th style="padding: 12px 8px; text-align: right; border: 1px solid #ddd; font-size: 11px; font-weight: bold;">TOTAL</th>
              </tr>
            </thead>
            <tbody>
              ${invoiceData.items.map((item, index) => `
                <tr style="background: ${index % 2 === 0 ? '#f9fafb' : 'white'};">
                  <td style="padding: 10px 8px; border: 1px solid #ddd; font-size: 11px; color: #374151;">${item.shipment_type || '—'}</td>
                  <td style="padding: 10px 8px; border: 1px solid #ddd; font-size: 11px; color: #374151;">${item.description}</td>
                  <td style="padding: 10px 8px; text-align: center; border: 1px solid #ddd; font-size: 11px; color: #374151;">${item.item_quantity ?? '—'}</td>
                  <td style="padding: 10px 8px; text-align: center; border: 1px solid #ddd; font-size: 11px; color: #374151;">${(item.cbm ?? item.quantity).toFixed(3)}</td>
                  <td style="padding: 10px 8px; text-align: right; border: 1px solid #ddd; font-size: 11px; color: #374151;">₵${item.unit_price.toFixed(2)}</td>
                  <td style="padding: 10px 8px; text-align: right; border: 1px solid #ddd; font-size: 11px; font-weight: bold; color: #374151;">₵${item.total.toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div style="display: flex; justify-content: flex-end; margin-bottom: 30px;">
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; min-width: 280px;">
              <hr style="margin: 0 0 15px 0; border: 1.5px solid #FB6600;">
              <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 18px; color: #FB6600;">
                <span>TOTAL:</span>
                <span>₵${invoiceData.total_amount.toFixed(2)}</span>
              </div>
            </div>
          </div>

          ${invoiceData.signature ? `
            <div style="margin-bottom: 30px;">
              <h3 style="color: #022A65; margin-bottom: 12px; font-size: 13px; font-weight: bold;">CREATED BY:</h3>
              <div style="border-bottom: 2px solid #ddd; width: 200px; padding-bottom: 6px;">
                <p style="margin: 0; font-weight: bold; font-size: 14px; color: #374151;">${invoiceData.signature}</p>
              </div>
            </div>
          ` : ''}

          ${invoiceData.notes ? `
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px;">
              <h3 style="color: #022A65; margin: 0 0 12px 0; font-size: 13px; font-weight: bold;">NOTES:</h3>
              <p style="margin: 0; line-height: 1.6; color: #374151; font-size: 11px;">${invoiceData.notes}</p>
            </div>
          ` : ''}

          <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; color: #6B7280; font-size: 10px;">
            <p style="margin: 0;">Generated on ${format(new Date(), 'MMM dd, yyyy')} | Invoice #${invoiceData.invoice_number}</p>
          </div>
        </div>
      </div>
    `

    document.body.appendChild(invoiceDiv)

    html2canvas(invoiceDiv, {
      scale: 2.5,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      width: 800,
      height: 900
    }).then(canvas => {
      document.body.removeChild(invoiceDiv)
      const imageDataUrl = canvas.toDataURL('image/png', 0.95)
      resolve(imageDataUrl)
    }).catch(error => {
      document.body.removeChild(invoiceDiv)
      reject(error)
    })
  })
}

export const shareInvoiceViaWhatsApp = async (invoiceData: InvoiceData, phoneNumber?: string): Promise<void> => {
  try {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    
    const imageDataUrl = await generateInvoiceImage(invoiceData)
    
    const message = `Invoice #${invoiceData.invoice_number} - ${getCurrencySymbol(invoiceData.currency)}${invoiceData.total_amount.toFixed(2)}`

    const timestamp = format(new Date(), 'yyyyMMdd-HHmmss')
    const filename = `Invoice-${invoiceData.invoice_number}-${timestamp}.png`
    
    const link = document.createElement('a')
    link.download = filename
    link.href = imageDataUrl
    
    link.style.display = 'none'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    await new Promise(resolve => setTimeout(resolve, 300))

    if (navigator.share && isMobile) {
      try {
        const response = await fetch(imageDataUrl)
        const blob = await response.blob()
        const file = new File([blob], filename, { type: 'image/png' })
        
        await navigator.share({
          title: `Invoice ${invoiceData.invoice_number}`,
          text: message,
          files: [file]
        })
        return
      } catch (shareError) {
        console.log('Web Share API failed, falling back to WhatsApp URL')
      }
    }

    let whatsappUrl: string
    
    if (phoneNumber) {
      const cleanPhone = phoneNumber.replace(/[^\d+]/g, '')
      const formattedPhone = cleanPhone.startsWith('+') ? cleanPhone.slice(1) : cleanPhone
      whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`
    } else {
      whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`
    }
    
    if (isMobile) {
      window.location.href = whatsappUrl
    } else {
      window.open(whatsappUrl, '_blank', 'noopener,noreferrer')
    }
    
  } catch (error) {
    console.error('Error sharing invoice via WhatsApp:', error)
    throw new Error('Failed to generate invoice image for WhatsApp sharing. Please try again.')
  }
}

export const downloadInvoiceImage = async (invoiceData: InvoiceData): Promise<void> => {
  const imageDataUrl = await generateInvoiceImage(invoiceData)
  const timestamp = format(new Date(), 'yyyyMMdd-HHmmss')
  const filename = `Invoice-${invoiceData.invoice_number}-${timestamp}.png`

  const link = document.createElement('a')
  link.download = filename
  link.href = imageDataUrl
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

export const copyInvoiceImageToClipboard = async (
  getInvoiceData: () => Promise<InvoiceData>
): Promise<boolean> => {
  try {
    if (!navigator.clipboard || !window.ClipboardItem) {
      return false
    }

    const blobPromise: Promise<Blob> = (async () => {
      const invoiceData = await getInvoiceData()
      const imageDataUrl = await generateInvoiceImage(invoiceData)
      const response = await fetch(imageDataUrl)
      return response.blob()
    })()

    await navigator.clipboard.write([
      new ClipboardItem({
        'image/png': blobPromise
      })
    ])

    return true
  } catch (error) {
    console.error('Error copying image to clipboard:', error)
    return false
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

const getStatusColor = (status: string): string => {
  switch (status) {
    case 'paid':
      return '#10B981'
    case 'sent':
      return '#F59E0B'
    case 'overdue':
      return '#EF4444'
    default:
      return '#6B7280'
  }
}
