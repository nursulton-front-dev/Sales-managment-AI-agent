import { NextResponse, connection } from 'next/server';
import { getAllTokenLogs } from '@/src/db';

export async function GET() {
  await connection();
  try {
    const logs = await getAllTokenLogs();
    return NextResponse.json({ success: true, logs });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
