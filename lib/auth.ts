import { betterAuth } from 'better-auth';
import { emailOTP } from 'better-auth/plugins';
import { Resend } from 'resend';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from '@/src/db';
import * as schema from '@/src/db/schema';

// Resolve public production / deployment host
const configuredBaseUrl =
  process.env.VERCEL_ENV === 'preview' && process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : process.env.BETTER_AUTH_URL ||
      (process.env.VERCEL_PROJECT_PRODUCTION_URL
        ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
        : process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : 'http://localhost:3000');

import { getCurrentAuthEndpointContext } from '@better-auth/core/context';
import { APIError } from 'better-auth/api';
import { validatePasswordPolicy } from '@/lib/password';

// Pluggable email OTP dispatcher (e.g. for isolated test transports)
export type EmailOTPDispatcher = (params: {
  email: string;
  otp: string;
  type: 'forget-password' | 'email-verification' | 'legacy-migration';
}) => Promise<{ success: boolean; mocked?: boolean }>;

let customEmailDispatcher: EmailOTPDispatcher | null = null;

export function setTestEmailDispatcher(dispatcher: EmailOTPDispatcher | null) {
  customEmailDispatcher = dispatcher;
}

export async function sendAuthEmailOTP({
  email,
  otp,
  type,
}: {
  email: string;
  otp: string;
  type: 'forget-password' | 'email-verification' | 'legacy-migration';
}) {
  if (customEmailDispatcher) {
    return await customEmailDispatcher({ email, otp, type });
  }

  const isRecovery = type === 'forget-password' || type === 'legacy-migration';
  const subject = isRecovery
    ? `${otp} — код восстановления пароля в Chorla AI`
    : `${otp} — код подтверждения в Chorla AI`;
  const title = isRecovery ? 'Восстановление доступа к аккаунту' : 'Подтверждение Email адреса';
  const desc = isRecovery
    ? 'Используйте этот 6-значный код для установки нового пароля в вашей организации:'
    : 'Добро пожаловать в Chorla AI! Введите этот 6-значный код для подтверждения почты и начисления <strong>100 бонусных токенов</strong>:';

  if (!process.env.RESEND_API_KEY) {
    if (process.env.NODE_ENV !== 'production' || process.env.TEST_MODE === 'true') {
      console.log(`[AUTH EMAIL TRANSPORT] Dispatch to ${email}: ${otp} (${type})`);
      return { success: true, mocked: true };
    }
    throw new Error('Отправка писем пока не настроена (RESEND_API_KEY отсутствует)');
  }

  const { error } = await new Resend(process.env.RESEND_API_KEY).emails.send({
    from: process.env.EMAIL_FROM || 'Chorla AI <onboarding@resend.dev>',
    to: email,
    subject,
    text: `Ваш проверочный код Chorla AI: ${otp}. Срок действия — 15 минут.`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; border: 1px solid #E2E8F0; border-radius: 16px; background: #FFFFFF;">
        <div style="text-align: center; margin-bottom: 20px;">
          <img src="https://chorla-ai.vercel.app/brand/chorla-ai-logo-light.png" alt="Chorla AI" width="160" style="display: inline-block; max-width: 160px; height: auto;" />
        </div>
        <h2 style="font-size: 20px; font-weight: 700; color: #0F172A; margin: 0 0 8px 0; text-align: center;">${title}</h2>
        <p style="font-size: 14px; color: #475569; line-height: 1.5; margin: 0 0 20px 0; text-align: center;">
          ${desc}
        </p>
        <div style="background: #F8FAFC; border: 2px dashed #DC2626; border-radius: 12px; padding: 18px; text-align: center; margin-bottom: 20px;">
          <span style="font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #DC2626; font-family: monospace;">${otp}</span>
        </div>
        <p style="font-size: 12px; color: #94A3B8; margin: 0; text-align: center;">
          Код действителен 15 минут. Если вы не запрашивали этот код, просто проигнорируйте письмо.
        </p>
      </div>
    `,
  });

  if (error) {
    console.error('[Resend Error]:', error);
    if (process.env.VERCEL_ENV === 'preview' || process.env.NODE_ENV !== 'production' || process.env.TEST_MODE === 'true') {
      console.warn(`[AUTH EMAIL TRANSPORT Preview Warning] Resend restricted recipient (${email}), simulated delivery for preview testing.`);
      return { success: true, simulated: true };
    }
    throw new Error('Не удалось отправить письмо. Повторите позже.');
  }

  return { success: true };
}

// Custom plugin enforcing password policy across all new account creations and password changes/resets
// while keeping existing logins unaffected.
const passwordPolicyPlugin = () => ({
  id: 'password-policy',
  init(ctx: { password: { hash: (password: string) => Promise<string> } }) {
    const originalHash = ctx.password.hash;
    return {
      context: {
        password: {
          ...ctx.password,
          async hash(password: string) {
            const endpointCtx = getCurrentAuthEndpointContext();
            const path = endpointCtx?.path;
            // Validate password policy on registration and password setup/resets
            if (!path || path.startsWith('/sign-up') || path.includes('password')) {
              const policy = validatePasswordPolicy(password);
              if (!policy.valid) {
                throw new APIError('BAD_REQUEST', {
                  message: policy.error || 'Пароль не соответствует требованиям безопасности',
                  code: 'PASSWORD_TOO_WEAK',
                });
              }
            }
            return originalHash(password);
          },
        },
      },
    };
  },
});

export let auth = betterAuth({
  database: db
    ? drizzleAdapter(db, {
        provider: 'pg',
        schema: {
          user: schema.users,
          session: schema.sessions,
          account: schema.accounts,
          verification: schema.verifications,
        },
      })
    : undefined,
  plugins: [
    emailOTP({
      expiresIn: 900,
      allowedAttempts: 3,
      storeOTP: 'hashed',
      disableSignUp: true,
      async sendVerificationOTP({ email, otp, type }) {
        await sendAuthEmailOTP({ email, otp, type: type as 'forget-password' | 'email-verification' });
      },
    }),
    passwordPolicyPlugin(),
  ],
  emailAndPassword: {
    enabled: true,
    revokeSessionsOnPasswordReset: true,
  },
  socialProviders: {
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? {
          google: {
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          },
        }
      : {}),
  },
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: configuredBaseUrl,
  trustedOrigins: [
    'https://chorla-ai.vercel.app',
    'https://saler-aka.vercel.app',
    'https://*.vercel.app',
    'http://localhost:3000',
    ...(process.env.VERCEL_URL ? [`https://${process.env.VERCEL_URL}`] : []),
  ],
  onAPIError: {
    onError: (error) => {
      console.warn('[Better Auth Error Handler]:', error instanceof Error ? error.message : String(error));
    },
    errorURL: '/login?error=auth_failed',
  },
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function setTestAuth(customAuth: any) {
  auth = customAuth;
}
