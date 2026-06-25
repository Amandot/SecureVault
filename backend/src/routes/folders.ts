import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/firebaseAuth';
import { z } from 'zod';

const router = Router();

const folderSchema = z.object({
  name: z.string().min(1).max(100),
  parentId: z.string().optional(),
});

// ─── GET /api/folders ────────────────────────────────────────────────────────
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const { parentId } = req.query;

    const folders = await prisma.folder.findMany({
      where: {
        ownerId: req.user!.id,
        parentId: parentId ? String(parentId) : null,
      },
      include: {
        _count: { select: { children: true, files: true } },
      },
      orderBy: { name: 'asc' },
    });

    res.json({ folders });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST /api/folders ───────────────────────────────────────────────────────
router.post('/', authenticate, async (req: Request, res: Response) => {
  try {
    const body = folderSchema.parse(req.body);

    const folder = await prisma.folder.create({
      data: {
        name: body.name,
        ownerId: req.user!.id,
        parentId: body.parentId || null,
      },
    });

    res.status(201).json({ folder });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation failed', details: error.errors });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── PATCH /api/folders/:id ──────────────────────────────────────────────────
router.patch('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { name } = z.object({ name: z.string().min(1).max(100) }).parse(req.body);

    const existing = await prisma.folder.findFirst({
      where: { id: req.params.id, ownerId: req.user!.id },
    });

    if (!existing) {
      res.status(404).json({ error: 'Folder not found' });
      return;
    }

    const folder = await prisma.folder.update({
      where: { id: req.params.id },
      data: { name },
    });

    res.json({ folder });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── DELETE /api/folders/:id ─────────────────────────────────────────────────
router.delete('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const folder = await prisma.folder.findFirst({
      where: { id: req.params.id, ownerId: req.user!.id },
    });

    if (!folder) {
      res.status(404).json({ error: 'Folder not found' });
      return;
    }

    // Soft delete all files in folder
    await prisma.file.updateMany({
      where: { folderId: req.params.id, ownerId: req.user!.id },
      data: { isDeleted: true, deletedAt: new Date() },
    });

    await prisma.folder.delete({ where: { id: req.params.id } });

    res.json({ message: 'Folder deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
