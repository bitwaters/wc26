import { NextResponse } from 'next/server';

/**
 * When LOCAL_API_SECRET is set, mutating API routes require:
 *   Authorization: Bearer <LOCAL_API_SECRET>
 * When unset (default local dev), requests are allowed.
 */
export function requireApiAuth(request: Request): NextResponse | null {
  const secret = process.env.LOCAL_API_SECRET;
  if (!secret) {
    return null;
  }

  const authHeader = request.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token || token !== secret) {
    return NextResponse.json(
      { error: 'Unauthorized. Set Authorization: Bearer <LOCAL_API_SECRET>.' },
      { status: 401 }
    );
  }

  return null;
}
