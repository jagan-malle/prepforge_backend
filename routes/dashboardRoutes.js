import { Router } from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { overview } from '../controllers/dashboardController.js';
const router = Router(); router.get('/overview', protect, overview); export default router;
