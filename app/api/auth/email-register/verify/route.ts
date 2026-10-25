import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { AuthUser, createSessionToken, hashPassword, memoryUsers } from '@/lib/auth';
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

const CODE_PURPOSE = 'registration';
const INVALID_CODE_RESPONSE = { error: 'The registration code is invalid or has expired.' };

interface StoredRegistrationCode {
  id: string;
  code_hash: string;
  attempts: number;
  expires_at: string;
}

function readName(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const name = value.trim();
  return name.length >= 2 && name.length <= 100 ? name : null;
}

function readPhone(value: unknown): string | null {
  if (value === undefined || value === null || value === '') return '';
  if (typeof value !== 'string') return null;
  const phone = value.trim();
  return phone.length <= 30 ? phone : null;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const name = readName(body.name);
    const phone = readPhone(body.phone);
    const email = normalizeEmail(body.email);
    const code = typeof body.code === 'string' ? body.code.trim() : '';

    if (!name) {
      return NextResponse.json({ error: 'Please enter a valid full name.' }, { status: 400 });
    }
    if (phone === null) {
      return NextResponse.json({ error: 'Please enter a valid phone number.' }, { status: 400 });
    }
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
      throw new Error(`Unable to retrieve the registration code: ${codeError.message}`);
    }
    if (!data) {
      return NextResponse.json(INVALID_CODE_RESPONSE, { status: 401 });
    }

    const storedCode = data as StoredRegistrationCode;
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
      throw new Error(`Unable to record the registration attempt: ${attemptError.message}`);
    }
    if (!claimedAttempt || !verifyEmailLoginCode(email, code, storedCode.code_hash)) {
      return NextResponse.json(INVALID_CODE_RESPONSE, { status: 401 });
    }

    const { data: existingUser, error: existingUserError } = await supabase
      .from('business_registrations')
      .select('id')
      .eq('applicant_email', email)
      .maybeSingle();

    if (existingUserError) {
      throw new Error(`Unable to check the registration email: ${existingUserError.message}`);
    }
    if (
      existingUser ||
      memoryUsers.some((user) => user.email.toLowerCase() === email)
    ) {
      return NextResponse.json(
        {
          code: 'ACCOUNT_EXISTS',
          error: 'An account with this email already exists. Please log in.',
        },
        { status: 409 }
      );
    }

    const inaccessiblePassword = hashPassword(crypto.randomBytes(32).toString('base64url'));
    const { data: insertedUser, error: insertError } = await supabase
      .from('business_registrations')
      .insert({
        full_name: name,
        mobile: phone,
        applicant_email: email,
        password: inaccessiblePassword,
        shop_address: 'Registered via Email Code',
        city: 'N/A',
        state: 'N/A',
        pincode: '000000',
        business_type: 'retail_store',
        status: 'pending',
      })
      .select('id, full_name, applicant_email, mobile, created_at')
      .single();

    if (insertError || !insertedUser) {
      if (insertError?.code === '23505') {
        return NextResponse.json(
          {
            code: 'ACCOUNT_EXISTS',
            error: 'An account with this email already exists. Please log in.',
          },
          { status: 409 }
        );
      }
      throw new Error(
        `Unable to create the email-verified account: ${insertError?.message || 'No row returned'}`
      );
    }

    const { error: consumeError } = await supabase
      .from('email_login_codes')
      .update({ consumed_at: new Date().toISOString() })
      .eq('email', email)
      .eq('purpose', CODE_PURPOSE)
      .is('consumed_at', null);

    if (consumeError) {
      console.error('Unable to consume registration codes after account creation', {
        userId: insertedUser.id,
        databaseError: consumeError.message,
      });
    }

    const user: AuthUser = {
      id: insertedUser.id,
      name: insertedUser.full_name,
      email: insertedUser.applicant_email,
      phone: insertedUser.mobile,
      userType: 'business',
      createdAt: insertedUser.created_at,
    };
    const token = createSessionToken(user);
    const response = NextResponse.json(
      {
        success: true,
        message: 'Email verified and account created successfully.',
        user,
        token,
      },
      { status: 201 }
    );

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
      console.error('Email registration verification configuration error', {
        error: error.message,
      });
      return NextResponse.json(
        { error: 'Email registration is not configured on the server.' },
        { status: 500 }
      );
    }

    console.error('Email registration verification failed', { error });
    return NextResponse.json(
      { error: 'Unable to verify the email registration code.' },
      { status: 500 }
    );
  }
}
