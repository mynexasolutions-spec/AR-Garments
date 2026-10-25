import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken } from '@/lib/auth';
import { getServiceSupabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    // 1. Check cookie first
    let token = req.cookies.get('ar_session')?.value;

    // 2. Check Authorization header
    if (!token) {
      const authHeader = req.headers.get('Authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }

    if (!token) {
      return NextResponse.json({ authenticated: false, user: null }, { status: 200 });
    }

    const user = verifySessionToken(token);
    if (!user) {
      return NextResponse.json({ authenticated: false, user: null }, { status: 200 });
    }

    // 3. If business user, fetch live business status from DB
    let businessStatus: 'pending' | 'approved' | 'rejected' | null = null;
    if (user.userType === 'business') {
      try {
        const supabase = getServiceSupabase();
        const { data: bizReg } = await supabase
          .from('business_registrations')
          .select('status')
          .eq('applicant_email', user.email.toLowerCase())
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (bizReg) {
          businessStatus = bizReg.status as 'pending' | 'approved' | 'rejected';
        }
      } catch {
        // Non-fatal
      }
    }

    return NextResponse.json({
      authenticated: true,
      user,
      businessStatus,
    });
  } catch (error) {
    console.error('Auth verification error:', error);
    return NextResponse.json({ authenticated: false, user: null }, { status: 200 });
  }
}
