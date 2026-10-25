import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/firebaseAuth';
import { uploadEncryptedFile, createSignedDownloadUrl, deleteEncryptedFile, downloadFileBuffer } from '../services/storage';
import multer from 'multer';

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 500 * 1024 * 1024 } // 500MB
});
import { z } from 'zod';

const router = Router();

// ─── GET /api/files ──────────────────────────────────────────────────────────
// Get all files owned by the authenticated user
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const { folderId, search, sort = 'createdAt', order = 'desc', favorite } = req.query;

    const files = await prisma.file.findMany({
      where: {
        ownerId: req.user!.id,
        isDeleted: false,
        ...(folderId ? { folderId: String(folderId) } : {}),
        ...(favorite === 'true' && { isFavorite: true }),
        ...(search && {
          filename: { contains: String(search), mode: 'insensitive' },
        }),
      },
      include: {
        encryptionLayers: { orderBy: { order: 'asc' } },
        _count: { select: { shares: true } },
      },
      orderBy: { [String(sort)]: order },
    });

    res.json({ files });
  } catch (error) {
    console.error('GET /files error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST /api/files/upload ──────────────────────────────────────────────────
// Receive multipart form data, upload to Supabase, store metadata
const uploadSchema = z.object({
  mimeType: z.string(),
  filename: z.string().min(1).max(255),
  size: z.string().transform(Number),
  encryptionType: z.string(),
  encryptedKey: z.string(),
  iv: z.string(),
  folderId: z.string().optional(),
  layerCount: z.string().optional().transform(v => v ? parseInt(v, 10) : 1),
  watermarkEnabled: z.string().optional().transform(v => v === 'true'),
  downloadDisabled: z.string().optional().transform(v => v === 'true'),
  // Watermark config fields
  watermarkFields: z.string().optional(),
  watermarkText: z.string().optional(),
  watermarkOpacity: z.string().optional().transform(v => v ? parseInt(v, 10) : 50),
  watermarkFontSize: z.string().optional(),
  watermarkRotation: z.string().optional().transform(v => v ? parseInt(v, 10) : 45),
  watermarkPlacement: z.string().optional(),
  watermarkColor: z.string().optional(),
  layers: z.string().optional().transform(v => {
    if (!v) return undefined;
    try {
      const parsed = JSON.parse(v);
      return Array.isArray(parsed) ? parsed : undefined;
    } catch { return undefined; }
  }),
});

router.post('/upload', authenticate, upload.single('encryptedFile'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No encryptedFile provided' });
      return;
    }

    const body = uploadSchema.parse(req.body);
    
    // Check for existing file with the same name
    const existingFile = await prisma.file.findFirst({
      where: {
        ownerId: req.user!.id,
        filename: body.filename,
        folderId: body.folderId || null,
        isDeleted: false,
      }
    });

    if (existingFile) {
      res.status(409).json({ error: 'A file with this name already exists in this location.' });
      return;
    }
    
    // Upload buffer to Supabase Storage
    const storagePath = await uploadEncryptedFile(req.file.buffer, body.mimeType);

    // Create file metadata record
    const file = await prisma.file.create({
      data: {
        ownerId: req.user!.id,
        filename: body.filename,
        originalName: body.filename,
        encryptedPath: storagePath,
        size: BigInt(body.size),
        mimeType: body.mimeType,
        encryptionType: body.encryptionType,
        encryptedKey: body.encryptedKey,
        iv: body.iv,
        layerCount: body.layerCount,
        folderId: body.folderId || null,
        watermarkEnabled: body.watermarkEnabled ?? false,
        downloadDisabled: body.downloadDisabled ?? false,
        // Watermark config
        watermarkFields: body.watermarkFields || '[]',
        watermarkText: body.watermarkText || null,
        watermarkOpacity: body.watermarkOpacity ?? 50,
        watermarkFontSize: body.watermarkFontSize || 'medium',
        watermarkRotation: body.watermarkRotation ?? 45,
        watermarkPlacement: body.watermarkPlacement || 'diagonal',
        watermarkColor: body.watermarkColor || 'white',
        encryptionLayers: body.layers
          ? {
              create: body.layers.map((l: any) => ({
                algorithm: l.algorithm,
                order: l.order,
                iv: l.iv,
              })),
            }
          : undefined,
      },
      include: { encryptionLayers: true },
    });

    // Log activity
    await prisma.activity.create({
      data: {
        userId: req.user!.id,
        fileId: file.id,
        action: 'upload',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      },
    });

    res.json({ file: { ...file, size: file.size.toString() } });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation failed', details: error.errors });
      return;
    }
    console.error('POST /files/upload error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GET /api/files/:id ──────────────────────────────────────────────────────
router.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    // 1. Check if user is the owner
    let file = await prisma.file.findFirst({
      where: {
        id: req.params.id,
        ownerId: req.user!.id,
        isDeleted: false,
      },
      include: {
        encryptionLayers: { orderBy: { order: 'asc' } },
        shares: { where: { isRevoked: false }, take: 10 },
      },
    });

    let activeShare: any = null;

    // 2. If not owner, check if the file is shared with this user
    if (!file) {
      const share = await prisma.share.findFirst({
        where: {
          fileId: req.params.id,
          isRevoked: false,
          OR: [
            { recipientEmail: { equals: req.user!.email, mode: 'insensitive' } },
            { recipientEmail: null },
          ],
        },
        include: {
          file: {
            include: {
              encryptionLayers: { orderBy: { order: 'asc' } },
            },
          },
        },
      });

      if (share && !share.file.isDeleted) {
        const isExpired = share.expiresAt && new Date() > share.expiresAt;
        const maxViewsReached = share.maxViews && share.viewCount >= share.maxViews;

        if (!isExpired && !maxViewsReached) {
          file = {
            ...share.file,
            // Pass the recipient-specific encrypted key so recipient can decrypt using their own private key
            encryptedKey: share.encryptedKeyForRecipient || share.file.encryptedKey,
            shares: [],
          } as any;
          activeShare = share;
        }
      }
    }

    if (!file) {
      res.status(404).json({ error: 'File not found' });
      return;
    }

    // Always generate a signed URL for the encrypted blob (needed for decryption/preview)
    const encryptedFileUrl = await createSignedDownloadUrl(file.encryptedPath);

    // Only provide a download URL if download is permitted
    // (owners can always download; for share recipients, check both share.canDownload and file.downloadDisabled)
    const canDownload = activeShare ? (activeShare.canDownload && !file.downloadDisabled) : !file.downloadDisabled;
    const downloadUrl = canDownload ? encryptedFileUrl : undefined;

    res.json({
      file: { ...file, size: file.size.toString() },
      downloadUrl,
      encryptedFileUrl,
      permissions: activeShare ? {
        canView: activeShare.canView,
        canDownload: activeShare.canDownload && !file.downloadDisabled,
        canEdit: activeShare.canEdit,
        watermarkEnabled: file.watermarkEnabled,
      } : undefined,
    });
  } catch (error) {
    console.error('GET /files/:id error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GET /api/files/:id/download ─────────────────────────────────────────────
// Explicit download endpoint — enforces downloadDisabled at backend level
router.get('/:id/download', authenticate, async (req: Request, res: Response) => {
  try {
    // Allow access if user is the owner OR has an active share with canDownload
    const file = await prisma.file.findFirst({
      where: { id: req.params.id, isDeleted: false },
    });

    if (!file) {
      res.status(404).json({ error: 'File not found' });
      return;
    }

    const isOwner = file.ownerId === req.user!.id;

    if (!isOwner) {
      // Check for a valid share with canDownload
      const share = await prisma.share.findFirst({
        where: {
          fileId: file.id,
          isRevoked: false,
          canDownload: true,
          OR: [
            { recipientEmail: { equals: req.user!.email, mode: 'insensitive' } },
            { recipientEmail: null },
          ],
        },
      });

      if (!share) {
        res.status(403).json({ error: 'You do not have download permission for this file.' });
        return;
      }
    }

    // Enforce file-level downloadDisabled for non-owners
    if (!isOwner && file.downloadDisabled) {
      res.status(403).json({ error: 'Download has been disabled by the file owner.' });
      return;
    }

    try {
      const buffer = await downloadFileBuffer(file.encryptedPath);
      
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Length', buffer.length.toString());
      res.setHeader('Content-Disposition', `attachment; filename="encrypted_${file.id}"`);
      
      res.send(buffer);
    } catch (storageError: any) {
      console.error('Supabase download error:', storageError);
      res.status(500).json({ error: storageError.message || 'Failed to retrieve file from storage' });
      return;
    }
  } catch (error) {
    console.error('GET /files/:id/download error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── PATCH /api/files/:id ────────────────────────────────────────────────────
const updateFileSchema = z.object({
  filename: z.string().min(1).max(255).optional(),
  folderId: z.string().nullable().optional(),
  watermarkEnabled: z.boolean().optional(),
  downloadDisabled: z.boolean().optional(),
  // Watermark config
  watermarkFields: z.string().optional(),
  watermarkText: z.string().nullable().optional(),
  watermarkOpacity: z.number().int().optional(),
  watermarkFontSize: z.string().optional(),
  watermarkRotation: z.number().int().optional(),
  watermarkPlacement: z.string().optional(),
  watermarkColor: z.string().optional(),
  isFavorite: z.boolean().optional(),
});

router.patch('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const body = updateFileSchema.parse(req.body);

    const existing = await prisma.file.findFirst({
      where: { id: req.params.id, ownerId: req.user!.id, isDeleted: false },
    });

    if (!existing) {
      res.status(404).json({ error: 'File not found' });
      return;
    }

    const file = await prisma.file.update({
      where: { id: req.params.id },
      data: body,
    });

    if (body.filename && body.filename !== existing.filename) {
      await prisma.activity.create({
        data: {
          userId: req.user!.id,
          fileId: file.id,
          action: 'rename',
          ipAddress: req.ip,
          metadata: { from: existing.filename, to: body.filename },
        },
      });
    }

    res.json({ file: { ...file, size: file.size.toString() } });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation failed', details: error.errors });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── DELETE /api/files/:id ───────────────────────────────────────────────────
router.delete('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { permanent } = req.query;

    const file = await prisma.file.findFirst({
      where: { id: req.params.id, ownerId: req.user!.id },
    });

    if (!file) {
      res.status(404).json({ error: 'File not found' });
      return;
    }

    if (permanent === 'true') {
      // Permanently delete from Storage and DB
      await deleteEncryptedFile(file.encryptedPath);
      await prisma.file.delete({ where: { id: req.params.id } });
    } else {
      // Soft delete (move to trash)
      await prisma.file.update({
        where: { id: req.params.id },
        data: { isDeleted: true, deletedAt: new Date() },
      });
    }

    await prisma.activity.create({
      data: {
        userId: req.user!.id,
        fileId: file.id,
        action: 'delete',
        ipAddress: req.ip,
        metadata: { permanent: permanent === 'true' },
      },
    });

    res.json({ message: 'File deleted successfully' });
  } catch (error) {
    console.error('DELETE /files/:id error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GET /api/files/trash ────────────────────────────────────────────────────
router.get('/trash/list', authenticate, async (req: Request, res: Response) => {
  try {
    const files = await prisma.file.findMany({
      where: { ownerId: req.user!.id, isDeleted: true },
      orderBy: { deletedAt: 'desc' },
    });

    res.json({ files: files.map((f: { size: bigint }) => ({ ...f, size: f.size.toString() })) });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
