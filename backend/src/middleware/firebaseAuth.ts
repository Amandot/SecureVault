import { Request, Response, NextFunction } from 'express';
import { firebaseAuth } from '../lib/firebase';
import { prisma } from '../lib/prisma';

// Extend Express Request type to include our user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        firebaseUID: string;
        email: string;
        name: string;
        photo?: string | null;
        publicKey?: string | null;
      };
    }
  }
}

/**
 * Middleware: Verify Firebase JWT token and attach user to request.
 * Also auto-creates user record on first login.
 */
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'No authorization token provided' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    // Verify token with Firebase Admin
    const decoded = await firebaseAuth.verifyIdToken(token);

    // Find or create user in our database
    let user = await prisma.user.findUnique({
      where: { firebaseUID: decoded.uid },
    });

    if (!user) {
      // First login — create user record
      user = await prisma.user.create({
        data: {
          firebaseUID: decoded.uid,
          email: decoded.email || '',
          name: decoded.name || decoded.email?.split('@')[0] || 'User',
          photo: decoded.picture || null,
        },
      });
    }

    // Attach user to request
    req.user = {
      id: user.id,
      firebaseUID: user.firebaseUID,
      email: user.email,
      name: user.name,
      photo: user.photo,
      publicKey: user.publicKey,
    };

    next();
  } catch (error: unknown) {
    console.error('Auth middleware error:', error);
    const message =
      error instanceof Error ? error.message : 'Invalid or expired token';
    res.status(401).json({ error: message });
  }
};
