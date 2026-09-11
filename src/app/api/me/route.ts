import { NextResponse } from 'next/server';
import { errorResponse, requireAccount } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const acc = await requireAccount(req);
    return NextResponse.json({ email: acc.email, role: acc.role });
  } catch (e) {
    return errorResponse(e);
  }
}
