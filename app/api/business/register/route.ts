import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { hashPassword, memoryUsers } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ---------------------------------------------------------------------------
// POST /api/business/register
// Accepts multipart/form-data with all business registration fields + doc file
// Stores directly into business_registrations (users table is dropped/not used)
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    // ── Extract fields ──────────────────────────────────────────────────────
    const fullName     = (formData.get('full_name') as string)?.trim();
    const mobile       = (formData.get('mobile') as string)?.trim();
    const email        = (formData.get('email') as string)?.trim().toLowerCase();
    const password     = (formData.get('password') as string)?.trim();
    const shopAddress  = (formData.get('shop_address') as string)?.trim();
    const landmark     = (formData.get('landmark') as string)?.trim() || '';
    const city         = (formData.get('city') as string)?.trim();
    const state        = (formData.get('state') as string)?.trim();
    const pincode      = (formData.get('pincode') as string)?.trim();
    const businessType = (formData.get('business_type') as string)?.trim();
    const hasGstin     = formData.get('has_gstin') === 'true';
    const gstin        = (formData.get('gstin') as string)?.trim() || '';
    const docFile      = formData.get('document') as File | null;

    // ── Validation ───────────────────────────────────────────────────────────
    if (!fullName || fullName.length < 2) {
      return NextResponse.json({ error: 'Please enter a valid full name.' }, { status: 400 });
    }
    if (!mobile || !/^\d{10}$/.test(mobile)) {
      return NextResponse.json({ error: 'Please enter a valid 10-digit mobile number.' }, { status: 400 });
    }
    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
    }
    if (!password || password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters long.' }, { status: 400 });
    }
    if (!shopAddress) {
      return NextResponse.json({ error: 'Please enter your shop address.' }, { status: 400 });
    }
    if (!city) {
      return NextResponse.json({ error: 'Please enter your city.' }, { status: 400 });
    }
    if (!state) {
      return NextResponse.json({ error: 'Please select your state.' }, { status: 400 });
    }
    if (!pincode || !/^\d{6}$/.test(pincode)) {
      return NextResponse.json({ error: 'Please enter a valid 6-digit PIN code.' }, { status: 400 });
    }
    if (!['retail_store', 'hawker'].includes(businessType)) {
      return NextResponse.json({ error: 'Please select a valid business type.' }, { status: 400 });
    }
    if (hasGstin && gstin && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(gstin)) {
      return NextResponse.json({ error: 'Please enter a valid 15-digit GSTIN number.' }, { status: 400 });
    }
    if (!docFile) {
      return NextResponse.json({ error: 'Please upload a verification document photo.' }, { status: 400 });
    }

    const supabase = getServiceSupabase();

    // ── Check for duplicate in business_registrations ────────────────────────
    try {
      const { data: existingBiz } = await supabase
        .from('business_registrations')
        .select('id, status')
        .eq('applicant_email', email)
        .maybeSingle();

      if (existingBiz) {
        const statusMsg =
          existingBiz.status === 'pending'
            ? 'A registration with this email is already under review. Please wait for admin approval.'
            : existingBiz.status === 'approved'
            ? 'This email is already registered and approved. Please log in.'
            : 'A previous registration with this email was rejected. Please contact support.';
        return NextResponse.json({ error: statusMsg, code: 'ALREADY_REGISTERED' }, { status: 409 });
      }
    } catch {
      // Ignore if table not yet created
    }

    // ── Upload document to ImageKit ──────────────────────────────────────────
    let documentUrl = '';
    const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;

    if (privateKey) {
      try {
        const buffer   = Buffer.from(await docFile.arrayBuffer());
        const base64   = buffer.toString('base64');
        const fileName = `business_doc_${email.replace(/[^a-z0-9]/g, '_')}_${Date.now()}.jpg`;

        const ikForm = new FormData();
        ikForm.append('file', base64);
        ikForm.append('fileName', fileName);
        ikForm.append('folder', '/business-docs');
        ikForm.append('useUniqueFileName', 'true');
        ikForm.append('tags', 'business-registration,verification');

        const ikRes = await fetch('https://upload.imagekit.io/api/v1/files/upload', {
          method: 'POST',
          headers: { Authorization: 'Basic ' + Buffer.from(privateKey + ':').toString('base64') },
          body: ikForm,
        });
        const ikData = await ikRes.json();
        if (ikRes.ok && ikData.url) {
          documentUrl = ikData.url;
        }
      } catch (uploadErr) {
        console.error('ImageKit upload failed for business doc:', uploadErr);
      }
    }

    // ── Hash password ────────────────────────────────────────────────────────
    const hashedPassword = hashPassword(password);

    // ── Insert directly into business_registrations table ───────────────────
    let registrationId: string = `biz-${Date.now()}`;
    try {
      const { data: inserted, error: insertError } = await supabase
        .from('business_registrations')
        .insert({
          full_name: fullName,
          mobile,
          applicant_email: email,
          password: hashedPassword,
          shop_address: shopAddress,
          landmark,
          city,
          state,
          pincode,
          business_type: businessType,
          has_gstin: hasGstin,
          gstin: hasGstin ? gstin : '',
          document_url: documentUrl,
          status: 'pending',
        })
        .select('id')
        .single();

      if (insertError) {
        console.error('business_registrations insert error:', insertError);
      } else if (inserted?.id) {
        registrationId = inserted.id;
      }
    } catch (bizErr) {
      console.warn('business_registrations DB error:', bizErr);
    }

    // Also store in memory fallback so instant login works even without database network latency
    const memUser = {
      id: registrationId,
      name: fullName,
      email,
      phone: mobile,
      passwordHash: hashedPassword,
      userType: 'business' as const,
      createdAt: new Date().toISOString(),
    };
    const existingMemIndex = memoryUsers.findIndex((u) => u.email.toLowerCase() === email);
    if (existingMemIndex >= 0) {
      memoryUsers[existingMemIndex] = memUser;
    } else {
      memoryUsers.push(memUser);
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Registration submitted successfully! Your application is under review.',
        id: registrationId,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error('[POST /api/business/register] Error:', err);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}
