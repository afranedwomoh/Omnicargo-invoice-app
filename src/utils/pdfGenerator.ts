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
