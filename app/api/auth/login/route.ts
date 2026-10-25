import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { verifyPassword, createSessionToken, memoryUsers, AuthUser } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Please provide both email and password.' },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const supabase = getServiceSupabase();

    let foundUser: AuthUser | null = null;
    let storedPasswordHash: string | null = null;
    let businessStatus: 'pending' | 'approved' | 'rejected' | null = null;

    // 1. Primary check: Query business_registrations directly
    try {
      const { data: bizUser, error: bizError } = await supabase
        .from('business_registrations')
        .select('id, full_name, applicant_email, password, mobile, status, business_type, created_at')
        .eq('applicant_email', cleanEmail)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!bizError && bizUser && bizUser.password) {
        foundUser = {
          id: bizUser.id,
          name: bizUser.full_name,
          email: bizUser.applicant_email,
          phone: bizUser.mobile,
          userType: 'business',
          createdAt: bizUser.created_at,
        };
        storedPasswordHash = bizUser.password;
        businessStatus = bizUser.status as 'pending' | 'approved' | 'rejected';
      }
    } catch (e) {
      console.warn('Error reading business_registrations during login:', e);
    }

    // 2. Memory fallback if not found in database yet
    if (!foundUser) {
      const memUser = memoryUsers.find((u) => u.email.toLowerCase() === cleanEmail);
      if (memUser) {
        foundUser = {
          id: memUser.id,
          name: memUser.name,
          email: memUser.email,
          phone: memUser.phone,
          userType: memUser.userType || 'business',
          createdAt: memUser.createdAt,
        };
        storedPasswordHash = memUser.passwordHash;
      }
    }

    // If account not found
    if (!foundUser || !storedPasswordHash) {
      return NextResponse.json(
        {
          code: 'ACCOUNT_NOT_FOUND',
          error: 'No account exists with this email. Please register first.',
        },
        { status: 404 }
      );
    }

    // 3. Verify password
    const isPasswordValid = verifyPassword(password, storedPasswordHash);
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Invalid email or password. Please try again.' },
        { status: 401 }
      );
    }

    // 4. Generate session token
    const token = createSessionToken(foundUser);

    const response = NextResponse.json({
      success: true,
      message: 'Login successful!',
      user: foundUser,
      token,
      businessStatus,
    });

    // Set cookie
    response.cookies.set('ar_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Something went wrong during login. Please try again.' },
      { status: 500 }
    );
  }
}
