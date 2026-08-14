import { Router } from 'express';
import { attachmentsController } from './attachments.controller';
import { requireAuth } from '../../middleware/auth.middleware';
import { handleFileUpload } from '../../middleware/upload.middleware';

const router = Router();

// All attachment endpoints require authentication
router.use(requireAuth);

// 1. Upload Attachment (with multipart parsing, magic byte validation, 25MB limit)
router.post('/', handleFileUpload, (req, res) => attachmentsController.uploadAttachment(req, res));

// 2. List Attachments (filtered by entity_type, entity_id, current)
router.get('/', (req, res) => attachmentsController.getAttachments(req, res));

// 3. Get Single Attachment Metadata
router.get('/:id', (req, res) => attachmentsController.getAttachmentById(req, res));

// 4. Generate Short-Lived Signed Download URL (verifies scan_status === 'clean')
router.get('/:id/download', (req, res) => attachmentsController.getDownloadUrl(req, res));

// 5. Soft Delete Attachment (preserves file in storage for audit history)
router.delete('/:id', (req, res) => attachmentsController.softDeleteAttachment(req, res));

export default router;
