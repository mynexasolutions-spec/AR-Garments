import { NextRequest, NextResponse } from 'next/server';
import {
  BrevoApiError,
  BrevoConfigurationError,
  sendRegistrationCode,
} from '@/lib/brevo';
import {
  EMAIL_LOGIN_CODE_TTL_MINUTES,
  EMAIL_LOGIN_RESEND_SECONDS,
  EmailLoginConfigurationError,
  generateEmailLoginCode,
  hashEmailLoginCode,
  InvalidEmailError,
  normalizeEmail,
} from '@/lib/emailLogin';
import { memoryUsers } from '@/lib/auth';
import { getServiceSupabase } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CODE_PURPOSE = 'registration';

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
    if (!name) {
      return NextResponse.json({ error: 'Please enter a valid full name.' }, { status: 400 });
    }
    if (phone === null) {
      return NextResponse.json({ error: 'Please enter a valid phone number.' }, { status: 400 });
    }

    const email = normalizeEmail(body.email);
    const supabase = getServiceSupabase();
    const { data: existingUser, error: userError } = await supabase
      .from('business_registrations')
      .select('id')
      .eq('applicant_email', email)
      .maybeSingle();

    if (userError) {
      throw new Error(`Unable to check the registration email: ${userError.message}`);
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

    const cooldownStart = new Date(Date.now() - EMAIL_LOGIN_RESEND_SECONDS * 1000).toISOString();
    const { data: recentCode, error: recentCodeError } = await supabase
      .from('email_login_codes')
      .select('created_at')
      .eq('email', email)
      .eq('purpose', CODE_PURPOSE)
      .gte('created_at', cooldownStart)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (recentCodeError) {
      throw new Error(`Unable to check the registration-code cooldown: ${recentCodeError.message}`);
    }
    if (recentCode) {
      return NextResponse.json({
        success: true,
        message: 'A registration code was already sent to your email.',
        retryAfterSeconds: EMAIL_LOGIN_RESEND_SECONDS,
      });
    }

    const { error: invalidateError } = await supabase
      .from('email_login_codes')
      .update({ consumed_at: new Date().toISOString() })
      .eq('email', email)
      .eq('purpose', CODE_PURPOSE)
      .is('consumed_at', null);

    if (invalidateError) {
      throw new Error(`Unable to invalidate previous registration codes: ${invalidateError.message}`);
    }

    const code = generateEmailLoginCode();
    const codeHash = hashEmailLoginCode(email, code);
    const expiresAt = new Date(
      Date.now() + EMAIL_LOGIN_CODE_TTL_MINUTES * 60 * 1000
    ).toISOString();
    const { data: registrationCode, error: insertError } = await supabase
      .from('email_login_codes')
      .insert({
        email,
        purpose: CODE_PURPOSE,
        code_hash: codeHash,
        expires_at: expiresAt,
      })
      .select('id')
      .single();

    if (insertError || !registrationCode) {
      throw new Error(
        `Unable to save the registration code: ${insertError?.message || 'No row returned'}`
      );
    }

    try {
      const messageId = await sendRegistrationCode({
        recipientEmail: email,
        recipientName: name,
        code,
        expiresInMinutes: EMAIL_LOGIN_CODE_TTL_MINUTES,
      });
      console.info('Brevo registration code accepted', {
        registrationCodeId: registrationCode.id,
        messageId,
      });
    } catch (error) {
      const { error: cleanupError } = await supabase
        .from('email_login_codes')
        .delete()
        .eq('id', registrationCode.id);
      if (cleanupError) {
        console.error('Unable to remove unsent registration code', {
          registrationCodeId: registrationCode.id,
          databaseError: cleanupError.message,
        });
      }
      throw error;
    }

    return NextResponse.json({
      success: true,
      message: 'A registration code has been sent to your email.',
      retryAfterSeconds: EMAIL_LOGIN_RESEND_SECONDS,
    });
  } catch (error) {
    if (error instanceof InvalidEmailError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (
      error instanceof BrevoConfigurationError ||
      error instanceof EmailLoginConfigurationError
    ) {
      console.error('Email registration configuration error', { error: error.message });
      return NextResponse.json(
        { error: 'Email registration is not configured on the server.' },
        { status: 500 }
      );
    }
    if (error instanceof BrevoApiError) {
      console.error('Brevo registration email failed', {
        status: error.status,
        error: error.message,
      });
      return NextResponse.json(
        { error: 'The registration email could not be sent. Please try again.' },
        { status: 502 }
      );
    }

    console.error('Email registration request failed', { error });
    return NextResponse.json(
      { error: 'Unable to request an email registration code.' },
      { status: 500 }
    );
  }
}
