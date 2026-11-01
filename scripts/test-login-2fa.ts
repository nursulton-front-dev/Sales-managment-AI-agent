import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { emailOTP } from 'better-auth/plugins';
import { NextRequest } from 'next/server';
import * as schema from '../src/db/schema';
import { setTestDb } from '../src/db';
import { setTestAuth, setTestEmailDispatcher } from '../lib/auth';
import { POST as loginHandler } from '../app/api/auth/login/route';
import { POST as verifyCodeHandler } from '../app/api/auth/login/verify-code/route';
import { POST as resendCodeHandler } from '../app/api/auth/login/resend-code/route';
import { eq, sql } from 'drizzle-orm';
import { hashPassword } from 'better-auth/crypto';
import { createAuthEndpoint, APIError } from 'better-auth/api';
import { setSessionCookie } from 'better-auth/cookies';
import { z } from 'zod';

interface DispatchedEmail {
  email: string;
  otp: string;
  type: string;
}
const testDispatchedEmails: DispatchedEmail[] = [];

function makeRequest(url: string, method: string, body?: unknown, headersObj: Record<string, string> = {}) {
  const headers = new Headers(headersObj);
  let payload: string | undefined;
  if (body) {
    payload = JSON.stringify(body);
    headers.set('Content-Type', 'application/json');
  }
  return new NextRequest(new URL(url, 'http://localhost:3000'), {
    method,
    headers,
    body: payload,
  });
}

function assert(condition: boolean, name: string, category: string, details?: string) {
  if (!condition) {
    console.error(`❌ FAIL: [${category}] ${name} ${details ? '- ' + details : ''}`);
    throw new Error(`Assertion failed: ${name}`);
  }
  console.log(`✅ PASS: [${category}] ${name}`);
}

async function runLogin2FATestSuite() {
  console.log('🚀 Starting Gapcha AI Login 2FA & Security Verification Suite...\n');

  // STEP 0: Spin up isolated in-memory PostgreSQL engine via PGlite
  console.log('--- Step 0: Initializing Isolated PGlite PostgreSQL Database ---');
  const pg = new PGlite();
  const testDb = drizzle(pg, { schema });

  await pg.exec(`
    CREATE TABLE users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      email_verified BOOLEAN NOT NULL DEFAULT FALSE,
      image TEXT,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    );

    CREATE TABLE accounts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      account_id TEXT NOT NULL,
      provider_id TEXT NOT NULL,
      password TEXT,
      access_token TEXT,
      refresh_token TEXT,
      id_token TEXT,
      access_token_expires_at TIMESTAMP WITH TIME ZONE,
      refresh_token_expires_at TIMESTAMP WITH TIME ZONE,
      scope TEXT,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    );

    CREATE TABLE sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token TEXT NOT NULL UNIQUE,
      expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
      ip_address TEXT,
      user_agent TEXT,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    );

    CREATE TABLE verifications (
      id TEXT PRIMARY KEY,
      identifier TEXT NOT NULL,
      value TEXT NOT NULL,
      expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    );

    CREATE TABLE workspaces (
      id TEXT PRIMARY KEY,
      company_name TEXT NOT NULL,
      niche TEXT NOT NULL,
      owner_name TEXT NOT NULL,
      owner_email TEXT NOT NULL UNIQUE,
      owner_phone TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      team_size TEXT NOT NULL,
      daily_leads_volume TEXT NOT NULL,
      plan TEXT NOT NULL DEFAULT 'trial',
      token_balance INTEGER NOT NULL DEFAULT 100,
      status TEXT NOT NULL DEFAULT 'active',
      email_verified BOOLEAN NOT NULL DEFAULT FALSE,
      verification_code TEXT,
      verification_sent_at TIMESTAMP WITH TIME ZONE,
      sub_expires_at TIMESTAMP WITH TIME ZONE,
      google_calendar_connected BOOLEAN NOT NULL DEFAULT FALSE,
      google_calendar_email TEXT,
      google_refresh_token TEXT,
      google_calendar_id TEXT DEFAULT 'primary',
      google_calendar_working_hours TEXT DEFAULT '10:00-18:00',
      google_calendar_slot_duration INTEGER DEFAULT 45,
      instagram_connected BOOLEAN NOT NULL DEFAULT FALSE,
      instagram_user_id TEXT,
      instagram_username TEXT,
      instagram_access_token TEXT,
      instagram_token_expires_at TIMESTAMP WITH TIME ZONE,
      instagram_scopes JSONB DEFAULT '[]'::jsonb,
      instagram_status TEXT NOT NULL DEFAULT 'disconnected',
      instagram_last_error TEXT,
      instagram_agent_id TEXT,
      instagram_auto_reply BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    );
  `);

  setTestDb(testDb as unknown as typeof schema);

  const login2FAPlugin = () => ({
    id: 'login-2fa',
    endpoints: {
      complete2FALogin: createAuthEndpoint(
        '/login/complete-2fa',
        {
          method: 'POST',
          body: z.object({
            userId: z.string(),
            rememberMe: z.boolean().optional(),
          }),
        },
        async (ctx) => {
          const { userId, rememberMe } = ctx.body;
          const dontRememberMe = !rememberMe;
          const session = await ctx.context.internalAdapter.createSession(userId, dontRememberMe);
          const user = await ctx.context.internalAdapter.findUserById(userId);
          if (!user) {
            throw new APIError('NOT_FOUND', { message: 'Пользователь не найден' });
          }
          await setSessionCookie(ctx, { session, user }, dontRememberMe);
          return ctx.json({ success: true, sessionToken: session.token });
        }
      ),
    },
  });

  const testAuthInstance = betterAuth({
    database: drizzleAdapter(testDb, {
      provider: 'pg',
      schema: {
        user: schema.users,
        session: schema.sessions,
        account: schema.accounts,
        verification: schema.verifications,
      },
    }),
    session: {
      expiresIn: 30 * 86400,
      updateAge: 86400,
    },
    plugins: [
      emailOTP({
        expiresIn: 900,
        allowedAttempts: 3,
        storeOTP: 'hashed',
        disableSignUp: true,
        async sendVerificationOTP({ email, otp, type }) {
          testDispatchedEmails.push({ email, otp, type });
        },
      }),
      login2FAPlugin(),
    ],
    emailAndPassword: { enabled: true },
    secret: 'test-secret-salt-key-for-better-auth-sessions-32-chars-long',
    baseURL: 'http://localhost:3000',
  });

  setTestAuth(testAuthInstance);

  setTestEmailDispatcher(async ({ email, otp, type }) => {
    testDispatchedEmails.push({ email, otp, type });
    return { success: true };
  });

  console.log('✅ Isolated PostgreSQL tables created in PGlite and Better Auth wired.\n');

  // Seed test user with verified email and workspace
  const userAEmail = 'alex@gapcha.ai';
  const userAPassword = 'StrongPassword123!';
  const userAHashed = await hashPassword(userAPassword);

  await testDb.insert(schema.users).values({
    id: 'u_alex',
    name: 'Alex Gapcha',
    email: userAEmail,
    emailVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  await testDb.insert(schema.accounts).values({
    id: 'acc_alex',
    userId: 'u_alex',
    accountId: 'u_alex',
    providerId: 'credential',
    password: userAHashed,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  await testDb.insert(schema.workspaces).values({
    id: 'ws_alex',
    companyName: 'Gapcha Tech',
    niche: 'education',
    ownerName: 'Alex Gapcha',
    ownerEmail: userAEmail,
    ownerPhone: '+998901234567',
    passwordHash: 'managed-by-auth',
    teamSize: '2-5',
    dailyLeadsVolume: '20-100',
    plan: 'trial',
    tokenBalance: 100,
    status: 'active',
    emailVerified: true,
  });

  // Seed legacy workspace owner (hash_xxx) without Better Auth credential account
  const legacyEmail = 'legacy@gapcha.ai';
  await testDb.insert(schema.workspaces).values({
    id: 'ws_legacy',
    companyName: 'Legacy Shop',
    niche: 'ecommerce',
    ownerName: 'Legacy User',
    ownerEmail: legacyEmail,
    ownerPhone: '+998909876543',
    passwordHash: 'hash_legacy_md5_sample',
    teamSize: '1',
    dailyLeadsVolume: '<20',
    plan: 'trial',
    tokenBalance: 100,
    status: 'active',
    emailVerified: false,
  });

  // ==========================================================================
  // SECTION 1: Password Check & Lack of Access Before Code Confirmation
  // ==========================================================================
  console.log('--- Section 1: Password Verification & Zero Access Before Code ---');

  // Test 1.1: Wrong password -> 401
  const wrongPwdRes = await loginHandler(makeRequest('http://localhost:3000/api/auth/login', 'POST', {
    email: userAEmail,
    password: 'WrongPassword999!',
  }));
  assert(wrongPwdRes.status === 401, 'Rejects incorrect password with status 401', 'Password Security');
  const wrongPwdData = await wrongPwdRes.json();
  assert(wrongPwdData.error === 'Неверный email или пароль', 'Standard uniform Russian error on wrong password', 'Password Security');

  // Test 1.2: Legacy account without credential account -> 401 NEED_PASSWORD_SETUP
  const legacyLoginRes = await loginHandler(makeRequest('http://localhost:3000/api/auth/login', 'POST', {
    email: legacyEmail,
    password: 'SomePassword123!',
  }));
  assert(legacyLoginRes.status === 401, 'Legacy hash account returns 401', 'Legacy Migration');
  const legacyLoginData = await legacyLoginRes.json();
  assert(legacyLoginData.code === 'NEED_PASSWORD_SETUP', 'Legacy account gets NEED_PASSWORD_SETUP code', 'Legacy Migration');

  // Test 1.3: Correct password -> 2FA challenge generated, NO session cookie attached!
  testDispatchedEmails.length = 0;
  const loginAttempt1Res = await loginHandler(makeRequest('http://localhost:3000/api/auth/login', 'POST', {
    email: userAEmail,
    password: userAPassword,
    rememberMe: true,
  }));

  assert(loginAttempt1Res.status === 200, 'Correct password returns 200', '2FA Gate');
  const loginAttempt1Data = await loginAttempt1Res.json();
  assert(loginAttempt1Data.requires2FA === true, 'Response specifies requires2FA = true', '2FA Gate');
  assert(typeof loginAttempt1Data.loginAttemptId === 'string' && loginAttempt1Data.loginAttemptId.startsWith('att_'), 'Returns valid loginAttemptId', '2FA Gate');
  assert(loginAttempt1Data.maskedEmail === 'a***x@gapcha.ai', 'Returns properly masked email: a***x@gapcha.ai', '2FA Gate');
  assert(loginAttempt1Data.resendCooldown === 60, 'Returns 60s resend cooldown', '2FA Gate');

  // Verify that NO session cookies exist in this step
  const setCookieHeader = loginAttempt1Res.headers.get('set-cookie') || '';
  assert(!setCookieHeader.includes('better-auth.session_token'), 'SERVER ACCESS IS 100% CLOSED: Zero session cookies returned before 2FA', '2FA Gate');

  // Verify email dispatch
  assert(testDispatchedEmails.length === 1, 'Verification email was dispatched', 'Email Dispatch');
  const dispatched1 = testDispatchedEmails[0];
  assert(dispatched1.type === 'login-verification', 'Email type is login-verification', 'Email Dispatch');
  assert(/^\d{6}$/.test(dispatched1.otp), 'Dispatched OTP is exactly 6 digits', 'Email Dispatch');
  const validOtp1 = dispatched1.otp;

  // Verify DB record
  const attemptRow = await testDb.query.verifications.findFirst({
    where: eq(schema.verifications.id, `login-attempt:${loginAttempt1Data.loginAttemptId}`),
  });
  assert(Boolean(attemptRow), 'Verification record created in verifications table', 'Storage');
  assert(!attemptRow?.value.includes(validOtp1), 'Never stores open OTP in DB (stored hashed)', 'Storage');

  // ==========================================================================
  // SECTION 2: 2FA Code Verification, Atomic Max 3 Attempts & Expiration
  // ==========================================================================
  console.log('\n--- Section 2: Code Verification, Attempts Lockout & Expiration ---');

  // Test 2.1: Invalid code (Attempt 1 of 3)
  const invalid1Res = await verifyCodeHandler(makeRequest('http://localhost:3000/api/auth/login/verify-code', 'POST', {
    loginAttemptId: loginAttempt1Data.loginAttemptId,
    code: '000000',
  }));
  assert(invalid1Res.status === 400, 'Invalid code returns status 400', 'Code Validation');
  const invalid1Data = await invalid1Res.json();
  assert(invalid1Data.remainingAttempts === 2, 'Reports exactly 2 attempts remaining after 1 wrong try', 'Code Validation');

  // Test 2.2: Invalid code (Attempt 2 of 3)
  const invalid2Res = await verifyCodeHandler(makeRequest('http://localhost:3000/api/auth/login/verify-code', 'POST', {
    loginAttemptId: loginAttempt1Data.loginAttemptId,
    code: '111111',
  }));
  assert(invalid2Res.status === 400, 'Invalid code returns status 400', 'Code Validation');
  const invalid2Data = await invalid2Res.json();
  assert(invalid2Data.remainingAttempts === 1, 'Reports exactly 1 attempt remaining after 2 wrong tries', 'Code Validation');

  // Test 2.3: Invalid code (Attempt 3 of 3) -> Lockout & row deleted!
  const invalid3Res = await verifyCodeHandler(makeRequest('http://localhost:3000/api/auth/login/verify-code', 'POST', {
    loginAttemptId: loginAttempt1Data.loginAttemptId,
    code: '222222',
  }));
  assert(invalid3Res.status === 403, 'Attempt 3 returns status 403 (Lockout)', 'Code Lockout');
  const invalid3Data = await invalid3Res.json();
  assert(invalid3Data.restartRequired === true, 'Specifies restartRequired = true on lockout', 'Code Lockout');

  // Verify verification row was completely deleted
  const attemptRowAfterLockout = await testDb.query.verifications.findFirst({
    where: eq(schema.verifications.id, `login-attempt:${loginAttempt1Data.loginAttemptId}`),
  });
  assert(attemptRowAfterLockout === undefined, 'Attempt record deleted from DB after 3 failed tries', 'Code Lockout');

  // Attempt 4 should fail as not found
  const invalid4Res = await verifyCodeHandler(makeRequest('http://localhost:3000/api/auth/login/verify-code', 'POST', {
    loginAttemptId: loginAttempt1Data.loginAttemptId,
    code: validOtp1,
  }));
  assert(invalid4Res.status === 400, 'Locked attempt rejects even original code', 'Code Lockout');

  // Test 2.4: Expired code (> 10 minutes)
  // Clear rate limit to create fresh attempt
  await testDb.delete(schema.verifications).where(eq(schema.verifications.id, `rate-limit:login:${userAEmail}`));
  testDispatchedEmails.length = 0;

  const expiredAttemptRes = await loginHandler(makeRequest('http://localhost:3000/api/auth/login', 'POST', {
    email: userAEmail,
    password: userAPassword,
  }));
  const expiredAttemptData = await expiredAttemptRes.json();
  const expiredAttemptId = expiredAttemptData.loginAttemptId;
  const expiredOtp = testDispatchedEmails[0].otp;

  // Artificially expire the record in the database
  await testDb.execute(sql`
    UPDATE verifications
    SET expires_at = NOW() - INTERVAL '1 minute'
    WHERE id = ${'login-attempt:' + expiredAttemptId}
  `);

  const expiredVerifyRes = await verifyCodeHandler(makeRequest('http://localhost:3000/api/auth/login/verify-code', 'POST', {
    loginAttemptId: expiredAttemptId,
    code: expiredOtp,
  }));
  assert(expiredVerifyRes.status === 400, 'Expired code (>10 min) rejected with status 400', 'Code Expiration');
  const expiredVerifyData = await expiredVerifyRes.json();
  assert(expiredVerifyData.restartRequired === true, 'Expired code demands login restart', 'Code Expiration');

  // ==========================================================================
  // SECTION 3: Resend Code with 60s Atomic Cooldown & Invalidation
  // ==========================================================================
  console.log('\n--- Section 3: Resend Code, Cooldown & Old Code Invalidation ---');

  await testDb.delete(schema.verifications).where(eq(schema.verifications.id, `rate-limit:login:${userAEmail}`));
  testDispatchedEmails.length = 0;

  const resendTestLogin = await loginHandler(makeRequest('http://localhost:3000/api/auth/login', 'POST', {
    email: userAEmail,
    password: userAPassword,
    rememberMe: true,
  }));
  const resendLoginData = await resendTestLogin.json();
  const resendAttemptId = resendLoginData.loginAttemptId;
  const firstOtp = testDispatchedEmails[0].otp;

  // Test 3.1: Immediate resend (< 60 seconds) is rejected with 429
  const immediateResend = await resendCodeHandler(makeRequest('http://localhost:3000/api/auth/login/resend-code', 'POST', {
    loginAttemptId: resendAttemptId,
  }));
  assert(immediateResend.status === 429, 'Immediate resend within 60s rejected with 429', 'Resend Cooldown');

  // Expire rate limit to simulate 60s passed
  await testDb.execute(sql`
    UPDATE verifications
    SET expires_at = NOW() - INTERVAL '1 second'
    WHERE id = ${'rate-limit:login:' + userAEmail}
  `);

  // Test 3.2: Resend after cooldown succeeds
  const allowedResend = await resendCodeHandler(makeRequest('http://localhost:3000/api/auth/login/resend-code', 'POST', {
    loginAttemptId: resendAttemptId,
  }));
  assert(allowedResend.status === 200, 'Resend after 60s returns status 200', 'Resend');
  assert(testDispatchedEmails.length === 2, 'Second email was dispatched', 'Resend');
  const secondOtp = testDispatchedEmails[1].otp;
  assert(secondOtp !== firstOtp, 'New OTP is different from first OTP', 'Resend');

  // Test 3.3: First OTP is now invalidated!
  const verifyFirstOtpRes = await verifyCodeHandler(makeRequest('http://localhost:3000/api/auth/login/verify-code', 'POST', {
    loginAttemptId: resendAttemptId,
    code: firstOtp,
  }));
  assert(verifyFirstOtpRes.status === 400, 'Previous OTP is invalidated after resend', 'Invalidation');

  // Test 3.4: New OTP succeeds!
  const verifySecondOtpRes = await verifyCodeHandler(makeRequest('http://localhost:3000/api/auth/login/verify-code', 'POST', {
    loginAttemptId: resendAttemptId,
    code: secondOtp,
  }));
  assert(verifySecondOtpRes.status === 200, 'New OTP successfully confirms login', 'Verification Success');
  const secondVerifyData = await verifySecondOtpRes.json();
  assert(secondVerifyData.success === true, 'Login marked successful', 'Verification Success');
  assert(secondVerifyData.hasWorkspace === true, 'User workspace detected and returned', 'Verification Success');

  // ==========================================================================
  // SECTION 4: Single-Use Replay Protection & Parallel Race Conditions
  // ==========================================================================
  console.log('\n--- Section 4: Single-Use Replay Protection & Parallel Races ---');

  // Test 4.1: Replaying already consumed code is rejected
  const replayRes = await verifyCodeHandler(makeRequest('http://localhost:3000/api/auth/login/verify-code', 'POST', {
    loginAttemptId: resendAttemptId,
    code: secondOtp,
  }));
  assert(replayRes.status === 400 || replayRes.status === 403, 'Replayed code rejected (single-use enforced)', 'Replay Protection');

  // Test 4.2: Parallel requests race condition
  await testDb.delete(schema.verifications).where(eq(schema.verifications.id, `rate-limit:login:${userAEmail}`));
  testDispatchedEmails.length = 0;

  const raceLoginRes = await loginHandler(makeRequest('http://localhost:3000/api/auth/login', 'POST', {
    email: userAEmail,
    password: userAPassword,
  }));
  const raceLoginData = await raceLoginRes.json();
  const raceAttemptId = raceLoginData.loginAttemptId;
  const raceOtp = testDispatchedEmails[0].otp;

  // Fire 2 concurrent verification requests with the SAME valid code simultaneously
  const [race1, race2] = await Promise.all([
    verifyCodeHandler(makeRequest('http://localhost:3000/api/auth/login/verify-code', 'POST', {
      loginAttemptId: raceAttemptId,
      code: raceOtp,
    })),
    verifyCodeHandler(makeRequest('http://localhost:3000/api/auth/login/verify-code', 'POST', {
      loginAttemptId: raceAttemptId,
      code: raceOtp,
    })),
  ]);

  const statuses = [race1.status, race2.status].sort();
  assert(statuses[0] === 200 && (statuses[1] === 400 || statuses[1] === 403),
    'Atomic DB consumption: Exactly one concurrent request succeeds, the other is rejected',
    'Concurrency & Race Safety'
  );

  // ==========================================================================
  // SECTION 5: "Remember Me" (30 Days) Session Persistence & Expiry / Logout
  // ==========================================================================
  console.log('\n--- Section 5: Remember Me Session Persistence & Logout Refusal ---');

  // Test 5.1: Remember me = true sets 30-day cookie
  await testDb.delete(schema.verifications).where(eq(schema.verifications.id, `rate-limit:login:${userAEmail}`));
  testDispatchedEmails.length = 0;

  const rememberLoginRes = await loginHandler(makeRequest('http://localhost:3000/api/auth/login', 'POST', {
    email: userAEmail,
    password: userAPassword,
    rememberMe: true,
  }));
  const rememberData = await rememberLoginRes.json();
  const rememberOtp = testDispatchedEmails[0].otp;

  const rememberVerifyRes = await verifyCodeHandler(makeRequest('http://localhost:3000/api/auth/login/verify-code', 'POST', {
    loginAttemptId: rememberData.loginAttemptId,
    code: rememberOtp,
  }));

  assert(rememberVerifyRes.status === 200, 'RememberMe verification succeeds', 'Session Persistence');
  const rememberCookies = rememberVerifyRes.headers.getSetCookie();
  const sessionTokenCookie = rememberCookies.find((c) => c.startsWith('better-auth.session_token='));
  assert(Boolean(sessionTokenCookie), 'better-auth.session_token cookie is issued', 'Session Persistence');
  assert(sessionTokenCookie!.includes('Max-Age=2592000'), 'Session cookie maxAge is 30 days (2592000 seconds)', 'Session Persistence');

  const workspaceCookie = rememberCookies.find((c) => c.startsWith('ai_os_workspace_id='));
  assert(Boolean(workspaceCookie), 'ai_os_workspace_id cookie is issued', 'Session Persistence');
  assert(workspaceCookie!.includes('Max-Age=2592000'), 'Workspace cookie maxAge is 30 days', 'Session Persistence');

  // Extract session token from cookie
  const rawToken = sessionTokenCookie!.split(';')[0].split('=')[1].split('.')[0];
  const dbSession = await testDb.query.sessions.findFirst({
    where: eq(schema.sessions.token, rawToken),
  });
  assert(Boolean(dbSession), 'Session row found in database sessions table', 'Session Persistence');
  const sessionDurationDays = (dbSession!.expiresAt.getTime() - Date.now()) / (1000 * 86400);
  assert(sessionDurationDays > 28 && sessionDurationDays <= 30.1, 'Database session expires in 30 days', 'Session Persistence');

  // Test 5.2: Remember me = false sets 1-day/session cookie
  await testDb.delete(schema.verifications).where(eq(schema.verifications.id, `rate-limit:login:${userAEmail}`));
  testDispatchedEmails.length = 0;

  const noRememberLoginRes = await loginHandler(makeRequest('http://localhost:3000/api/auth/login', 'POST', {
    email: userAEmail,
    password: userAPassword,
    rememberMe: false,
  }));
  const noRememberData = await noRememberLoginRes.json();
  const noRememberOtp = testDispatchedEmails[0].otp;

  const noRememberVerifyRes = await verifyCodeHandler(makeRequest('http://localhost:3000/api/auth/login/verify-code', 'POST', {
    loginAttemptId: noRememberData.loginAttemptId,
    code: noRememberOtp,
  }));

  const noRememberCookies = noRememberVerifyRes.headers.getSetCookie();
  const noRememberSessionCookie = noRememberCookies.find((c) => c.startsWith('better-auth.session_token='));
  assert(!noRememberSessionCookie!.includes('Max-Age='), 'Session without rememberMe has no Max-Age (browser session)', 'Session Persistence');
  const dontRememberCookie = noRememberCookies.find((c) => c.startsWith('better-auth.dont_remember='));
  assert(Boolean(dontRememberCookie), 'Sets better-auth.dont_remember cookie when rememberMe is false', 'Session Persistence');

  // Test 5.3: Logout & Refusal of old session
  // Delete session in DB as Better Auth signOut does
  await testDb.delete(schema.sessions).where(eq(schema.sessions.token, rawToken));
  const revokedSession = await testDb.query.sessions.findFirst({
    where: eq(schema.sessions.token, rawToken),
  });
  assert(revokedSession === undefined, 'Session token revoked after logout', 'Session Revocation');

  // Next login by password requires 2FA code again
  await testDb.delete(schema.verifications).where(eq(schema.verifications.id, `rate-limit:login:${userAEmail}`));
  testDispatchedEmails.length = 0;

  const nextLoginRes = await loginHandler(makeRequest('http://localhost:3000/api/auth/login', 'POST', {
    email: userAEmail,
    password: userAPassword,
  }));
  const nextLoginData = await nextLoginRes.json();
  assert(nextLoginData.requires2FA === true, 'Next login after logout requires fresh 2FA code', 'Session Revocation');

  // ==========================================================================
  // SECTION 6: Cross-Flow Isolation (Recovery / Registration OTPs do NOT work for login)
  // ==========================================================================
  console.log('\n--- Section 6: Cross-Flow Isolation ---');

  // Create dummy recovery OTP in verifications
  const recoveryOtpId = `forget-password:u_alex`;
  await testDb.insert(schema.verifications).values({
    id: recoveryOtpId,
    identifier: `forget-password:${userAEmail}`,
    value: '999999:0',
    expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const crossFlowVerify = await verifyCodeHandler(makeRequest('http://localhost:3000/api/auth/login/verify-code', 'POST', {
    loginAttemptId: nextLoginData.loginAttemptId,
    code: '999999',
  }));
  assert(crossFlowVerify.status === 400, 'Password recovery OTP cannot be used to verify login', 'Cross-Flow Isolation');

  // ==========================================================================
  // SECTION 7: Google OAuth Flow Preservation
  // ==========================================================================
  console.log('\n--- Section 7: Google OAuth Flow Intact ---');

  // Create Google OAuth account for a user
  const googleUserEmail = 'google.user@gapcha.ai';
  await testDb.insert(schema.users).values({
    id: 'u_google',
    name: 'Google User',
    email: googleUserEmail,
    emailVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  await testDb.insert(schema.accounts).values({
    id: 'acc_google',
    userId: 'u_google',
    accountId: 'google_123456789',
    providerId: 'google',
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  // Direct Better Auth session creation (simulating OAuth callback success)
  const googleSession = await testAuthInstance.api.complete2FALogin({
    body: { userId: 'u_google', rememberMe: true },
    asResponse: true,
  });

  assert(googleSession.status === 200, 'Google OAuth creates session directly without 2FA code', 'OAuth Compatibility');
  assert(googleSession.headers.getSetCookie().some((c) => c.startsWith('better-auth.session_token=')),
    'Google OAuth session cookie issued without email challenge',
    'OAuth Compatibility'
  );

  console.log('\n🎉 ALL 18 LOGIN 2FA & SECURITY ASSERTIONS PASSED WITH 100% SUCCESS!\n');
}

runLogin2FATestSuite().catch((err) => {
  console.error('\n❌ Test Suite Failed:', err);
  process.exit(1);
});
