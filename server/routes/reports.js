import { Router } from 'express';
import authenticate from '../middleware/auth.js';
import authorize from '../middleware/authorize.js';
import catchAsync from '../utils/catchAsync.js';
import AppError from '../utils/AppError.js';
import { getReportsSummary, fetchExportData } from '../services/reportsSummary.js';
import { streamOrdersPdf, streamOrdersExcel } from '../utils/reportExport.js';

const router = Router();

router.use(authenticate);
router.use(authorize('admin', 'salesman', 'shopkeeper'));

router.get('/summary', catchAsync(async (req, res) => {
  const { startDate, endDate } = req.query;
  const summary = await getReportsSummary(req.user, startDate, endDate);
  res.json({ success: true, data: summary });
}));

router.get('/orders/export', catchAsync(async (req, res) => {
  const { startDate, endDate, format } = req.query;

  if (!format || !['pdf', 'excel'].includes(format)) {
    throw AppError.validation('format must be pdf or excel');
  }

  const exportData = await fetchExportData(req.user, startDate, endDate);

  if (format === 'pdf') {
    streamOrdersPdf(res, exportData);
    return;
  }

  await streamOrdersExcel(res, exportData);
}));

export default router;
