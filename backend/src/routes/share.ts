import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/firebaseAuth';
import { createSignedDownloadUrl } from '../services/storage';
import { sendFileSharedEmail } from '../services/emailService';
import { z } from 'zod';

const router = Router();

// ─── POST /api/share ─────────────────────────────────────────────────────────
const createShareSchema = z.object({
  fileId: z.string(),
  recipientEmail: z.string().email().optional(),
  encryptedKeyForRecipient: z.string().optional(),
  canView: z.boolean().default(true),
  canDownload: z.boolean().default(false),
  canEdit: z.boolean().default(false),
  expiresAt: z.string().datetime().optional(),
  maxViews: z.number().int().positive().optional(),
  password: z.string().optional(),
  requireOTP: z.boolean().default(false),
  ipRestriction: z.string().optional(),
  customMessage: z.string().optional(),
  notifyRecipient: z.boolean().default(true),
});

router.post('/', authenticate, async (req: Request, res: Response) => {
  try {
    const body = createShareSchema.parse(req.body);

    // Verify file ownership
    const file = await prisma.file.findFirst({
      where: { id: body.fileId, ownerId: req.user!.id, isDeleted: false },
    });

    if (!file) {
      res.status(404).json({ error: 'File not found or not owned by you' });
      return;
    }

    const share = await prisma.share.create({
      data: {
        fileId: body.fileId,
        ownerId: req.user!.id,
        recipientEmail: body.recipientEmail || null,
        encryptedKeyForRecipient: body.encryptedKeyForRecipient || null,
        canView: body.canView,
        canDownload: body.canDownload,
        canEdit: body.canEdit,
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
        maxViews: body.maxViews || null,
        requireOTP: body.requireOTP,
        ipRestriction: body.ipRestriction || null,
        customMessage: body.customMessage || null,
      },
    });

    // Log activity
    await prisma.activity.create({
      data: {
        userId: req.user!.id,
        fileId: body.fileId,
        action: 'share',
        ipAddress: req.ip,
        metadata: { recipientEmail: body.recipientEmail, shareId: share.id },
      },
    });

    // Notify if recipient email is registered
    if (body.recipientEmail) {
      const recipient = await prisma.user.findUnique({
        where: { email: body.recipientEmail },
      });
      if (recipient) {
        await prisma.notification.create({
          data: {
            userId: recipient.id,
            type: 'share',
            message: `${req.user!.name} shared "${file.filename}" with you`,
            fileId: body.fileId,
          },
        });
      }
    }

    const shareLink = `${process.env.CORS_ORIGIN}/share/${share.token}`;

    // Asynchronously send the email if requested
    if (body.notifyRecipient && body.recipientEmail) {
      // Fire and forget
      sendFileSharedEmail({
        shareId: share.id,
        recipientEmail: body.recipientEmail,
        senderName: req.user!.name,
        senderEmail: req.user!.email,
        filename: file.filename,
        fileSize: (Number(file.size) / (1024 * 1024)).toFixed(2) + ' MB',
        encryptionType: file.encryptionType,
        dateShared: share.createdAt,
        expiresAt: share.expiresAt,
        shareLink,
        customMessage: body.customMessage,
        permissions: {
          canView: share.canView,
          canDownload: share.canDownload,
          canEdit: share.canEdit,
          watermarkEnabled: file.watermarkEnabled,
        }
      }).catch(console.error);
    }

    res.json({ share, shareLink });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation failed', details: error.errors });
      return;
    }
    console.error('POST /share error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GET /api/share/:token ───────────────────────────────────────────────────
// Resolve a share token — validates expiry, view count, IP restriction
router.get('/:token', async (req: Request, res: Response) => {
  try {
    const share = await prisma.share.findUnique({
      where: { token: req.params.token },
      include: {
        file: {
          include: { encryptionLayers: { orderBy: { order: 'asc' } } },
        },
        owner: { select: { name: true, email: true, photo: true } },
      },
    });

    if (!share || share.isRevoked) {
      res.status(404).json({ error: 'Share link not found or has been revoked' });
      return;
    }

    if (share.expiresAt && new Date() > share.expiresAt) {
      res.status(410).json({ error: 'This share link has expired' });
      return;
    }

    if (share.maxViews && share.viewCount >= share.maxViews) {
      res.status(410).json({ error: 'Maximum views reached for this link' });
      return;
    }

    // IP restriction check
    if (share.ipRestriction) {
      const allowedIPs = share.ipRestriction.split(',').map((ip: string) => ip.trim());
      const clientIP = req.ip || '';
      if (!allowedIPs.includes(clientIP)) {
        res.status(403).json({ error: 'Access denied from your IP address' });
        return;
      }
    }

    // Increment view count
    await prisma.share.update({
      where: { id: share.id },
      data: { viewCount: { increment: 1 } },
    });

    // Generate download URL if allowed
    let downloadUrl: string | null = null;
    if (share.canDownload && !share.file.downloadDisabled) {
      downloadUrl = await createSignedDownloadUrl(share.file.encryptedPath);
    }

    // Get encrypted download URL for viewing (always needed for decryption)
    const encryptedFileUrl = await createSignedDownloadUrl(share.file.encryptedPath);

    res.json({
      share: {
        id: share.id,
        canView: share.canView,
        canDownload: share.canDownload,
        canEdit: share.canEdit,
        requiresPassword: !!share.passwordHash,
        requireOTP: share.requireOTP,
        expiresAt: share.expiresAt,
        maxViews: share.maxViews,
        viewCount: share.viewCount,
        encryptedKeyForRecipient: share.encryptedKeyForRecipient,
      },
      file: {
        id: share.file.id,
        filename: share.file.filename,
        mimeType: share.file.mimeType,
        size: share.file.size.toString(),
        encryptionType: share.file.encryptionType,
        encryptedKey: share.file.encryptedKey,
        iv: share.file.iv,
        encryptionLayers: share.file.encryptionLayers,
        watermarkEnabled: share.file.watermarkEnabled,
        downloadDisabled: share.file.downloadDisabled,
        // Watermark config
        watermarkFields: share.file.watermarkFields,
        watermarkText: share.file.watermarkText,
        watermarkOpacity: share.file.watermarkOpacity,
        watermarkFontSize: share.file.watermarkFontSize,
        watermarkRotation: share.file.watermarkRotation,
        watermarkPlacement: share.file.watermarkPlacement,
        watermarkColor: share.file.watermarkColor,
      },
      owner: share.owner,
      encryptedFileUrl,
      downloadUrl,
    });
  } catch (error) {
    console.error('GET /share/:token error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GET /api/share (owned shares) ──────────────────────────────────────────
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const shares = await prisma.share.findMany({
      where: { ownerId: req.user!.id, isRevoked: false },
      include: {
        file: { select: { id: true, filename: true, mimeType: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ shares });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── DELETE /api/share/:id (revoke) ──────────────────────────────────────────
router.delete('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const share = await prisma.share.findFirst({
      where: { id: req.params.id, ownerId: req.user!.id },
    });

    if (!share) {
      res.status(404).json({ error: 'Share not found' });
      return;
    }

    await prisma.share.update({
      where: { id: req.params.id },
      data: { isRevoked: true },
    });

    await prisma.activity.create({
      data: {
        userId: req.user!.id,
        fileId: share.fileId,
        action: 'revoke',
        ipAddress: req.ip,
        metadata: { shareId: share.id },
      },
    });

    res.json({ message: 'Share revoked successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GET /api/share/shared-with-me ───────────────────────────────────────────
router.get('/with/me', authenticate, async (req: Request, res: Response) => {
  try {
    const shares = await prisma.share.findMany({
      where: {
        recipientEmail: req.user!.email,
        isRevoked: false,
      },
      include: {
        file: {
          select: {
            id: true,
            filename: true,
            mimeType: true,
            size: true,
            encryptionType: true,
          },
        },
        owner: { select: { name: true, email: true, photo: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      shares: shares.map((s: { file: { size: bigint } }) => ({
        ...s,
        file: { ...s.file, size: s.file.size.toString() },
      })),
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
