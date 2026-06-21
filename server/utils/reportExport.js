import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';

const COMPANY_NAME = 'Prime Oil Suppliers';

function formatMoney(amount) {
  return `PKR ${Number(amount || 0).toLocaleString('en-PK')}`;
}

function dateRangeLabel(startDate, endDate) {
  if (startDate && endDate) return `${startDate} to ${endDate}`;
  if (startDate) return `From ${startDate}`;
  if (endDate) return `Through ${endDate}`;
  return 'All dates';
}

export function streamOrdersPdf(res, { orders, topProducts, summary, startDate, endDate }) {
  const filename = `analytics-report-${startDate || 'all'}-${endDate || 'all'}.pdf`;

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

  const doc = new PDFDocument({ margin: 48, size: 'A4' });
  doc.pipe(res);

  doc.fontSize(22).font('Helvetica-Bold').text(COMPANY_NAME, { align: 'center' });
  doc.moveDown(0.3);
  doc.fontSize(14).font('Helvetica-Bold').text('Analytics & Financial Report', { align: 'center' });
  doc.fontSize(10).font('Helvetica').text(`Period: ${dateRangeLabel(startDate, endDate)}`, { align: 'center' });
  doc.moveDown(2);

  doc.fontSize(14).font('Helvetica-Bold').text('Financial Summary', 48);
  doc.moveDown(0.5);
  doc.fontSize(11).font('Helvetica');
  doc.text(`Total Revenue: ${formatMoney(summary.totalRevenue)}`);
  doc.text(`Total Collected: ${formatMoney(summary.totalPaid)}`);
  doc.text(`Outstanding Balance: ${formatMoney(summary.outstandingBalance)}`);
  doc.text(`Total Expenses: ${formatMoney(summary.totalExpenses)}`);
  doc.text(`Net Profit: ${formatMoney(summary.netProfit)}`);
  doc.text(`Total Orders: ${summary.totalOrders}`);
  doc.moveDown(2);

  if (topProducts && topProducts.length > 0) {
    doc.fontSize(14).font('Helvetica-Bold').text('Top Products', 48);
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica-Bold');
    
    let prodY = doc.y;
    doc.text('Product Name', 48, prodY, { width: 300 });
    doc.text('Quantity Sold', 348, prodY);
    doc.moveDown(0.5);
    doc.font('Helvetica');
    
    const sanitizeText = (str) => String(str || 'N/A').replace(/[^\x00-\x7F]/g, '?');

    topProducts.slice(0, 5).forEach(p => {
      let py = doc.y;
      doc.text(sanitizeText(p.name), 48, py, { width: 300 });
      doc.text(String(p.quantitySold), 348, py);
    });
    doc.moveDown(2);
  }

  doc.fontSize(14).font('Helvetica-Bold').text('Recent Orders (Transcript)', 48);
  doc.moveDown(0.5);
  const tableTop = doc.y;
  const colX = [48, 120, 260, 310, 380, 460];
  const headers = ['Order #', 'Shopkeeper', 'Items', 'Total', 'Status'];

  doc.fontSize(10).font('Helvetica-Bold');
  headers.forEach((h, i) => doc.text(h, colX[i], tableTop, { width: colX[i + 1] - colX[i] - 4 }));
  doc.moveDown(0.6);
  doc.font('Helvetica');

  const sanitizeText = (str) => String(str || 'N/A').replace(/[^\x00-\x7F]/g, '?');

  let y = doc.y;
  orders.forEach(order => {
    if (y > 750) {
      doc.addPage();
      y = 48;
    }
    const row = [
      sanitizeText(order.orderId),
      sanitizeText(order.shopkeeper).slice(0, 28),
      sanitizeText(order.items),
      sanitizeText(formatMoney(order.total)),
      sanitizeText(order.status),
    ];
    row.forEach((cell, i) => doc.text(cell, colX[i], y, { width: colX[i + 1] - colX[i] - 4 }));
    y += 18;
    doc.y = y;
  });

  doc.end();
}

function autoWidthColumns(worksheet) {
  worksheet.columns.forEach(column => {
    let max = 10;
    column.eachCell({ includeEmpty: false }, cell => {
      const len = cell.value ? String(cell.value).length : 0;
      if (len > max) max = len;
    });
    column.width = Math.min(max + 2, 40);
  });
}

export async function streamOrdersExcel(res, { orders, payments, topProducts, summary, startDate, endDate }) {
  const filename = `orders-report-${startDate || 'all'}-${endDate || 'all'}.xlsx`;

  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = COMPANY_NAME;
  workbook.created = new Date();

  const ordersSheet = workbook.addWorksheet('Orders');
  ordersSheet.addRow([COMPANY_NAME]);
  ordersSheet.addRow([`Orders export — ${dateRangeLabel(startDate, endDate)}`]);
  ordersSheet.addRow([]);
  ordersSheet.addRow(['Order #', 'Shopkeeper', 'Items', 'Total (PKR)', 'Status', 'Date']);
  orders.forEach(o => {
    ordersSheet.addRow([
      o.orderId,
      o.shopkeeper,
      o.items,
      o.total,
      o.status,
      o.date || (o.createdAt ? new Date(o.createdAt).toISOString().slice(0, 10) : ''),
    ]);
  });
  ordersSheet.addRow([]);
  ordersSheet.addRow(['Summary']);
  ordersSheet.addRow(['Total orders', summary.totalOrders]);
  ordersSheet.addRow(['Total revenue', summary.totalRevenue]);
  ordersSheet.addRow(['Total collected', summary.totalPaid]);
  ordersSheet.addRow(['Outstanding', summary.outstandingBalance]);
  autoWidthColumns(ordersSheet);

  const paymentsSheet = workbook.addWorksheet('Payments');
  paymentsSheet.addRow(['Payment #', 'Shop', 'Order #', 'Total', 'Paid', 'Status', 'Type']);
  payments.forEach(p => {
    paymentsSheet.addRow([
      p.paymentId,
      p.shop,
      p.orderId,
      p.total,
      p.paid,
      p.status,
      p.type,
    ]);
  });
  autoWidthColumns(paymentsSheet);

  const productsSheet = workbook.addWorksheet('Top Products');
  productsSheet.addRow(['Product', 'Quantity sold']);
  topProducts.forEach(p => {
    productsSheet.addRow([p.name, p.quantitySold]);
  });
  autoWidthColumns(productsSheet);

  await workbook.xlsx.write(res);
  res.end();
}
