import { NextRequest, NextResponse, connection } from 'next/server';
import { getAllAdminAuditLogs } from '@/src/db';

export async function GET(req: NextRequest) {
  await connection();
  try {
    const logs = await getAllAdminAuditLogs();
    return NextResponse.json({ success: true, logs });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
