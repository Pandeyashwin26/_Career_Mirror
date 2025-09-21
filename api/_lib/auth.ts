import { createRemoteJWKSet, jwtVerify } from 'jose';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const jwks = () => createRemoteJWKSet(new URL(`${process.env.SUPABASE_URL}/auth/v1/keys`));
const audience = 'authenticated';

export interface AuthenticatedRequest extends VercelRequest {
  user: {
    claims: {
      sub: string;
      email: string;
      first_name?: string;
      last_name?: string;
    };
  };
}

export async function withAuth(
  req: VercelRequest,
  res: VercelResponse,
  handler: (req: AuthenticatedRequest, res: VercelResponse) => Promise<void> | void
) {
  try {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    
    if (!token) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { payload } = await jwtVerify(token, jwks(), {
      issuer: `${process.env.SUPABASE_URL}/auth/v1`,
      audience,
    });

    const authenticatedReq = req as AuthenticatedRequest;
    authenticatedReq.user = {
      claims: {
        sub: payload.sub!,
        email: (payload as any).email,
        first_name: (payload as any).user_metadata?.name,
        last_name: (payload as any).user_metadata?.family_name,
      },
    };

    return handler(authenticatedReq, res);
  } catch (err) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
}