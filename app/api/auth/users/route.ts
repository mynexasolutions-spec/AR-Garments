import { NextResponse } from 'next/server';
import { memoryUsers } from '@/lib/auth';
import { getServiceSupabase } from '@/lib/supabase';
import { memoryOrders } from '@/lib/orders';

interface UserOutput {
  id: string;
  name: string;
  email: string;
  phone: string;
  createdAt: string;
  orderCount: number;
}

export const dynamic = 'force-dynamic';

// GET /api/auth/users — list all registered accounts (from business_registrations)
export async function GET() {
  try {
    // 1. Try querying business_registrations first
    try {
      const supabase = getServiceSupabase();
      const { data: dbBiz, error: bizError } = await supabase
        .from('business_registrations')
        .select('id, full_name, applicant_email, mobile, created_at')
        .order('created_at', { ascending: false });

      if (!bizError && Array.isArray(dbBiz) && dbBiz.length > 0) {
        const formatted: UserOutput[] = dbBiz.map((b) => ({
          id: String(b.id),
          name: String(b.full_name),
          email: String(b.applicant_email),
          phone: b.mobile ? String(b.mobile) : '',
          createdAt: b.created_at ? new Date(String(b.created_at)).toISOString() : new Date().toISOString(),
          orderCount: 0,
        }));

        return NextResponse.json(formatted);
      }
    } catch {
      // Fall through to memory
    }

    // 2. Fallback to memoryUsers
    const memoryOrderCounts: Record<string, number> = {};
    memoryOrders.forEach((o) => {
      if (o.userId) {
        memoryOrderCounts[o.userId] = (memoryOrderCounts[o.userId] || 0) + 1;
      }
    });

    const safeUsers: UserOutput[] = memoryUsers.map(({ id, name, email, phone, createdAt }) => ({
      id,
      name,
      email,
      phone: phone || '',
      createdAt: createdAt || new Date().toISOString(),
      orderCount: memoryOrderCounts[id] || 0,
    }));

    safeUsers.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json(safeUsers);
  } catch (err) {
    console.error('[GET /api/auth/users] Error:', err);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}
