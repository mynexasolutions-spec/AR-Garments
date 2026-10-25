import { NextRequest, NextResponse } from 'next/server';
import { AuthUser, createSessionToken } from '@/lib/auth';
import {
  EMAIL_LOGIN_MAX_ATTEMPTS,
  EmailLoginConfigurationError,
  InvalidEmailError,
  normalizeEmail,
  verifyEmailLoginCode,
} from '@/lib/emailLogin';
import { getServiceSupabase } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CODE_PURPOSE = 'login';
const INVALID_CODE_RESPONSE = { error: 'The login code is invalid or has expired.' };

interface StoredLoginCode {
  id: string;
  code_hash: string;
  attempts: number;
  expires_at: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const email = normalizeEmail(body.email);
    const code = typeof body.code === 'string' ? body.code.trim() : '';

    if (!/^\d{6}$/.test(code)) {
      return NextResponse.json(INVALID_CODE_RESPONSE, { status: 400 });
    }

    const supabase = getServiceSupabase();
    const { data, error: codeError } = await supabase
      .from('email_login_codes')
      .select('id, code_hash, attempts, expires_at')
      .eq('email', email)
      .eq('purpose', CODE_PURPOSE)
      .is('consumed_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (codeError) {
      throw new Error(`Unable to retrieve the login code: ${codeError.message}`);
    }
    if (!data) {
      return NextResponse.json(INVALID_CODE_RESPONSE, { status: 401 });
    }

    const storedCode = data as StoredLoginCode;
    if (
      new Date(storedCode.expires_at).getTime() <= Date.now() ||
      storedCode.attempts >= EMAIL_LOGIN_MAX_ATTEMPTS
    ) {
      return NextResponse.json(INVALID_CODE_RESPONSE, { status: 401 });
    }

    const { data: claimedAttempt, error: attemptError } = await supabase
      .from('email_login_codes')
      .update({ attempts: storedCode.attempts + 1 })
      .eq('id', storedCode.id)
      .eq('attempts', storedCode.attempts)
      .is('consumed_at', null)
      .select('id')
      .maybeSingle();

    if (attemptError) {
      throw new Error(`Unable to record the login attempt: ${attemptError.message}`);
    }
    if (!claimedAttempt || !verifyEmailLoginCode(email, code, storedCode.code_hash)) {
      return NextResponse.json(INVALID_CODE_RESPONSE, { status: 401 });
    }

    // Query business_registrations directly (since users table was dropped)
    const { data: dbUser, error: userError } = await supabase
      .from('business_registrations')
      .select('id, full_name, applicant_email, mobile, status, created_at')
      .eq('applicant_email', email)
      .maybeSingle();

    if (userError) {
      throw new Error(`Unable to retrieve the user: ${userError.message}`);
    }
    if (!dbUser) {
      return NextResponse.json(INVALID_CODE_RESPONSE, { status: 401 });
    }

    const { data: consumedCode, error: consumeError } = await supabase
      .from('email_login_codes')
      .update({ consumed_at: new Date().toISOString() })
      .eq('id', storedCode.id)
      .is('consumed_at', null)
      .select('id')
      .maybeSingle();

    if (consumeError) {
      throw new Error(`Unable to consume the login code: ${consumeError.message}`);
    }
    if (!consumedCode) {
      return NextResponse.json(INVALID_CODE_RESPONSE, { status: 401 });
    }

    const user: AuthUser = {
      id: dbUser.id,
      name: dbUser.full_name,
      email: dbUser.applicant_email,
      phone: dbUser.mobile,
      userType: 'business',
      createdAt: dbUser.created_at,
    };
    const token = createSessionToken(user);
    const response = NextResponse.json({
      success: true,
      message: 'Email login successful.',
      user,
      token,
      businessStatus: dbUser.status,
    });

    response.cookies.set('ar_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error) {
    if (error instanceof InvalidEmailError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof EmailLoginConfigurationError) {
      console.error('Email login verification configuration error', { error: error.message });
      return NextResponse.json({ error: 'Email login is not configured on the server.' }, { status: 500 });
    }

    console.error('Email login verification failed', { error });
    return NextResponse.json({ error: 'Unable to verify the email login code.' }, { status: 500 });
  }
}
