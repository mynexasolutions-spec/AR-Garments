import { NextRequest, NextResponse } from 'next/server';
import { BrevoApiError, BrevoConfigurationError, sendLoginCode } from '@/lib/brevo';
import {
  EMAIL_LOGIN_CODE_TTL_MINUTES,
  EMAIL_LOGIN_RESEND_SECONDS,
  EmailLoginConfigurationError,
  generateEmailLoginCode,
  hashEmailLoginCode,
  InvalidEmailError,
  normalizeEmail,
} from '@/lib/emailLogin';
import { getServiceSupabase } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CODE_PURPOSE = 'login';

const ACCOUNT_NOT_FOUND_RESPONSE = {
  success: false,
  code: 'ACCOUNT_NOT_FOUND',
  error: 'No account exists with this email. Please register first.',
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const email = normalizeEmail(body.email);
    const supabase = getServiceSupabase();

    // Query business_registrations table (since users table was dropped)
    const { data: user, error: userError } = await supabase
      .from('business_registrations')
      .select('id, full_name, applicant_email')
      .eq('applicant_email', email)
      .maybeSingle();

    if (userError) {
      throw new Error(`Unable to look up the user: ${userError.message}`);
    }
    if (!user) {
      return NextResponse.json(ACCOUNT_NOT_FOUND_RESPONSE, { status: 404 });
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
      throw new Error(`Unable to check the email-code cooldown: ${recentCodeError.message}`);
    }
    if (recentCode) {
      return NextResponse.json({
        success: true,
        message: 'A login code was already sent to your email.',
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
      throw new Error(`Unable to invalidate previous login codes: ${invalidateError.message}`);
    }

    const code = generateEmailLoginCode();
    const codeHash = hashEmailLoginCode(email, code);
    const expiresAt = new Date(Date.now() + EMAIL_LOGIN_CODE_TTL_MINUTES * 60 * 1000).toISOString();
    const { data: loginCode, error: insertError } = await supabase
      .from('email_login_codes')
      .insert({
        email,
        purpose: CODE_PURPOSE,
        code_hash: codeHash,
        expires_at: expiresAt,
      })
      .select('id')
      .single();

    if (insertError || !loginCode) {
      throw new Error(`Unable to save the email login code: ${insertError?.message || 'No row returned'}`);
    }

    try {
      const messageId = await sendLoginCode({
        recipientEmail: email,
        recipientName: String(user.full_name || 'Business Partner'),
        code,
        expiresInMinutes: EMAIL_LOGIN_CODE_TTL_MINUTES,
      });
      console.info('Brevo login code accepted', {
        userId: user.id,
        loginCodeId: loginCode.id,
        messageId,
      });
    } catch (error) {
      const { error: cleanupError } = await supabase
        .from('email_login_codes')
        .delete()
        .eq('id', loginCode.id);
      if (cleanupError) {
        console.error('Unable to remove unsent login code', {
          loginCodeId: loginCode.id,
          databaseError: cleanupError.message,
        });
      }
      throw error;
    }

    return NextResponse.json({
      success: true,
      message: 'A login code has been sent to your email.',
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
      console.error('Email login configuration error', { error: error.message });
      return NextResponse.json(
        { error: 'Email login is not configured on the server.' },
        { status: 500 }
      );
    }
    if (error instanceof BrevoApiError) {
      console.error('Brevo login email failed', {
        status: error.status,
        error: error.message,
      });
      return NextResponse.json(
        { error: 'The login email could not be sent. Please try again.' },
        { status: 502 }
      );
    }

    console.error('Email login request failed', { error });
    return NextResponse.json({ error: 'Unable to request an email login code.' }, { status: 500 });
  }
}
