import { Router } from 'express';
import { uploadMiddleware } from '../app/middleware/upload.middleware';
import { processBillController } from '../app/controller/process.controller';

const router = Router();

// Accepts both Image (via form-data) or JSON text
router.post('/process', uploadMiddleware, processBillController);

export default router;
