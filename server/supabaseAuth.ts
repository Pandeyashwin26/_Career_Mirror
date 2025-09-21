import { createRemoteJWKSet, jwtVerify } from 'jose';
import type { RequestHandler } from 'express';

const jwks = () => createRemoteJWKSet(new URL(`${process.env.SUPABASE_URL}/auth/v1/keys`));
const audience = 'authenticated';

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  try {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) return res.status(401).json({ message: 'Unauthorized' });

    const { payload } = await jwtVerify(token, jwks(), {
      issuer: `${process.env.SUPABASE_URL}/auth/v1`,
      audience,
    });

    (req as any).user = {
      claims: {
        sub: payload.sub,
        email: (payload as any).email,
        first_name: (payload as any).user_metadata?.name,
        last_name: (payload as any).user_metadata?.family_name,
      },
    };
    return next();
  } catch (err) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
};