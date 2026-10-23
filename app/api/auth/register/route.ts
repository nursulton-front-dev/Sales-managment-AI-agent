import { NextRequest, NextResponse } from 'next/server';
import { createWorkspace, getWorkspaceByEmail } from '@/src/db';
import { cookies } from 'next/headers';
import { Resend } from 'resend';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      companyName,
      niche = 'education',
      ownerPhone = '+998 90 000 00 00',
      teamSize = '1',
      dailyLeadsVolume = '<20',
      plan = 'trial',
      ownerName,
      ownerEmail,
      password = 'password123',
    } = body;

    if (!companyName || !ownerEmail || !ownerName) {
      return NextResponse.json(
        { error: 'Необходимо указать название компании, имя владельца и email' },
        { status: 400 }
      );
    }

    // Check if email already registered
    const existing = await getWorkspaceByEmail(ownerEmail);
    if (existing) {
      const cookieStore = await cookies();
      cookieStore.set('ai_os_workspace_id', existing.id, {
        path: '/',
        maxAge: 86400 * 30,
        sameSite: 'lax',
      });
      return NextResponse.json({
        success: true,
        workspace: existing,
        message: 'Организация уже существует, выполнен вход',
      });
    }

    // Generate 6-digit OTP code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

    // If trial plan, tokens remain 0 until email is verified (anti-abuse protection)
    let initialTokens = 0;
    if (plan === 'start') initialTokens = 2000;
    else if (plan === 'business') initialTokens = 6000;
    else if (plan === 'pro') initialTokens = 15000;

    const newWorkspace = await createWorkspace({
      id: `ws_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      companyName,
      niche,
      ownerName,
      ownerEmail,
      ownerPhone,
      passwordHash: `hash_${Date.now()}`,
      teamSize,
      dailyLeadsVolume,
      plan,
      tokenBalance: initialTokens,
      status: 'active',
      emailVerified: false,
      verificationCode,
      verificationSentAt: new Date(),
      subExpiresAt: new Date(Date.now() + 86400000 * 30),
    });

    // Console output for easy dev testing
    console.log('\n==========================================');
    console.log('🔑 [NEW WORKSPACE REGISTRATION - OTP CODE]');
    console.log(`🏢 Компания: ${companyName}`);
    console.log(`✉️  Email: ${ownerEmail}`);
    console.log(`⚡ 6-значный код подтверждения: ${verificationCode}`);
    console.log('==========================================\n');

    // Send email via Resend if API key available
    if (process.env.RESEND_API_KEY && !process.env.RESEND_API_KEY.includes('your_api_key')) {
      try {
        const resend = new Resend(process.env.RESEND_API_KEY);
        await resend.emails.send({
          from: 'AI Business OS <onboarding@resend.dev>',
          to: ownerEmail,
          subject: `${verificationCode} — ваш код подтверждения в AI Business OS`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; border: 1px solid #E2E8F0; border-radius: 16px; background: #FFFFFF;">
              <h2 style="font-size: 20px; font-weight: 700; color: #0F172A; margin: 0 0 8px 0;">Подтверждение Email адреса</h2>
              <p style="font-size: 14px; color: #475569; line-height: 1.5; margin: 0 0 20px 0;">
                Добро пожаловать в AI Business OS! Введите этот 6-значный код для активации вашей организации и начисления <strong>100 бонусных токенов</strong>:
              </p>
              <div style="background: #F8FAFC; border: 2px dashed #2563EB; border-radius: 12px; padding: 18px; text-align: center; margin-bottom: 20px;">
                <span style="font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #2563EB; font-family: monospace;">${verificationCode}</span>
              </div>
              <p style="font-size: 12px; color: #94A3B8; margin: 0;">
                Код действителен 15 минут.
              </p>
            </div>
          `,
        });
      } catch (err: any) {
        console.warn('Resend send warning:', err?.message || err);
      }
    }

    const cookieStore = await cookies();
    cookieStore.set('ai_os_workspace_id', newWorkspace.id, {
      path: '/',
      maxAge: 86400 * 30,
      sameSite: 'lax',
    });

    return NextResponse.json({
      success: true,
      workspace: newWorkspace,
      verificationCode, // For dev helper badge
    });
  } catch (error: any) {
    console.error('Error registering workspace:', error);
    return NextResponse.json(
      { error: error.message || 'Ошибка регистрации' },
      { status: 500 }
    );
  }
}
