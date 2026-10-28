import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const pincode = searchParams.get('pincode')?.trim().replace(/\D/g, '');

  if (!pincode || pincode.length !== 6) {
    return NextResponse.json({ error: 'Valid 6-digit pincode is required' }, { status: 400 });
  }

  try {
    const res = await fetch(`https://api.postalpincode.in/pincode/${pincode}`, {
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 86400 } // Cache for 24 hours
    });

    if (!res.ok) {
      throw new Error(`Postal API responded with status ${res.status}`);
    }

    const data = await res.json();
    if (Array.isArray(data) && data[0]?.Status === 'Success' && Array.isArray(data[0]?.PostOffice)) {
      const po = data[0].PostOffice[0];
      const district = po.District || po.Division || '';
      const state = po.State || '';
      const name = po.Name || '';

      return NextResponse.json({
        success: true,
        pincode,
        city: district || name,
        district,
        state,
        area: name,
      });
    }

    return NextResponse.json({
      success: false,
      pincode,
      message: 'Pincode not found'
    }, { status: 404 });
  } catch (error: unknown) {
    console.error('Error fetching pincode info:', error);
    return NextResponse.json({
      success: false,
      error: 'Unable to lookup pincode'
    }, { status: 500 });
  }
}
