import { NextRequest, NextResponse, connection } from 'next/server';
import { createWorkspace, getWorkspaceByEmail, updateWorkspace } from '@/src/db';
import { cookies } from 'next/headers';
import { Resend } from 'resend';

export async function POST(req: NextRequest) {
  await connection();
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
      timezone = 'Asia/Tashkent',
      isSoleProprietor = false,
      logoUrl = null,
      selectedAgentNiche = null,
    } = body;

    if (!ownerEmail || !ownerName) {
      return NextResponse.json(
        { error: 'Необходимо указать имя и email владельца' },
        { status: 400 }
      );
    }

    const cleanEmail = ownerEmail.trim().toLowerCase();

    // Check if email already registered
    const existing = await getWorkspaceByEmail(cleanEmail);
    if (existing) {
      // Idempotent: update company parameters if provided, and set session
      const updates: any = {};
      if (companyName && companyName !== existing.companyName) updates.companyName = companyName;
      if (ownerPhone && ownerPhone !== existing.ownerPhone) updates.ownerPhone = ownerPhone;
      if (niche && niche !== existing.niche) updates.niche = niche;

      let ws = existing;
      if (Object.keys(updates).length > 0) {
        ws = (await updateWorkspace(existing.id, updates)) || existing;
      }

      const cookieStore = await cookies();
      cookieStore.set('ai_os_workspace_id', ws.id, {
        path: '/',
        maxAge: 86400 * 30,
        sameSite: 'lax',
      });

      return NextResponse.json({
        success: true,
        workspace: ws,
        verificationCode: ws.verificationCode || '123456',
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

    const finalCompanyName = companyName?.trim() || (isSoleProprietor ? `Частный специалист (${ownerName})` : 'Моя компания');

    const newWorkspace = await createWorkspace({
      id: `ws_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      companyName: finalCompanyName,
      niche,
      ownerName,
      ownerEmail: cleanEmail,
      ownerPhone,
      passwordHash: `hash_${Date.now()}`,
      teamSize: isSoleProprietor ? '1' : teamSize,
      dailyLeadsVolume,
      plan,
      tokenBalance: initialTokens,
      status: 'active',
      emailVerified: false,
      verificationCode,
      verificationSentAt: new Date(),
      subExpiresAt: new Date(Date.now() + 86400000 * 30),
      googleCalendarWorkingHours: '10:00-18:00',
      googleCalendarSlotDuration: 45,
    });

    console.log('\n==========================================');
    console.log('🔑 [NEW WORKSPACE REGISTRATION - OTP CODE]');
    console.log(`🏢 Компания: ${finalCompanyName}`);
    console.log(`✉️  Email: ${cleanEmail}`);
    console.log(`⚡ 6-значный код подтверждения: ${verificationCode}`);
    console.log('==========================================\n');

    // Send email via Resend if API key available
    if (process.env.RESEND_API_KEY && !process.env.RESEND_API_KEY.includes('your_api_key')) {
      try {
        const resend = new Resend(process.env.RESEND_API_KEY);
        await resend.emails.send({
          from: 'Chorla AI <onboarding@resend.dev>',
          to: cleanEmail,
          subject: `${verificationCode} — ваш код подтверждения в Chorla AI`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; border: 1px solid #E2E8F0; border-radius: 16px; background: #FFFFFF;">
              <div style="text-align: center; margin-bottom: 20px;">
                <img src="https://chorla-ai.vercel.app/brand/chorla-ai-logo-light.png" alt="Chorla AI" width="160" style="display: inline-block; max-width: 160px; height: auto;" />
              </div>
              <h2 style="font-size: 20px; font-weight: 700; color: #0F172A; margin: 0 0 8px 0; text-align: center;">Подтверждение Email адреса</h2>
              <p style="font-size: 14px; color: #475569; line-height: 1.5; margin: 0 0 20px 0; text-align: center;">
                Добро пожаловать в Chorla AI! Введите этот 6-значный код для активации вашей организации и начисления <strong>100 бонусных токенов</strong>:
              </p>
              <div style="background: #F8FAFC; border: 2px dashed #DC2626; border-radius: 12px; padding: 18px; text-align: center; margin-bottom: 20px;">
                <span style="font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #DC2626; font-family: monospace;">${verificationCode}</span>
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
      verificationCode,
    });
  } catch (error: any) {
    console.error('Error registering workspace:', error);
    return NextResponse.json(
      { error: error.message || 'Ошибка регистрации' },
      { status: 500 }
    );
  }
}
