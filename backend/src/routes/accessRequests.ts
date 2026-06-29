import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/firebaseAuth';
import { z } from 'zod';

const router = Router();

// ─── GET /api/access-requests ────────────────────────────────────────────────
// Get incoming (for my files) and outgoing (requests I made)
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    const incoming = await prisma.accessRequest.findMany({
      where: {
        file: { ownerId: userId },
      },
      include: {
        file: { select: { id: true, filename: true, mimeType: true } },
        requester: { select: { id: true, email: true, name: true, photo: true } },
        share: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const outgoing = await prisma.accessRequest.findMany({
      where: { requesterId: userId },
      include: {
        file: { select: { id: true, filename: true, mimeType: true } },
        share: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ incoming, outgoing });
  } catch (error) {
    console.error('GET /access-requests error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST /api/access-requests ───────────────────────────────────────────────
const createRequestSchema = z.object({
  fileId: z.string(),
  shareId: z.string().optional().nullable(),
  message: z.string().optional(),
  requestedDownload: z.boolean().optional().default(false),
  requestedEdit: z.boolean().optional().default(false),
  requestedExpiresAt: z.string().optional().nullable(),
  requestedMaxViews: z.number().int().optional().nullable(),
});

router.post('/', authenticate, async (req: Request, res: Response) => {
  try {
    const data = createRequestSchema.parse(req.body);

    const file = await prisma.file.findUnique({
      where: { id: data.fileId },
      include: { owner: true },
    });

    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Check if there's already a pending request
    const existing = await prisma.accessRequest.findFirst({
      where: {
        fileId: data.fileId,
        requesterId: req.user!.id,
        status: 'pending'
      }
    });

    let requestRecord;
    if (existing) {
      requestRecord = await prisma.accessRequest.update({
        where: { id: existing.id },
        data: {
          shareId: data.shareId,
          message: data.message,
          requestedDownload: data.requestedDownload,
          requestedEdit: data.requestedEdit,
          requestedExpiresAt: data.requestedExpiresAt ? new Date(data.requestedExpiresAt) : null,
          requestedMaxViews: data.requestedMaxViews,
          updatedAt: new Date(),
        }
      });
    } else {
      requestRecord = await prisma.accessRequest.create({
        data: {
          fileId: data.fileId,
          requesterId: req.user!.id,
          shareId: data.shareId,
          message: data.message,
          requestedDownload: data.requestedDownload,
          requestedEdit: data.requestedEdit,
          requestedExpiresAt: data.requestedExpiresAt ? new Date(data.requestedExpiresAt) : null,
          requestedMaxViews: data.requestedMaxViews,
        }
      });

      // Notify the owner
      await prisma.notification.create({
        data: {
          userId: file.ownerId,
          type: 'request',
          message: `${req.user!.name || req.user!.email} requested access to ${file.filename}`,
          fileId: file.id,
        }
      });
    }

    await prisma.activity.create({
      data: {
        userId: req.user!.id,
        fileId: file.id,
        action: 'request_access',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        metadata: {
          requestId: requestRecord.id,
          requestedDownload: data.requestedDownload,
          requestedEdit: data.requestedEdit
        }
      }
    });

    res.status(201).json({ request: requestRecord });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('POST /access-requests error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── PATCH /api/access-requests/:id/approve ──────────────────────────────────
router.patch('/:id/approve', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const accessReq = await prisma.accessRequest.findUnique({
      where: { id },
      include: { file: true, requester: true }
    });

    if (!accessReq) return res.status(404).json({ error: 'Request not found' });
    if (accessReq.file.ownerId !== req.user!.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    if (accessReq.status !== 'pending') {
      return res.status(400).json({ error: 'Request is not pending' });
    }

    // Process approval
    const updatedRequest = await prisma.$transaction(async (tx) => {
      // 1. Update status
      const reqUpdated = await tx.accessRequest.update({
        where: { id },
        data: { status: 'approved' }
      });

      // 2. Update Share if provided
      if (accessReq.shareId) {
        await tx.share.update({
          where: { id: accessReq.shareId },
          data: {
            canDownload: accessReq.requestedDownload,
            canEdit: accessReq.requestedEdit,
            expiresAt: accessReq.requestedExpiresAt,
            maxViews: accessReq.requestedMaxViews,
          }
        });
      }

      // 3. Notify requester
      await tx.notification.create({
        data: {
          userId: accessReq.requesterId,
          type: 'request',
          message: `Your access request for ${accessReq.file.filename} was approved.`,
          fileId: accessReq.fileId,
        }
      });

      // 4. Log activity
      await tx.activity.create({
        data: {
          userId: req.user!.id,
          fileId: accessReq.fileId,
          action: 'approve_request',
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
          metadata: { requestId: id, requesterEmail: accessReq.requester.email }
        }
      });

      return reqUpdated;
    });

    res.json({ request: updatedRequest });
  } catch (error) {
    console.error('PATCH /access-requests/:id/approve error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── PATCH /api/access-requests/:id/reject ───────────────────────────────────
router.patch('/:id/reject', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const accessReq = await prisma.accessRequest.findUnique({
      where: { id },
      include: { file: true, requester: true }
    });

    if (!accessReq) return res.status(404).json({ error: 'Request not found' });
    if (accessReq.file.ownerId !== req.user!.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const updatedRequest = await prisma.$transaction(async (tx) => {
      const reqUpdated = await tx.accessRequest.update({
        where: { id },
        data: { status: 'rejected' }
      });

      await tx.notification.create({
        data: {
          userId: accessReq.requesterId,
          type: 'request',
          message: `Your access request for ${accessReq.file.filename} was rejected.`,
          fileId: accessReq.fileId,
        }
      });

      await tx.activity.create({
        data: {
          userId: req.user!.id,
          fileId: accessReq.fileId,
          action: 'reject_request',
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
          metadata: { requestId: id, requesterEmail: accessReq.requester.email }
        }
      });

      return reqUpdated;
    });

    res.json({ request: updatedRequest });
  } catch (error) {
    console.error('PATCH /access-requests/:id/reject error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
