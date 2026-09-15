import { Router } from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { adminOnly } from '../middleware/adminMiddleware.js';
import { stats } from '../controllers/adminController.js';
const router = Router(); router.get('/stats', protect, adminOnly, stats); export default router;
