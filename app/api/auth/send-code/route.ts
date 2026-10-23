import { NextRequest, NextResponse } from 'next/server';
import { getWorkspaceByEmail, updateWorkspace, getAllWorkspaces } from '@/src/db';
import { Resend } from 'resend';

export async function POST(req: NextRequest) {
  try {
    const { email, workspaceId } = await req.json();

    if (!email) {
      return NextResponse.json({ error: 'Email обязателен' }, { status: 400 });
    }

    // Generate 6-digit verification code
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Find and update workspace
    let targetWorkspace = null;
    if (workspaceId) {
      const all = await getAllWorkspaces();
      targetWorkspace = all.find((w) => w.id === workspaceId);
    }
    if (!targetWorkspace) {
      targetWorkspace = await getWorkspaceByEmail(email);
    }

    if (targetWorkspace) {
      await updateWorkspace(targetWorkspace.id, {
        verificationCode: code,
        verificationSentAt: new Date(),
      });
    }

    // Console output for easy dev verification
    console.log('\n==========================================');
    console.log('🔑 [EMAIL VERIFICATION CODE]');
    console.log(`✉️  Кому: ${email}`);
    console.log(`⚡ Код: ${code}`);
    console.log('==========================================\n');

    let emailSent = false;
    let emailError = null;

    if (process.env.RESEND_API_KEY && !process.env.RESEND_API_KEY.includes('your_api_key')) {
      try {
        const resend = new Resend(process.env.RESEND_API_KEY);
        await resend.emails.send({
          from: 'AI Business OS <onboarding@resend.dev>',
          to: email,
          subject: `${code} — ваш код подтверждения в AI Business OS`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; border: 1px solid #E2E8F0; border-radius: 16px; background: #FFFFFF;">
              <div style="margin-bottom: 20px;">
                <span style="font-weight: 800; font-size: 18px; color: #0F172A;">AI Business OS</span>
              </div>
              <h2 style="font-size: 20px; font-weight: 700; color: #0F172A; margin: 0 0 8px 0;">Подтверждение Email адреса</h2>
              <p style="font-size: 14px; color: #475569; line-height: 1.5; margin: 0 0 20px 0;">
                Используйте этот 6-значный код для активации вашей организации и начисления <strong>100 бонусных токенов</strong>:
              </p>
              <div style="background: #F8FAFC; border: 2px dashed #2563EB; border-radius: 12px; padding: 18px; text-align: center; margin-bottom: 20px;">
                <span style="font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #2563EB; font-family: monospace;">${code}</span>
              </div>
              <p style="font-size: 12px; color: #94A3B8; margin: 0;">
                Код действителен в течение 15 минут. Если вы не регистрировались на платформе, просто проигнорируйте это письмо.
              </p>
            </div>
          `,
        });
        emailSent = true;
      } catch (err: any) {
        console.warn('Resend send warning (may be test domain restriction):', err?.message || err);
        emailError = err?.message || 'Email delivery limited to verified domains';
      }
    }

    return NextResponse.json({
      success: true,
      code, // returned for dev notification display as requested
      emailSent,
      emailError,
      message: emailSent
        ? 'Код успешно отправлен на вашу почту'
        : 'Тестовый режим: код выведен в уведомление и консоль',
    });
  } catch (error: any) {
    console.error('Error in send-code route:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
