import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/firebaseAuth';
import { z } from 'zod';

const router = Router();

// ─── GET /api/auth/me ────────────────────────────────────────────────────────
router.get('/me', authenticate, async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        firebaseUID: true,
        name: true,
        email: true,
        photo: true,
        publicKey: true,
        createdAt: true,
        _count: {
          select: {
            files: { where: { isDeleted: false } },
            sharesOwned: { where: { isRevoked: false } },
          },
        },
      },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({ user });
  } catch (error) {
    console.error('GET /auth/me error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST /api/auth/register ─────────────────────────────────────────────────
// Called after Firebase account creation to store public key and profile
const registerSchema = z.object({
  name: z.string().min(1).max(100),
  publicKey: z.string().optional(), // RSA public key in JWK format
});

router.post('/register', authenticate, async (req: Request, res: Response) => {
  try {
    const body = registerSchema.parse(req.body);

    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: {
        name: body.name,
        publicKey: body.publicKey || null,
      },
    });

    res.json({ user });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation failed', details: error.errors });
      return;
    }
    console.error('POST /auth/register error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST /api/auth/public-key ───────────────────────────────────────────────
// Update or set user's RSA public key (called after key pair generation)
router.post('/public-key', authenticate, async (req: Request, res: Response) => {
  try {
    const { publicKey } = z.object({ publicKey: z.string().min(1) }).parse(req.body);

    await prisma.user.update({
      where: { id: req.user!.id },
      data: { publicKey },
    });

    res.json({ message: 'Public key updated successfully' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation failed', details: error.errors });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GET /api/auth/user/:email ───────────────────────────────────────────────
// Get another user's public key for key wrapping during sharing
router.get('/user/:email', authenticate, async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { email: req.params.email },
      select: { id: true, name: true, email: true, photo: true, publicKey: true },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({ user });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
