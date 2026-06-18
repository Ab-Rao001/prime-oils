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

export function streamOrdersPdf(res, { orders, summary, startDate, endDate }) {
  const filename = `orders-report-${startDate || 'all'}-${endDate || 'all'}.pdf`;

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

  const doc = new PDFDocument({ margin: 48, size: 'A4' });
  doc.pipe(res);

  doc.fontSize(22).font('Helvetica-Bold').text(COMPANY_NAME, { align: 'center' });
  doc.moveDown(0.3);
  doc.fontSize(12).font('Helvetica').text('Orders Report', { align: 'center' });
  doc.text(`Period: ${dateRangeLabel(startDate, endDate)}`, { align: 'center' });
  doc.moveDown(1);

  const tableTop = doc.y;
  const colX = [48, 120, 260, 310, 380, 460];
  const headers = ['Order #', 'Shopkeeper', 'Items', 'Total', 'Status'];

  doc.fontSize(10).font('Helvetica-Bold');
  headers.forEach((h, i) => doc.text(h, colX[i], tableTop, { width: colX[i + 1] - colX[i] - 4 }));
  doc.moveDown(0.6);
  doc.font('Helvetica');

  let y = doc.y;
  orders.forEach(order => {
    if (y > 700) {
      doc.addPage();
      y = 48;
    }
    const row = [
      order.orderId || '—',
      String(order.shopkeeper || '—').slice(0, 28),
      String(order.items ?? '—'),
      formatMoney(order.total),
      order.status || '—',
    ];
    row.forEach((cell, i) => doc.text(cell, colX[i], y, { width: colX[i + 1] - colX[i] - 4 }));
    y += 18;
    doc.y = y;
  });

  doc.moveDown(1.5);
  doc.font('Helvetica-Bold').fontSize(11);
  doc.text('Summary', 48);
  doc.font('Helvetica').fontSize(10);
  doc.text(`Total orders: ${summary.totalOrders}`, 48);
  doc.text(`Total revenue: ${formatMoney(summary.totalRevenue)}`, 48);
  doc.text(`Total collected: ${formatMoney(summary.totalPaid)}`, 48);
  doc.text(`Outstanding balance: ${formatMoney(summary.outstandingBalance)}`, 48);

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
