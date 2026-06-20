import { Router } from 'express';
import authenticate from '../middleware/auth.js';
import { requirePermission } from '../utils/permissions.js';
import { getCreditNotes, getCreditNote, getRefunds, getReturnSummary } from '../controllers/creditNoteController.js';

const router = Router();
router.use(authenticate);

router.get('/summary', requirePermission('returns.read'), getReturnSummary);
router.get('/refunds', requirePermission('returns.read'), getRefunds);
router.get('/', requirePermission('returns.read'), getCreditNotes);
router.get('/:id', requirePermission('returns.read'), getCreditNote);

export default router;
