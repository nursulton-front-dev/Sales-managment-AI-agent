import { betterAuth } from 'better-auth';
import { emailOTP } from 'better-auth/plugins';
import { Resend } from 'resend';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from '@/src/db';
import * as schema from '@/src/db/schema';

// Resolve public production / deployment host
const configuredBaseUrl =
  process.env.BETTER_AUTH_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'http://localhost:3000');

export const auth = betterAuth({
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
  plugins: [emailOTP({
    expiresIn: 900, allowedAttempts: 3, storeOTP: 'hashed', disableSignUp: true,
    async sendVerificationOTP({ email, otp }) {
      if (!process.env.RESEND_API_KEY) throw new Error('Отправка писем пока не настроена');
      const { error } = await new Resend(process.env.RESEND_API_KEY).emails.send({
        from: process.env.EMAIL_FROM || 'Chorla AI <onboarding@resend.dev>', to: email,
        subject: 'Код подтверждения Chorla AI', text: `Ваш код: ${otp}. Срок действия — 15 минут.`,
      });
      if (error) throw new Error('Не удалось отправить письмо. Повторите позже.');
    },
  })],
  emailAndPassword: {
    enabled: true,
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
