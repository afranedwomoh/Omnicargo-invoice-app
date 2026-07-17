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

const drawLogoMark = (doc: jsPDF, x: number, y: number, navy: string, orange: string) => {
  doc.setFillColor(orange)
  doc.circle(x, y, 3, 'F')
  doc.setFillColor(navy)
  doc.circle(x + 6.5, y, 4, 'F')
  doc.setFillColor('#FFFFFF')
  doc.circle(x + 6.5, y, 2.3, 'F')
  doc.rect(x + 6.5, y - 4, 4.2, 8, 'F')
}

const drawInvoiceBanner = (doc: jsPDF, pageWidth: number, navy: string) => {
  doc.setFillColor('#FFEFE3')
  doc.rect(0, 0, pageWidth, 14, 'F')
  doc.setFillColor(navy)
  doc.rect(0, 0, pageWidth * 0.5, 14, 'F')
}

const generateLocalDeliveryPDF = async (invoiceData: InvoiceData): Promise<void> => {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.width
  const pageHeight = doc.internal.pageSize.height
  let yPosition = 15

  const navy = '#0B2545'
  const orange = '#F26B1D'
  const cream = '#F7F5F2'
  const darkGray = '#374151'
  const slate = '#667085'
  const sender = invoiceData.sender || { name: null, phone: null, address: null }

  drawInvoiceBanner(doc, pageWidth, navy)

  drawLogoMark(doc, 22, 26, navy, orange)
  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(orange)
  doc.text('OMNi', 30, 28)
  const omniWidth = doc.getTextWidth('OMNi')
  doc.setTextColor(navy)
  doc.text('CARGO', 30 + omniWidth, 28)
  doc.setFontSize(6)
  doc.setFont('helvetica', 'normal')
  doc.text('S O L U T I O N S   L I M I T E D', 30, 33)
  doc.setTextColor(slate)
  doc.text('LOCAL DELIVERY INVOICE', 30, 39)

  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(navy)
  doc.text('INVOICE', pageWidth - 15, 26, { align: 'right' })
  doc.setDrawColor(orange)
  doc.setLineWidth(1.2)
  doc.line(pageWidth - 33, 29, pageWidth - 15, 29)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(orange)
  doc.text(`#${invoiceData.invoice_number}`, pageWidth - 15, 35, { align: 'right' })

  doc.setFillColor(cream)
  doc.roundedRect(pageWidth - 65, 40, 50, 22, 2, 2, 'F')
  doc.setFillColor(navy)
  doc.roundedRect(pageWidth - 32, 42, 14, 5, 2, 2, 'F')
  doc.setFontSize(6)
  doc.setTextColor('#FFFFFF')
  doc.setFont('helvetica', 'bold')
  doc.text(invoiceData.status.toUpperCase(), pageWidth - 25, 45.3, { align: 'center' })
  doc.setFontSize(7)
  doc.setTextColor(navy)
  doc.text('Invoice Date:', pageWidth - 62, 50)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(darkGray)
  doc.text(format(new Date(invoiceData.issue_date), 'MMM dd, yyyy'), pageWidth - 62, 54)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(navy)
  doc.text('ETA:', pageWidth - 62, 58)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(darkGray)
  doc.text(format(new Date(invoiceData.due_date), 'MMM dd, yyyy'), pageWidth - 62, 60)

  yPosition = 68
  const boxWidth = (pageWidth - 30 - 8) / 2

  doc.setFillColor(cream)
  doc.roundedRect(15, yPosition, boxWidth, 26, 2, 2, 'F')
  doc.roundedRect(15 + boxWidth + 8, yPosition, boxWidth, 26, 2, 2, 'F')

  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(navy)
  doc.text('SENDER', 19, yPosition + 6)
  doc.setTextColor(orange)
  doc.text('RECIPIENT', 19 + boxWidth + 8, yPosition + 6)

  doc.setFont('helvetica', 'normal')
  doc.setTextColor(darkGray)
  doc.setFontSize(8)
  doc.text(sender.name || '-', 19, yPosition + 12)
  if (sender.phone) doc.text(sender.phone, 19, yPosition + 17)
  if (sender.address) doc.text(doc.splitTextToSize(sender.address, boxWidth - 8).slice(0, 2), 19, yPosition + 22)

  doc.text(invoiceData.client.name, 19 + boxWidth + 8, yPosition + 12)
  if (invoiceData.client.phone) doc.text(invoiceData.client.phone, 19 + boxWidth + 8, yPosition + 17)
  if (invoiceData.client.address) doc.text(doc.splitTextToSize(invoiceData.client.address, boxWidth - 8).slice(0, 2), 19 + boxWidth + 8, yPosition + 22)

  yPosition += 34

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

  doc.setFillColor(navy)
  doc.rect(tableX, yPosition, tableWidth, 9, 'F')
  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor('#FFFFFF')
  columns.forEach((col, i) => {
    const pos = colPositions[i]
    let textX = pos.x + 2
    if (col.align === 'center') textX = pos.x + pos.width / 2
    if (col.align === 'right') textX = pos.x + pos.width - 2
    doc.text(col.label, textX, yPosition + 6, { align: col.align as any })
  })

  yPosition += 9
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
  doc.rect(tableX, yPosition - (invoiceData.items.length * 8) - 9, tableWidth, (invoiceData.items.length * 8) + 9)

  yPosition += 10
  doc.setDrawColor('#EAECF0')
  doc.setLineWidth(0.4)
  doc.roundedRect(pageWidth - 80, yPosition - 3, 65, 16, 2, 2)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(orange)
  doc.text('TOTAL:', pageWidth - 76, yPosition + 6)
  doc.text(`₵${invoiceData.total_amount.toFixed(2)}`, pageWidth - 18, yPosition + 6, { align: 'right' })

  yPosition += 22
  if (invoiceData.signature) {
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(navy)
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
    doc.setTextColor(navy)
    doc.text('NOTES:', 15, yPosition)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(darkGray)
    doc.setFontSize(7)
    doc.text(doc.splitTextToSize(invoiceData.notes, pageWidth - 30).slice(0, 3), 15, yPosition + 6)
  }

  const footerY = pageHeight - 15
  doc.setFillColor(cream)
  doc.rect(0, footerY - 6, pageWidth, 21, 'F')
  doc.setDrawColor(orange)
  doc.setLineWidth(1)
  doc.line(0, footerY - 6, pageWidth, footerY - 6)
  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(slate)
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

  const navy = '#0B2545'
  const orange = '#F26B1D'
  const cream = '#F7F5F2'
  const darkGray = '#374151'
  const slate = '#667085'

  drawInvoiceBanner(doc, pageWidth, navy)

  drawLogoMark(doc, 22, 26, navy, orange)
  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(orange)
  doc.text('OMNi', 30, 28)
  const omniWidth = doc.getTextWidth('OMNi')
  doc.setTextColor(navy)
  doc.text('CARGO', 30 + omniWidth, 28)
  doc.setFontSize(6)
  doc.setFont('helvetica', 'normal')
  doc.text('S O L U T I O N S   L I M I T E D', 30, 33)

  doc.setTextColor(slate)
  doc.setFontSize(7)
  let contactY = 40
  if (invoiceData.business.address) {
    const addressLines = doc.splitTextToSize(invoiceData.business.address, 90)
    doc.text(addressLines.slice(0, 1), 22, contactY)
    contactY += 4.5
  }
  if (invoiceData.business.phone) {
    doc.text(invoiceData.business.phone, 22, contactY)
    contactY += 4.5
  }
  if (invoiceData.business.email) {
    doc.text(invoiceData.business.email, 22, contactY)
  }

  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(navy)
  doc.text('INVOICE', pageWidth - 15, 26, { align: 'right' })
  doc.setDrawColor(orange)
  doc.setLineWidth(1.2)
  doc.line(pageWidth - 33, 29, pageWidth - 15, 29)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(orange)
  doc.text(`#${invoiceData.invoice_number}`, pageWidth - 15, 35, { align: 'right' })

  doc.setFillColor(cream)
  doc.roundedRect(pageWidth - 65, 40, 50, 22, 2, 2, 'F')
  const statusColors = {
    'paid': '#10B981',
    'sent': '#F59E0B',
    'overdue': '#EF4444',
    'draft': navy
  }
  const statusColor = statusColors[invoiceData.status as keyof typeof statusColors] || navy
  doc.setFillColor(statusColor)
  doc.roundedRect(pageWidth - 32, 42, 14, 5, 2, 2, 'F')
  doc.setFontSize(6)
  doc.setTextColor('#FFFFFF')
  doc.setFont('helvetica', 'bold')
  doc.text(invoiceData.status.toUpperCase(), pageWidth - 25, 45.3, { align: 'center' })
  doc.setFontSize(7)
  doc.setTextColor(navy)
  doc.text('Invoice Date:', pageWidth - 62, 50)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(darkGray)
  doc.text(format(new Date(invoiceData.issue_date), 'MMM dd, yyyy'), pageWidth - 62, 54)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(navy)
  doc.text('ETA:', pageWidth - 62, 58)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(darkGray)
  doc.text(format(new Date(invoiceData.due_date), 'MMM dd, yyyy'), pageWidth - 62, 60)

  yPosition = 70
  doc.setFillColor(navy)
  doc.roundedRect(15, yPosition, 30, 7, 1, 1, 'F')
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor('#FFFFFF')
  doc.text('BILL TO', 18, yPosition + 5)
  yPosition += 11

  doc.setFillColor(cream)
  doc.roundedRect(15, yPosition, pageWidth - 30, 24, 2, 2, 'F')
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(navy)
  doc.text(invoiceData.client.name, 19, yPosition + 7)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(darkGray)
  let clientY = yPosition + 13
  if (invoiceData.client.address) {
    const addressLines = doc.splitTextToSize(invoiceData.client.address, pageWidth - 40)
    doc.text(addressLines.slice(0, 1), 19, clientY)
    clientY += 4.5
  }
  if (invoiceData.client.email) {
    doc.text(invoiceData.client.email, 19, clientY)
    clientY += 4.5
  }
  if (invoiceData.client.phone) {
    doc.text(invoiceData.client.phone, 19, clientY)
  }

  yPosition += 32

  const tableStartY = yPosition
  const tableMargin = 15
  const tableWidth = pageWidth - (tableMargin * 2)
  const tableX = tableMargin

  const availableHeight = pageHeight - tableStartY - 90
  const baseRowHeight = 8
  const tableHeaderHeight = 9

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
    columnPositions.push({ x: currentX, width: col.width, align: col.align })
    currentX += col.width
  })

  doc.setFillColor(navy)
  doc.rect(tableX, tableStartY, tableWidth, tableHeaderHeight, 'F')
  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor('#FFFFFF')
  columns.forEach((col, index) => {
    const colPos = columnPositions[index]
    let textX = colPos.x + 3
    if (col.align === 'center') textX = colPos.x + (colPos.width / 2)
    else if (col.align === 'right') textX = colPos.x + colPos.width - 3
    doc.text(col.label, textX, tableStartY + 6, { align: col.align as any })
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
      if (col.align === 'center') textX = colPos.x + (colPos.width / 2)
      else if (col.align === 'right') textX = colPos.x + colPos.width - 3
      doc.text(cellData, textX, yPosition + (actualRowHeight / 2) + 2, { align: col.align as any })
    })

    yPosition += actualRowHeight
  }

  const tableEndY = yPosition
  doc.setDrawColor('#E5E7EB')
  doc.setLineWidth(0.4)
  doc.rect(tableX, tableStartY, tableWidth, tableEndY - tableStartY)

  yPosition = tableEndY + 10
  doc.setDrawColor('#EAECF0')
  doc.roundedRect(pageWidth - 80, yPosition - 3, 65, invoiceData.discount_amount > 0 ? 26 : 18, 2, 2)

  doc.setFontSize(8)
  doc.setTextColor(darkGray)
  doc.setFont('helvetica', 'normal')
  doc.text('Subtotal:', pageWidth - 76, yPosition + 4)
  doc.text(`${getCurrencySymbol(invoiceData.currency)}${invoiceData.subtotal.toFixed(2)}`, pageWidth - 18, yPosition + 4, { align: 'right' })
  yPosition += 7

  if (invoiceData.discount_amount > 0) {
    doc.text('Discount:', pageWidth - 76, yPosition + 2)
    doc.setTextColor('#EF4444')
    doc.text(`-${getCurrencySymbol(invoiceData.currency)}${invoiceData.discount_amount.toFixed(2)}`, pageWidth - 18, yPosition + 2, { align: 'right' })
    doc.setTextColor(darkGray)
    yPosition += 7
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(orange)
  doc.text('TOTAL:', pageWidth - 76, yPosition + 5)
  doc.text(`${getCurrencySymbol(invoiceData.currency)}${invoiceData.total_amount.toFixed(2)}`, pageWidth - 18, yPosition + 5, { align: 'right' })

  yPosition += 18
  if (invoiceData.signature) {
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(navy)
    doc.text('CREATED BY:', 15, yPosition)
    yPosition += 6

    doc.setDrawColor('#D0D5DD')
    doc.setLineWidth(0.4)
    doc.line(15, yPosition + 6, 70, yPosition + 6)

    doc.setFont('helvetica', 'normal')
    doc.setTextColor(darkGray)
    doc.setFontSize(9)
    doc.text(invoiceData.signature, 15, yPosition + 11)

    yPosition += 17
  }

  if (invoiceData.notes || invoiceData.payment_instructions) {
    const notesText = invoiceData.notes || ''
    const paymentText = invoiceData.payment_instructions || ''
    const combinedText = [notesText, paymentText].filter(Boolean).join(' ')

    if (combinedText && yPosition < pageHeight - 25) {
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(navy)
      doc.text('NOTES:', 15, yPosition)
      yPosition += 5

      doc.setFont('helvetica', 'normal')
      doc.setTextColor(darkGray)
      doc.setFontSize(7)
      const textLines = doc.splitTextToSize(combinedText, pageWidth - 30)
      doc.text(textLines.slice(0, 2), 15, yPosition)
    }
  }

  const footerY = pageHeight - 15
  doc.setFillColor(cream)
  doc.rect(0, footerY - 6, pageWidth, 21, 'F')
  doc.setDrawColor(orange)
  doc.setLineWidth(1)
  doc.line(0, footerY - 6, pageWidth, footerY - 6)
  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(slate)
  doc.text(`Generated on ${format(new Date(), 'MMM dd, yyyy')}`, 15, footerY)
  doc.text(`Invoice #${invoiceData.invoice_number}`, pageWidth - 60, footerY)

  doc.save(`Invoice-${invoiceData.invoice_number}.pdf`)
}

const generateLocalDeliveryPDFBase64 = async (invoiceData: InvoiceData): Promise<string> => {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.width
  const pageHeight = doc.internal.pageSize.height
  let yPosition = 15

  const navy = '#0B2545'
  const orange = '#F26B1D'
  const cream = '#F7F5F2'
  const darkGray = '#374151'
  const slate = '#667085'
  const sender = invoiceData.sender || { name: null, phone: null, address: null }

  drawInvoiceBanner(doc, pageWidth, navy)

  drawLogoMark(doc, 22, 26, navy, orange)
  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(orange)
  doc.text('OMNi', 30, 28)
  const omniWidth = doc.getTextWidth('OMNi')
  doc.setTextColor(navy)
  doc.text('CARGO', 30 + omniWidth, 28)
  doc.setFontSize(6)
  doc.setFont('helvetica', 'normal')
  doc.text('S O L U T I O N S   L I M I T E D', 30, 33)
  doc.setTextColor(slate)
  doc.text('LOCAL DELIVERY INVOICE', 30, 39)

  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(navy)
  doc.text('INVOICE', pageWidth - 15, 26, { align: 'right' })
  doc.setDrawColor(orange)
  doc.setLineWidth(1.2)
  doc.line(pageWidth - 33, 29, pageWidth - 15, 29)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(orange)
  doc.text(`#${invoiceData.invoice_number}`, pageWidth - 15, 35, { align: 'right' })

  doc.setFillColor(cream)
  doc.roundedRect(pageWidth - 65, 40, 50, 22, 2, 2, 'F')
  doc.setFillColor(navy)
  doc.roundedRect(pageWidth - 32, 42, 14, 5, 2, 2, 'F')
  doc.setFontSize(6)
  doc.setTextColor('#FFFFFF')
  doc.setFont('helvetica', 'bold')
  doc.text(invoiceData.status.toUpperCase(), pageWidth - 25, 45.3, { align: 'center' })
  doc.setFontSize(7)
  doc.setTextColor(navy)
  doc.text('Invoice Date:', pageWidth - 62, 50)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(darkGray)
  doc.text(format(new Date(invoiceData.issue_date), 'MMM dd, yyyy'), pageWidth - 62, 54)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(navy)
  doc.text('ETA:', pageWidth - 62, 58)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(darkGray)
  doc.text(format(new Date(invoiceData.due_date), 'MMM dd, yyyy'), pageWidth - 62, 60)

  yPosition = 68
  const boxWidth = (pageWidth - 30 - 8) / 2

  doc.setFillColor(cream)
  doc.roundedRect(15, yPosition, boxWidth, 26, 2, 2, 'F')
  doc.roundedRect(15 + boxWidth + 8, yPosition, boxWidth, 26, 2, 2, 'F')

  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(navy)
  doc.text('SENDER', 19, yPosition + 6)
  doc.setTextColor(orange)
  doc.text('RECIPIENT', 19 + boxWidth + 8, yPosition + 6)

  doc.setFont('helvetica', 'normal')
  doc.setTextColor(darkGray)
  doc.setFontSize(8)
  doc.text(sender.name || '-', 19, yPosition + 12)
  if (sender.phone) doc.text(sender.phone, 19, yPosition + 17)
  if (sender.address) doc.text(doc.splitTextToSize(sender.address, boxWidth - 8).slice(0, 2), 19, yPosition + 22)

  doc.text(invoiceData.client.name, 19 + boxWidth + 8, yPosition + 12)
  if (invoiceData.client.phone) doc.text(invoiceData.client.phone, 19 + boxWidth + 8, yPosition + 17)
  if (invoiceData.client.address) doc.text(doc.splitTextToSize(invoiceData.client.address, boxWidth - 8).slice(0, 2), 19 + boxWidth + 8, yPosition + 22)

  yPosition += 34

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

  doc.setFillColor(navy)
  doc.rect(tableX, yPosition, tableWidth, 9, 'F')
  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor('#FFFFFF')
  columns.forEach((col, i) => {
    const pos = colPositions[i]
    let textX = pos.x + 2
    if (col.align === 'center') textX = pos.x + pos.width / 2
    if (col.align === 'right') textX = pos.x + pos.width - 2
    doc.text(col.label, textX, yPosition + 6, { align: col.align as any })
  })

  yPosition += 9
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
  doc.rect(tableX, yPosition - (invoiceData.items.length * 8) - 9, tableWidth, (invoiceData.items.length * 8) + 9)

  yPosition += 10
  doc.setDrawColor('#EAECF0')
  doc.setLineWidth(0.4)
  doc.roundedRect(pageWidth - 80, yPosition - 3, 65, 16, 2, 2)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(orange)
  doc.text('TOTAL:', pageWidth - 76, yPosition + 6)
  doc.text(`₵${invoiceData.total_amount.toFixed(2)}`, pageWidth - 18, yPosition + 6, { align: 'right' })

  yPosition += 22
  if (invoiceData.signature) {
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(navy)
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
    doc.setTextColor(navy)
    doc.text('NOTES:', 15, yPosition)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(darkGray)
    doc.setFontSize(7)
    doc.text(doc.splitTextToSize(invoiceData.notes, pageWidth - 30).slice(0, 3), 15, yPosition + 6)
  }

  const footerY = pageHeight - 15
  doc.setFillColor(cream)
  doc.rect(0, footerY - 6, pageWidth, 21, 'F')
  doc.setDrawColor(orange)
  doc.setLineWidth(1)
  doc.line(0, footerY - 6, pageWidth, footerY - 6)
  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(slate)
  doc.text(`Generated on ${format(new Date(), 'MMM dd, yyyy')}`, 15, footerY)
  doc.text(`Invoice #${invoiceData.invoice_number}`, pageWidth - 60, footerY)

  return doc.output('datauristring').split(',')[1]
}

export const generateInvoicePDFBase64 = async (invoiceData: InvoiceData): Promise<string> => {
  if (invoiceData.invoice_type === 'local_delivery') {
    return generateLocalDeliveryPDFBase64(invoiceData)
  }

  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.width
  const pageHeight = doc.internal.pageSize.height
  let yPosition = 15

  const navy = '#0B2545'
  const orange = '#F26B1D'
  const cream = '#F7F5F2'
  const darkGray = '#374151'
  const slate = '#667085'

  drawInvoiceBanner(doc, pageWidth, navy)

  drawLogoMark(doc, 22, 26, navy, orange)
  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(orange)
  doc.text('OMNi', 30, 28)
  const omniWidth = doc.getTextWidth('OMNi')
  doc.setTextColor(navy)
  doc.text('CARGO', 30 + omniWidth, 28)
  doc.setFontSize(6)
  doc.setFont('helvetica', 'normal')
  doc.text('S O L U T I O N S   L I M I T E D', 30, 33)

  doc.setTextColor(slate)
  doc.setFontSize(7)
  let contactY = 40
  if (invoiceData.business.address) {
    const addressLines = doc.splitTextToSize(invoiceData.business.address, 90)
    doc.text(addressLines.slice(0, 1), 22, contactY)
    contactY += 4.5
  }
  if (invoiceData.business.phone) {
    doc.text(invoiceData.business.phone, 22, contactY)
    contactY += 4.5
  }
  if (invoiceData.business.email) {
    doc.text(invoiceData.business.email, 22, contactY)
  }

  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(navy)
  doc.text('INVOICE', pageWidth - 15, 26, { align: 'right' })
  doc.setDrawColor(orange)
  doc.setLineWidth(1.2)
  doc.line(pageWidth - 33, 29, pageWidth - 15, 29)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(orange)
  doc.text(`#${invoiceData.invoice_number}`, pageWidth - 15, 35, { align: 'right' })

  doc.setFillColor(cream)
  doc.roundedRect(pageWidth - 65, 40, 50, 22, 2, 2, 'F')
  const statusColors = {
    'paid': '#10B981',
    'sent': '#F59E0B',
    'overdue': '#EF4444',
    'draft': navy
  }
  const statusColor = statusColors[invoiceData.status as keyof typeof statusColors] || navy
  doc.setFillColor(statusColor)
  doc.roundedRect(pageWidth - 32, 42, 14, 5, 2, 2, 'F')
  doc.setFontSize(6)
  doc.setTextColor('#FFFFFF')
  doc.setFont('helvetica', 'bold')
  doc.text(invoiceData.status.toUpperCase(), pageWidth - 25, 45.3, { align: 'center' })
  doc.setFontSize(7)
  doc.setTextColor(navy)
  doc.text('Invoice Date:', pageWidth - 62, 50)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(darkGray)
  doc.text(format(new Date(invoiceData.issue_date), 'MMM dd, yyyy'), pageWidth - 62, 54)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(navy)
  doc.text('ETA:', pageWidth - 62, 58)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(darkGray)
  doc.text(format(new Date(invoiceData.due_date), 'MMM dd, yyyy'), pageWidth - 62, 60)

  yPosition = 70
  doc.setFillColor(navy)
  doc.roundedRect(15, yPosition, 30, 7, 1, 1, 'F')
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor('#FFFFFF')
  doc.text('BILL TO', 18, yPosition + 5)
  yPosition += 11

  doc.setFillColor(cream)
  doc.roundedRect(15, yPosition, pageWidth - 30, 24, 2, 2, 'F')
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(navy)
  doc.text(invoiceData.client.name, 19, yPosition + 7)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(darkGray)
  let clientY = yPosition + 13
  if (invoiceData.client.address) {
    const addressLines = doc.splitTextToSize(invoiceData.client.address, pageWidth - 40)
    doc.text(addressLines.slice(0, 1), 19, clientY)
    clientY += 4.5
  }
  if (invoiceData.client.email) {
    doc.text(invoiceData.client.email, 19, clientY)
    clientY += 4.5
  }
  if (invoiceData.client.phone) {
    doc.text(invoiceData.client.phone, 19, clientY)
  }

  yPosition += 32

  const tableStartY = yPosition
  const tableMargin = 15
  const tableWidth = pageWidth - (tableMargin * 2)
  const tableX = tableMargin

  const availableHeight = pageHeight - tableStartY - 90
  const baseRowHeight = 8
  const tableHeaderHeight = 9

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
    columnPositions.push({ x: currentX, width: col.width, align: col.align })
    currentX += col.width
  })

  doc.setFillColor(navy)
  doc.rect(tableX, tableStartY, tableWidth, tableHeaderHeight, 'F')
  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor('#FFFFFF')
  columns.forEach((col, index) => {
    const colPos = columnPositions[index]
    let textX = colPos.x + 3
    if (col.align === 'center') textX = colPos.x + (colPos.width / 2)
    else if (col.align === 'right') textX = colPos.x + colPos.width - 3
    doc.text(col.label, textX, tableStartY + 6, { align: col.align as any })
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
      if (col.align === 'center') textX = colPos.x + (colPos.width / 2)
      else if (col.align === 'right') textX = colPos.x + colPos.width - 3
      doc.text(cellData, textX, yPosition + (actualRowHeight / 2) + 2, { align: col.align as any })
    })

    yPosition += actualRowHeight
  }

  const tableEndY = yPosition
  doc.setDrawColor('#E5E7EB')
  doc.setLineWidth(0.4)
  doc.rect(tableX, tableStartY, tableWidth, tableEndY - tableStartY)

  yPosition = tableEndY + 10
  doc.setDrawColor('#EAECF0')
  doc.roundedRect(pageWidth - 80, yPosition - 3, 65, invoiceData.discount_amount > 0 ? 26 : 18, 2, 2)

  doc.setFontSize(8)
  doc.setTextColor(darkGray)
  doc.setFont('helvetica', 'normal')
  doc.text('Subtotal:', pageWidth - 76, yPosition + 4)
  doc.text(`${getCurrencySymbol(invoiceData.currency)}${invoiceData.subtotal.toFixed(2)}`, pageWidth - 18, yPosition + 4, { align: 'right' })
  yPosition += 7

  if (invoiceData.discount_amount > 0) {
    doc.text('Discount:', pageWidth - 76, yPosition + 2)
    doc.setTextColor('#EF4444')
    doc.text(`-${getCurrencySymbol(invoiceData.currency)}${invoiceData.discount_amount.toFixed(2)}`, pageWidth - 18, yPosition + 2, { align: 'right' })
    doc.setTextColor(darkGray)
    yPosition += 7
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(orange)
  doc.text('TOTAL:', pageWidth - 76, yPosition + 5)
  doc.text(`${getCurrencySymbol(invoiceData.currency)}${invoiceData.total_amount.toFixed(2)}`, pageWidth - 18, yPosition + 5, { align: 'right' })

  yPosition += 18
  if (invoiceData.signature) {
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(navy)
    doc.text('CREATED BY:', 15, yPosition)
    yPosition += 6

    doc.setDrawColor('#D0D5DD')
    doc.setLineWidth(0.4)
    doc.line(15, yPosition + 6, 70, yPosition + 6)

    doc.setFont('helvetica', 'normal')
    doc.setTextColor(darkGray)
    doc.setFontSize(9)
    doc.text(invoiceData.signature, 15, yPosition + 11)

    yPosition += 17
  }

  if (invoiceData.notes || invoiceData.payment_instructions) {
    const notesText = invoiceData.notes || ''
    const paymentText = invoiceData.payment_instructions || ''
    const combinedText = [notesText, paymentText].filter(Boolean).join(' ')

    if (combinedText && yPosition < pageHeight - 25) {
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(navy)
      doc.text('NOTES:', 15, yPosition)
      yPosition += 5

      doc.setFont('helvetica', 'normal')
      doc.setTextColor(darkGray)
      doc.setFontSize(7)
      const textLines = doc.splitTextToSize(combinedText, pageWidth - 30)
      doc.text(textLines.slice(0, 2), 15, yPosition)
    }
  }

  const footerY = pageHeight - 15
  doc.setFillColor(cream)
  doc.rect(0, footerY - 6, pageWidth, 21, 'F')
  doc.setDrawColor(orange)
  doc.setLineWidth(1)
  doc.line(0, footerY - 6, pageWidth, footerY - 6)
  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(slate)
  doc.text(`Generated on ${format(new Date(), 'MMM dd, yyyy')}`, 15, footerY)
  doc.text(`Invoice #${invoiceData.invoice_number}`, pageWidth - 60, footerY)

  return doc.output('datauristring').split(',')[1]
}

export const generateInvoiceImage = async (invoiceData: InvoiceData): Promise<string> => {
  if (invoiceData.invoice_type === 'local_delivery') {
    return generateLocalDeliveryImage(invoiceData)
  }

  return new Promise((resolve, reject) => {
    // Create a temporary div to render the invoice
    const invoiceDiv = document.createElement('div')
    invoiceDiv.style.position = 'absolute'
    invoiceDiv.style.left = '-9999px'
    invoiceDiv.style.width = '800px'
    invoiceDiv.style.backgroundColor = '#dcdde0'
    invoiceDiv.style.padding = '24px'
    invoiceDiv.style.fontFamily = 'Arial, sans-serif'
    invoiceDiv.style.lineHeight = '1.4'

    const navy = '#0B2545'
    const orange = '#F26B1D'

    invoiceDiv.innerHTML = `
      <div style="background: white;">
        <div style="height: 50px; position: relative; overflow: hidden; background: linear-gradient(115deg, #FDBA8C 0%, #FFEFE3 60%, #FFFFFF 100%);">
          <div style="position: absolute; top:0; left:0; width: 52%; height: 100%; background: ${navy}; clip-path: polygon(0 0, 100% 0, 68% 100%, 0 100%);"></div>
        </div>

        <div style="padding: 32px 44px 0 44px;">
          <div style="display: flex; align-items: stretch; margin-bottom: 24px;">
            <div style="flex: 1; padding-right: 24px;">
              <div style="display: flex; align-items: center; gap: 4px; margin-bottom: 6px;">
                <div style="width: 40px; height: 40px; border-radius: 50%; background: ${orange}; flex-shrink: 0;"></div>
                <svg width="48" height="48" viewBox="0 0 100 100" style="margin-left: 4px;">
                  <path d="M 76 14 A 43 43 0 1 0 76 86" fill="none" stroke="${navy}" stroke-width="27"/>
                </svg>
                <span style="font-size: 24px; font-weight: 800; letter-spacing: 0.01em; margin-left: 6px;"><span style="color: ${orange};">OMNi</span><span style="color: ${navy};">CARGO</span></span>
              </div>
              <p style="font-size: 10px; letter-spacing: 0.32em; color: ${navy}; margin: 0 0 0 82px; font-weight: 500;">SOLUTIONS LIMITED</p>

              <div style="margin-top: 24px; font-size: 11px; color: #475467;">
                ${invoiceData.business.address ? `<div style="display: flex; align-items: center; gap: 9px; margin-bottom: 9px;"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#667085" stroke-width="2"><path d="M12 21s7-6.5 7-12a7 7 0 10-14 0c0 5.5 7 12 7 12z"/><circle cx="12" cy="9" r="2.5"/></svg><span>${invoiceData.business.address}</span></div>` : ''}
                ${invoiceData.business.phone ? `<div style="display: flex; align-items: center; gap: 9px; margin-bottom: 9px;"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#667085" stroke-width="2"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.12.81.35 1.6.68 2.34a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.74-1.25a2 2 0 012.11-.45c.74.33 1.53.56 2.34.68A2 2 0 0122 16.92z"/></svg><span>${invoiceData.business.phone}</span></div>` : ''}
                ${invoiceData.business.email ? `<div style="display: flex; align-items: center; gap: 9px; margin-bottom: 9px;"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#667085" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 6l-10 7L2 6"/></svg><span>${invoiceData.business.email}</span></div>` : ''}
              </div>
            </div>

            <div style="width: 1px; background: #D0D5DD; margin: 3px 18px;"></div>

            <div style="flex: 1; padding-left: 4px;">
              <h1 style="font-size: 32px; font-weight: 800; color: ${navy}; letter-spacing: 0.01em; margin: 0;">INVOICE</h1>
              <div style="width: 36px; height: 3px; background: ${orange}; margin: 5px 0 10px 0;"></div>
              <p style="font-size: 11px; font-weight: 600; color: ${orange}; margin-bottom: 14px;">#${invoiceData.invoice_number}</p>

              <div style="background: #F7F5F2; border-radius: 6px; padding: 14px 16px; position: relative;">
                <span style="position: absolute; top: 12px; right: 14px; background: ${navy}; color: white; font-size: 9px; font-weight: 700; letter-spacing: 0.05em; padding: 4px 11px; border-radius: 12px;">${invoiceData.status.toUpperCase()}</span>
                <p style="font-size: 11px; font-weight: 700; color: ${navy}; margin: 0 0 2px 0;">Invoice Date:</p>
                <p style="font-size: 12px; color: #344054; margin: 0 0 8px 0;">${format(new Date(invoiceData.issue_date), 'MMM dd, yyyy')}</p>
                <p style="font-size: 11px; font-weight: 700; color: ${navy}; margin: 0 0 2px 0;">ETA:</p>
                <p style="font-size: 12px; color: #344054; margin: 0;">${format(new Date(invoiceData.due_date), 'MMM dd, yyyy')}</p>
              </div>
            </div>
          </div>

          <span style="display: inline-block; background: ${navy}; color: white; font-size: 10px; font-weight: 700; letter-spacing: 0.05em; padding: 7px 16px; border-radius: 4px;">BILL TO</span>
          <div style="background: #F7F5F2; border-radius: 6px; padding: 16px 18px; margin-top: 8px;">
            <p style="font-size: 14px; font-weight: 700; color: ${navy}; margin: 0 0 4px 0;">${invoiceData.client.name}</p>
            ${invoiceData.client.address ? `<p style="font-size: 12px; color: #475467; margin: 0;">${invoiceData.client.address}</p>` : ''}
            ${invoiceData.client.phone ? `<p style="font-size: 12px; color: #475467; margin: 0;">${invoiceData.client.phone}</p>` : ''}
          </div>

          <table style="width: 100%; border-collapse: collapse; margin: 24px 0 16px 0;">
            <thead>
              <tr style="background: ${navy};">
                <th style="color: white; font-size: 10px; font-weight: 600; letter-spacing: 0.03em; text-transform: uppercase; padding: 11px 12px; text-align: left;">Shipment Type</th>
                <th style="color: white; font-size: 10px; font-weight: 600; letter-spacing: 0.03em; text-transform: uppercase; padding: 11px 12px; text-align: left;">Description</th>
                <th style="color: white; font-size: 10px; font-weight: 600; letter-spacing: 0.03em; text-transform: uppercase; padding: 11px 12px; text-align: center;">Qty</th>
                <th style="color: white; font-size: 10px; font-weight: 600; letter-spacing: 0.03em; text-transform: uppercase; padding: 11px 12px; text-align: center;">CBM</th>
                <th style="color: white; font-size: 10px; font-weight: 600; letter-spacing: 0.03em; text-transform: uppercase; padding: 11px 12px; text-align: center;">Price</th>
                <th style="color: white; font-size: 10px; font-weight: 600; letter-spacing: 0.03em; text-transform: uppercase; padding: 11px 12px; text-align: center;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${invoiceData.items.map((item) => {
                const parts = item.description.split(': ')
                const shipmentType = parts.length > 1 ? parts[0] : (item.shipment_type || 'N/A')
                const description = parts.length > 1 ? parts[1] : item.description
                const totalCBM = item.quantity
                const individualQty = item.item_quantity || 1
                const individualCBM = item.cbm || (totalCBM / individualQty)

                return `
                  <tr>
                    <td style="padding: 12px; font-size: 11px; color: #344054; border-bottom: 1px solid #EAECF0;">${shipmentType}</td>
                    <td style="padding: 12px; font-size: 11px; color: #344054; border-bottom: 1px solid #EAECF0;">${description}</td>
                    <td style="padding: 12px; text-align: center; font-size: 11px; color: #344054; border-bottom: 1px solid #EAECF0;">${individualQty}</td>
                    <td style="padding: 12px; text-align: center; font-size: 11px; color: #344054; border-bottom: 1px solid #EAECF0;">${individualCBM.toFixed(3)}</td>
                    <td style="padding: 12px; text-align: center; font-size: 11px; color: #344054; border-bottom: 1px solid #EAECF0;">${getCurrencySymbol(invoiceData.currency)}${item.unit_price.toFixed(2)}</td>
                    <td style="padding: 12px; text-align: center; font-size: 11px; color: #344054; border-bottom: 1px solid #EAECF0;">${getCurrencySymbol(invoiceData.currency)}${item.total.toFixed(2)}</td>
                  </tr>
                `
              }).join('')}
            </tbody>
          </table>

          <div style="display: flex; justify-content: flex-end; margin-bottom: 26px;">
            <div style="border: 1px solid #EAECF0; border-radius: 6px; padding: 16px 20px; min-width: 260px;">
              <div style="display: flex; justify-content: space-between; font-size: 12px; color: #344054; padding-bottom: 10px; margin-bottom: 10px; border-bottom: 1px solid #EAECF0;">
                <span>Subtotal:</span><span>${getCurrencySymbol(invoiceData.currency)}${invoiceData.subtotal.toFixed(2)}</span>
              </div>
              ${invoiceData.discount_amount > 0 ? `
                <div style="display: flex; justify-content: space-between; font-size: 12px; color: #ef4444; padding-bottom: 10px; margin-bottom: 10px;">
                  <span>Discount:</span><span>-${getCurrencySymbol(invoiceData.currency)}${invoiceData.discount_amount.toFixed(2)}</span>
                </div>
              ` : ''}
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="font-size: 14px; font-weight: 700; color: ${orange};">TOTAL:</span>
                <span style="font-size: 18px; font-weight: 700; color: ${orange};">${getCurrencySymbol(invoiceData.currency)}${invoiceData.total_amount.toFixed(2)}</span>
              </div>
            </div>
          </div>

          ${invoiceData.signature ? `
            <p style="font-size: 11px; font-weight: 700; color: ${navy}; margin-bottom: 12px;">CREATED BY:</p>
            <div style="width: 230px; border-bottom: 1px solid #D0D5DD; margin-bottom: 7px;"></div>
            <p style="font-size: 12px; color: #344054; margin-bottom: 22px;">${invoiceData.signature}</p>
          ` : ''}

          ${(invoiceData.notes || invoiceData.payment_instructions) ? `
            <p style="font-size: 11px; font-weight: 700; color: ${navy}; margin-bottom: 7px;">NOTES:</p>
            <p style="font-size: 10px; color: #667085; line-height: 1.7; margin: 0 0 26px 0;">${[invoiceData.notes, invoiceData.payment_instructions].filter(Boolean).join('<br><br>')}</p>
          ` : ''}
        </div>

        <div style="display: flex; justify-content: space-between; padding: 14px 44px; background: #F7F5F2; border-top: 2px solid ${orange}; font-size: 10px; color: #667085;">
          <span>Generated on ${format(new Date(), 'MMM dd, yyyy')}</span>
          <span>Invoice #${invoiceData.invoice_number}</span>
        </div>
      </div>
    `

    document.body.appendChild(invoiceDiv)

    // Convert to canvas with higher quality settings
    html2canvas(invoiceDiv, {
      scale: 2.5, // Higher scale for better quality
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#dcdde0',
      logging: false,
      width: 800
    }).then(canvas => {
      document.body.removeChild(invoiceDiv)
      const imageDataUrl = canvas.toDataURL('image/png', 0.95) // Higher quality
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
    invoiceDiv.style.backgroundColor = '#dcdde0'
    invoiceDiv.style.padding = '24px'
    invoiceDiv.style.fontFamily = 'Arial, sans-serif'
    invoiceDiv.style.lineHeight = '1.4'

    const navy = '#0B2545'
    const orange = '#F26B1D'
    const sender = invoiceData.sender || { name: null, phone: null, address: null }

    invoiceDiv.innerHTML = `
      <div style="background: white;">
        <div style="height: 50px; position: relative; overflow: hidden; background: linear-gradient(115deg, #FDBA8C 0%, #FFEFE3 60%, #FFFFFF 100%);">
          <div style="position: absolute; top:0; left:0; width: 52%; height: 100%; background: ${navy}; clip-path: polygon(0 0, 100% 0, 68% 100%, 0 100%);"></div>
        </div>

        <div style="padding: 32px 44px 0 44px;">
          <div style="display: flex; align-items: stretch; margin-bottom: 20px;">
            <div style="flex: 1; padding-right: 24px;">
              <div style="display: flex; align-items: center; gap: 4px; margin-bottom: 6px;">
                <div style="width: 40px; height: 40px; border-radius: 50%; background: ${orange}; flex-shrink: 0;"></div>
                <svg width="48" height="48" viewBox="0 0 100 100" style="margin-left: 4px;">
                  <path d="M 76 14 A 43 43 0 1 0 76 86" fill="none" stroke="${navy}" stroke-width="27"/>
                </svg>
                <span style="font-size: 24px; font-weight: 800; letter-spacing: 0.01em; margin-left: 6px;"><span style="color: ${orange};">OMNi</span><span style="color: ${navy};">CARGO</span></span>
              </div>
              <p style="font-size: 10px; letter-spacing: 0.32em; color: ${navy}; margin: 0 0 0 82px; font-weight: 500;">SOLUTIONS LIMITED</p>
              <p style="font-size: 10px; letter-spacing: 0.05em; color: #667085; margin: 18px 0 0 0; text-transform: uppercase;">Local Delivery Invoice</p>
            </div>

            <div style="width: 1px; background: #D0D5DD; margin: 3px 18px;"></div>

            <div style="flex: 1; padding-left: 4px;">
              <h1 style="font-size: 32px; font-weight: 800; color: ${navy}; letter-spacing: 0.01em; margin: 0;">INVOICE</h1>
              <div style="width: 36px; height: 3px; background: ${orange}; margin: 5px 0 10px 0;"></div>
              <p style="font-size: 11px; font-weight: 600; color: ${orange}; margin-bottom: 14px;">#${invoiceData.invoice_number}</p>

              <div style="background: #F7F5F2; border-radius: 6px; padding: 14px 16px; position: relative;">
                <span style="position: absolute; top: 12px; right: 14px; background: ${navy}; color: white; font-size: 9px; font-weight: 700; letter-spacing: 0.05em; padding: 4px 11px; border-radius: 12px;">${invoiceData.status.toUpperCase()}</span>
                <p style="font-size: 11px; font-weight: 700; color: ${navy}; margin: 0 0 2px 0;">Invoice Date:</p>
                <p style="font-size: 12px; color: #344054; margin: 0 0 8px 0;">${format(new Date(invoiceData.issue_date), 'MMM dd, yyyy')}</p>
                <p style="font-size: 11px; font-weight: 700; color: ${navy}; margin: 0 0 2px 0;">ETA:</p>
                <p style="font-size: 12px; color: #344054; margin: 0;">${format(new Date(invoiceData.due_date), 'MMM dd, yyyy')}</p>
              </div>
            </div>
          </div>

          <div style="display: flex; gap: 16px; margin-bottom: 20px;">
            <div style="flex: 1;">
              <span style="display: inline-block; background: ${navy}; color: white; font-size: 10px; font-weight: 700; letter-spacing: 0.05em; padding: 7px 16px; border-radius: 4px;">SENDER</span>
              <div style="background: #F7F5F2; border-radius: 6px; padding: 16px 18px; margin-top: 8px;">
                <p style="font-size: 14px; font-weight: 700; color: ${navy}; margin: 0 0 4px 0;">${sender.name || '&mdash;'}</p>
                ${sender.phone ? `<p style="font-size: 12px; color: #475467; margin: 0;">${sender.phone}</p>` : ''}
                ${sender.address ? `<p style="font-size: 12px; color: #475467; margin: 0;">${sender.address}</p>` : ''}
              </div>
            </div>
            <div style="flex: 1;">
              <span style="display: inline-block; background: ${orange}; color: white; font-size: 10px; font-weight: 700; letter-spacing: 0.05em; padding: 7px 16px; border-radius: 4px;">RECIPIENT</span>
              <div style="background: #F7F5F2; border-radius: 6px; padding: 16px 18px; margin-top: 8px;">
                <p style="font-size: 14px; font-weight: 700; color: ${navy}; margin: 0 0 4px 0;">${invoiceData.client.name}</p>
                ${invoiceData.client.phone ? `<p style="font-size: 12px; color: #475467; margin: 0;">${invoiceData.client.phone}</p>` : ''}
                ${invoiceData.client.address ? `<p style="font-size: 12px; color: #475467; margin: 0;">${invoiceData.client.address}</p>` : ''}
              </div>
            </div>
          </div>

          <table style="width: 100%; border-collapse: collapse; margin: 8px 0 16px 0;">
            <thead>
              <tr style="background: ${navy};">
                <th style="color: white; font-size: 10px; font-weight: 600; letter-spacing: 0.03em; text-transform: uppercase; padding: 11px 12px; text-align: left;">Route</th>
                <th style="color: white; font-size: 10px; font-weight: 600; letter-spacing: 0.03em; text-transform: uppercase; padding: 11px 12px; text-align: left;">Description</th>
                <th style="color: white; font-size: 10px; font-weight: 600; letter-spacing: 0.03em; text-transform: uppercase; padding: 11px 12px; text-align: center;">Qty</th>
                <th style="color: white; font-size: 10px; font-weight: 600; letter-spacing: 0.03em; text-transform: uppercase; padding: 11px 12px; text-align: center;">CBM</th>
                <th style="color: white; font-size: 10px; font-weight: 600; letter-spacing: 0.03em; text-transform: uppercase; padding: 11px 12px; text-align: center;">&cent;/CBM</th>
                <th style="color: white; font-size: 10px; font-weight: 600; letter-spacing: 0.03em; text-transform: uppercase; padding: 11px 12px; text-align: center;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${invoiceData.items.map((item) => `
                <tr>
                  <td style="padding: 12px; font-size: 11px; color: #344054; border-bottom: 1px solid #EAECF0;">${item.shipment_type || '&mdash;'}</td>
                  <td style="padding: 12px; font-size: 11px; color: #344054; border-bottom: 1px solid #EAECF0;">${item.description}</td>
                  <td style="padding: 12px; text-align: center; font-size: 11px; color: #344054; border-bottom: 1px solid #EAECF0;">${item.item_quantity ?? '&mdash;'}</td>
                  <td style="padding: 12px; text-align: center; font-size: 11px; color: #344054; border-bottom: 1px solid #EAECF0;">${(item.cbm ?? item.quantity).toFixed(3)}</td>
                  <td style="padding: 12px; text-align: center; font-size: 11px; color: #344054; border-bottom: 1px solid #EAECF0;">&#8373;${item.unit_price.toFixed(2)}</td>
                  <td style="padding: 12px; text-align: center; font-size: 11px; color: #344054; border-bottom: 1px solid #EAECF0;">&#8373;${item.total.toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div style="display: flex; justify-content: flex-end; margin-bottom: 26px;">
            <div style="border: 1px solid #EAECF0; border-radius: 6px; padding: 16px 20px; min-width: 260px;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="font-size: 14px; font-weight: 700; color: ${orange};">TOTAL:</span>
                <span style="font-size: 18px; font-weight: 700; color: ${orange};">&#8373;${invoiceData.total_amount.toFixed(2)}</span>
              </div>
            </div>
          </div>

          ${invoiceData.signature ? `
            <p style="font-size: 11px; font-weight: 700; color: ${navy}; margin-bottom: 12px;">CREATED BY:</p>
            <div style="width: 230px; border-bottom: 1px solid #D0D5DD; margin-bottom: 7px;"></div>
            <p style="font-size: 12px; color: #344054; margin-bottom: 22px;">${invoiceData.signature}</p>
          ` : ''}

          ${invoiceData.notes ? `
            <p style="font-size: 11px; font-weight: 700; color: ${navy}; margin-bottom: 7px;">NOTES:</p>
            <p style="font-size: 10px; color: #667085; line-height: 1.7; margin: 0 0 26px 0;">${invoiceData.notes}</p>
          ` : ''}
        </div>

        <div style="display: flex; justify-content: space-between; padding: 14px 44px; background: #F7F5F2; border-top: 2px solid ${orange}; font-size: 10px; color: #667085;">
          <span>Generated on ${format(new Date(), 'MMM dd, yyyy')}</span>
          <span>Invoice #${invoiceData.invoice_number}</span>
        </div>
      </div>
    `

    document.body.appendChild(invoiceDiv)

    html2canvas(invoiceDiv, {
      scale: 2.5,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#dcdde0',
      logging: false,
      width: 800
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

// Simplified WhatsApp sharing with direct image sharing
export const shareInvoiceViaWhatsApp = async (invoiceData: InvoiceData, phoneNumber?: string): Promise<void> => {
  try {
    // Detect device type for better UX
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    
    // Generate high-quality invoice image
    const imageDataUrl = await generateInvoiceImage(invoiceData)
    
    // Create a simple message without lengthy instructions
    const message = `Invoice #${invoiceData.invoice_number} - ${getCurrencySymbol(invoiceData.currency)}${invoiceData.total_amount.toFixed(2)}`

    // Create download link for the image
    const timestamp = format(new Date(), 'yyyyMMdd-HHmmss')
    const filename = `Invoice-${invoiceData.invoice_number}-${timestamp}.png`
    
    const link = document.createElement('a')
    link.download = filename
    link.href = imageDataUrl
    
    // Download the image silently
    link.style.display = 'none'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    // Small delay to ensure download starts
    await new Promise(resolve => setTimeout(resolve, 300))

    // Try to share via Web Share API if available (mobile devices)
    if (navigator.share && isMobile) {
      try {
        // Convert data URL to blob for sharing
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

    // Fallback: Open WhatsApp with message (user needs to attach image manually)
    let whatsappUrl: string
    
    if (phoneNumber) {
      // Clean and format phone number
      const cleanPhone = phoneNumber.replace(/[^\d+]/g, '')
      const formattedPhone = cleanPhone.startsWith('+') ? cleanPhone.slice(1) : cleanPhone
      whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`
    } else {
      whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`
    }
    
    // Open WhatsApp
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

// Generates the invoice image and triggers its download. Kept separate from
// opening WhatsApp so the WhatsApp chat can be opened immediately (using data
// already on hand), while this slower step runs alongside it in the background.
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

// Utility function to copy image to clipboard (for supported browsers)
export const copyInvoiceImageToClipboard = async (
  getInvoiceData: () => Promise<InvoiceData>
): Promise<boolean> => {
  try {
    if (!navigator.clipboard || !window.ClipboardItem) {
      return false // Clipboard API not supported
    }

    // navigator.clipboard.write() must run immediately when this function is
    // called, with nothing awaited beforehand by the caller either - otherwise
    // the browser no longer considers this a direct result of the user's tap
    // and blocks it. Everything slow - fetching the invoice data over the
    // network, then rendering the image - now happens inside this promise,
    // which is handed to ClipboardItem without being awaited first.
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