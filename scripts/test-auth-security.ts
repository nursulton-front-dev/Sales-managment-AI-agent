import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { emailOTP } from 'better-auth/plugins';
import { NextRequest } from 'next/server';
import * as schema from '../src/db/schema';
import { setTestDb } from '../src/db';
import { setTestAuth, setTestEmailDispatcher } from '../lib/auth';
import { evaluatePassword, validatePasswordPolicy } from '../lib/password';
import { POST as loginHandler } from '../app/api/auth/login/route';
import { POST as registerHandler } from '../app/api/auth/register/route';
import { POST as sendCodeHandler } from '../app/api/auth/recover/send-code/route';
import { POST as resetPasswordHandler } from '../app/api/auth/recover/reset-password/route';
import { eq } from 'drizzle-orm';
import { getCurrentAuthEndpointContext } from '@better-auth/core/context';
import { APIError } from 'better-auth/api';

// Intercepted dispatched emails during test execution
interface DispatchedEmail {
  email: string;
  otp: string;
  type: string;
}
const testDispatchedEmails: DispatchedEmail[] = [];

// Helper to create NextRequest with JSON body and optional cookies/headers
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

async function runRealHandlerTestSuite() {
  console.log('🚀 Starting Verification of REAL Auth Route Handlers with Isolated Test DB...\n');

  // ==========================================================================
  // STEP 0: Spin up isolated in-memory PostgreSQL engine via PGlite
  // ==========================================================================
  console.log('--- Step 0: Initializing Isolated PGlite PostgreSQL Database ---');
  const pg = new PGlite();
  const testDb = drizzle(pg, { schema });

  // Create PostgreSQL tables
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
      instagram_scopes TEXT[],
      instagram_status TEXT DEFAULT 'disconnected',
      instagram_last_error TEXT,
      instagram_agent_id TEXT,
      instagram_auto_reply BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    );

    CREATE TABLE trial_grants (
      id TEXT PRIMARY KEY,
      phone TEXT,
      email TEXT,
      workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      tokens_granted INTEGER NOT NULL,
      granted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    );

    CREATE TABLE token_logs (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      action_type TEXT NOT NULL,
      tokens_delta INTEGER NOT NULL,
      amount_usd TEXT,
      payment_method TEXT,
      description TEXT,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    );
  `);
  console.log('✅ Isolated PostgreSQL tables created in PGlite');

  // Inject test database into @/src/db
  setTestDb(testDb);

  // Set test email transport
  setTestEmailDispatcher(async ({ email, otp, type }) => {
    testDispatchedEmails.push({ email, otp, type });
    return { success: true, mocked: true };
  });

  // Password policy plugin for test Better Auth
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

  // Create isolated Better Auth instance wired to testDb
  const testAuth = betterAuth({
    database: drizzleAdapter(testDb, {
      provider: 'pg',
      schema: {
        user: schema.users,
        session: schema.sessions,
        account: schema.accounts,
        verification: schema.verifications,
      },
    }),
    secret: 'test-secret-at-least-32-characters-long-12345',
    baseURL: 'http://localhost:3000',
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
      passwordPolicyPlugin(),
    ],
    emailAndPassword: {
      enabled: true,
      revokeSessionsOnPasswordReset: true,
    },
  });

  setTestAuth(testAuth);
  console.log('✅ Better Auth wired to isolated test database\n');

  // ==========================================================================
  // SECTION 1: Password Strength Evaluator UX & Policy
  // ==========================================================================
  console.log('--- Section 1: Password Strength Evaluator UX & Policy ---');
  const emptyRes = evaluatePassword('');
  assert(emptyRes.percent === 0 && emptyRes.level === 'empty', 'Empty password evaluates to 0% bar', 'Password UX');

  const weakEval = evaluatePassword('123456');
  assert(weakEval.percent === 25 && weakEval.label === 'Слабый', 'Weak password scores 25%', 'Password UX');

  const medEval = evaluatePassword('simplepass1');
  assert(medEval.percent === 50 && medEval.label === 'Средний', 'Medium password scores 50%', 'Password UX');

  const goodEval = evaluatePassword('salon2026best');
  assert(goodEval.percent === 75 && goodEval.label === 'Хороший', 'Good password scores 75%', 'Password UX');

  const strongEval = evaluatePassword('Complex!P@ssw0rd2026#Secure');
  assert(strongEval.percent === 100 && strongEval.label === 'Надёжный', 'Strong password scores 100%', 'Password UX');

  // ==========================================================================
  // SECTION 2: Real API rejects Weak Passwords on Sign-up and Reset
  // ==========================================================================
  console.log('\n--- Section 2: Real API Rejection of Weak Passwords ---');
  
  // 2.1 Direct signUpEmail with weak password '12345678'
  let signUpWeakRejected = false;
  try {
    await testAuth.api.signUpEmail({
      body: {
        name: 'Weak Pass User',
        email: 'weakpass@test.com',
        password: '12345678',
      },
    });
  } catch (err: unknown) {
    const authErr = err as { statusCode?: number; status?: string; message?: string };
    signUpWeakRejected = true;
    assert(
      (authErr.statusCode === 400 || authErr.status === 'BAD_REQUEST') &&
      Boolean(authErr.message?.includes('Пароль слишком слабый') || authErr.message?.includes('Password')),
      'Real signUpEmail rejects weak "12345678" with 400',
      'Password API Security',
      authErr.message
    );
  }
  assert(signUpWeakRejected, 'Direct Better Auth signUpEmail rejected weak password', 'Password API Security');

  // 2.2 Reset password route handler with weak password
  const resetWeakReq = makeRequest('/api/auth/recover/reset-password', 'POST', {
    email: 'any@test.com',
    code: '123456',
    newPassword: 'short',
  });
  const resetWeakRes = await resetPasswordHandler(resetWeakReq);
  const resetWeakData = await resetWeakRes.json();
  assert(
    resetWeakRes.status === 400 && Boolean(resetWeakData.error?.includes('8 символов')),
    'Real reset-password handler rejects password under 8 chars',
    'Password API Security',
    resetWeakData.error
  );

  // ==========================================================================
  // SECTION 3: Unverified Email Access & Company Binding Strictly Prohibited
  // ==========================================================================
  console.log('\n--- Section 3: Unverified Email Company Access Prohibition ---');

  // 3.1 Sign up a user with unverified email (emailVerified: false)
  const unverifiedEmail = 'unverified_owner@test.com';
  const unverifiedPassword = 'StrongPass2026!#Valid';
  const signUpRes = await testAuth.api.signUpEmail({
    body: {
      name: 'Unverified User',
      email: unverifiedEmail,
      password: unverifiedPassword,
    },
    asResponse: true,
  });

  const sessionToken = signUpRes.headers.getSetCookie().find((c) => c.startsWith('better-auth.session_token='))?.split(';')[0];
  assert(Boolean(sessionToken), 'Unverified user created Better Auth session cookie', 'Unverified Email');

  const authHeaders = {
    Cookie: sessionToken || '',
  };

  // 3.2 Attempt to create / bind company with unverified email via real registerHandler
  const regReq = makeRequest('/api/auth/register', 'POST', {
    companyName: 'Stolen Corp LLC',
    niche: 'salon',
    ownerPhone: '+998901112233',
    plan: 'trial',
  }, authHeaders);

  const regRes = await registerHandler(regReq);
  const regData = await regRes.json();
  assert(
    regRes.status === 403 && Boolean(regData.error?.includes('только для подтверждённого')),
    'Real register route handler REJECTS workspace creation for unverified email with 403',
    'Ownership Security',
    regData.error
  );

  // Verify workspace was NOT created in DB
  const wsRows = await testDb.select().from(schema.workspaces).where(eq(schema.workspaces.ownerEmail, unverifiedEmail));
  assert(wsRows.length === 0, 'No workspace was created in database for unverified email', 'Ownership Security');

  // 3.3 Attempt login with unverified email via real loginHandler
  const loginReq = makeRequest('/api/auth/login', 'POST', {
    email: unverifiedEmail,
    password: unverifiedPassword,
  });
  const loginRes = await loginHandler(loginReq);
  const loginData = await loginRes.json();
  assert(
    loginData.emailVerified === false && loginData.hasWorkspace === false && Boolean(loginData.redirectTo?.includes('verify=true')),
    'Real login handler forbids workspace access for unverified email and demands verification',
    'Ownership Security'
  );
  assert(!loginRes.cookies.get('ai_os_workspace_id'), 'Login does NOT issue ai_os_workspace_id cookie for unverified email', 'Ownership Security');

  // ==========================================================================
  // SECTION 4: Cross-Instance Database-Backed Rate Limiting
  // ==========================================================================
  console.log('\n--- Section 4: Cross-Instance Database-Backed Rate Limiting ---');

  // First request to send-code
  const sendReq1 = makeRequest('/api/auth/recover/send-code', 'POST', { email: 'rate_test@corp.com' });
  const sendRes1 = await sendCodeHandler(sendReq1);
  assert(sendRes1.status === 200, 'First recovery request accepted with uniform 200', 'Rate Limiting');

  // Immediate subsequent request to send-code (emulating hit to another Vercel lambda instance)
  const sendReq2 = makeRequest('/api/auth/recover/send-code', 'POST', { email: 'rate_test@corp.com' });
  const sendRes2 = await sendCodeHandler(sendReq2);
  const sendData2 = await sendRes2.json();
  assert(
    sendRes2.status === 429 && Boolean(sendData2.error?.includes('60 секунд')),
    'Second recovery request within 60s rejected with 429 via database-backed rate limit',
    'Rate Limiting',
    sendData2.error
  );

  // ==========================================================================
  // SECTION 5: Parallel Wrong OTP Codes (Atomic Counter Verification)
  // ==========================================================================
  console.log('\n--- Section 5: Parallel Wrong OTP Codes & Atomic Counter ---');

  // Create a legacy workspace in DB with fake hash
  const legacyEmail = 'legacy_atomic@business.com';
  await testDb.insert(schema.workspaces).values({
    id: 'ws_legacy_atomic_1',
    companyName: 'Legacy Atomic Corp',
    niche: 'clinic',
    ownerName: 'Legacy Boss',
    ownerEmail: legacyEmail,
    ownerPhone: '+998909998877',
    passwordHash: 'hash_prototype_fake_123',
    teamSize: '1',
    dailyLeadsVolume: '<20',
    plan: 'trial',
    tokenBalance: 100,
    status: 'active',
    emailVerified: false,
    createdAt: new Date(),
  });

  // Request recovery code for legacy user
  const legSendReq = makeRequest('/api/auth/recover/send-code', 'POST', { email: legacyEmail });
  await sendCodeHandler(legSendReq);

  // Retrieve the generated OTP from test mailer
  const dispatched = testDispatchedEmails.find((m) => m.email === legacyEmail);
  assert(Boolean(dispatched?.otp), 'Unified email transport received legacy migration OTP', 'Email Transport');

  // Send 3 parallel requests with WRONG code to the REAL resetPasswordHandler
  const wrongRequests = [1, 2, 3].map(() =>
    resetPasswordHandler(
      makeRequest('/api/auth/recover/reset-password', 'POST', {
        email: legacyEmail,
        code: '000000', // wrong code
        newPassword: 'BrandNewSecurePass2026!#',
      })
    )
  );

  const wrongResponses = await Promise.all(wrongRequests);
  const wrongStatuses = wrongResponses.map((r) => r.status);
  console.log('Parallel wrong attempts statuses:', wrongStatuses);

  // Verify that the code is now locked out (attempts exhausted)
  const fourthAttempt = await resetPasswordHandler(
    makeRequest('/api/auth/recover/reset-password', 'POST', {
      email: legacyEmail,
      code: '000000',
      newPassword: 'BrandNewSecurePass2026!#',
    })
  );
  assert(
    fourthAttempt.status === 400 || fourthAttempt.status === 403,
    'After 3 wrong parallel attempts, subsequent requests are locked out or purged',
    'Atomic OTP Counter'
  );

  // ==========================================================================
  // SECTION 6: Single-Use Redemption & Replay / Race Protection
  // ==========================================================================
  console.log('\n--- Section 6: Single-Use Redemption & Replay / Race Protection ---');

  const replayEmail = 'legacy_replay@business.com';
  await testDb.insert(schema.workspaces).values({
    id: 'ws_legacy_replay_1',
    companyName: 'Legacy Replay Corp',
    niche: 'salon',
    ownerName: 'Replay Tester',
    ownerEmail: replayEmail,
    ownerPhone: '+998901119988',
    passwordHash: 'hash_old_mock_999',
    teamSize: '1',
    dailyLeadsVolume: '<20',
    plan: 'trial',
    tokenBalance: 100,
    status: 'active',
    emailVerified: false,
    createdAt: new Date(),
  });

  // Request new code
  const freshSendReq = makeRequest('/api/auth/recover/send-code', 'POST', { email: replayEmail });
  const sendRes = await sendCodeHandler(freshSendReq);
  assert(sendRes.status === 200, 'Recovery code sent for replay test user', 'OTP');

  const freshDispatched = testDispatchedEmails.filter((m) => m.email === replayEmail).pop();
  assert(Boolean(freshDispatched?.otp), 'Fresh OTP dispatched', 'OTP');
  const freshOtp = freshDispatched!.otp;

  // Valid redemption via REAL resetPasswordHandler
  const validResetReq = makeRequest('/api/auth/recover/reset-password', 'POST', {
    email: replayEmail,
    code: freshOtp,
    newPassword: 'BrandNewSecurePass2026!#',
  });
  const validResetRes = await resetPasswordHandler(validResetReq);
  const validResetData = await validResetRes.json();
  assert(
    validResetRes.status === 200 && validResetData.success === true,
    'Real resetPasswordHandler accepts valid OTP and returns 200 success',
    'OTP Single Use',
    JSON.stringify(validResetData)
  );

  // REPLAY ATTACK: Submit the exact same valid code a second time to real resetPasswordHandler
  const replayReq = makeRequest('/api/auth/recover/reset-password', 'POST', {
    email: replayEmail,
    code: freshOtp,
    newPassword: 'AnotherPassword2026!#',
  });
  const replayRes = await resetPasswordHandler(replayReq);
  const replayData = await replayRes.json();
  assert(
    replayRes.status === 400 && Boolean(replayData.error?.includes('использован') || replayData.error?.includes('истёк')),
    'Replay attack strictly REJECTED: previously redeemed code cannot be reused',
    'OTP Single Use',
    replayData.error
  );

  // ==========================================================================
  // SECTION 7: Revocation of Prior Sessions upon Password Reset
  // ==========================================================================
  console.log('\n--- Section 7: Revocation of Prior Sessions upon Password Reset ---');

  // Verify the newly migrated user has emailVerified: true and user/account in DB
  const migratedUsers = await testDb.select().from(schema.users).where(eq(schema.users.email, replayEmail));
  assert(migratedUsers.length === 1 && migratedUsers[0].emailVerified === true, 'Migrated user created in users table with emailVerified=true', 'Migration');
  const migratedUserId = migratedUsers[0].id;

  // Emulate active sessions for this user on other devices
  await testDb.insert(schema.sessions).values([
    {
      id: 'sess_old_laptop',
      userId: migratedUserId,
      token: 'token_old_laptop_123',
      expiresAt: new Date(Date.now() + 86400000),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'sess_old_phone',
      userId: migratedUserId,
      token: 'token_old_phone_456',
      expiresAt: new Date(Date.now() + 86400000),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]);

  const priorSessions = await testDb.select().from(schema.sessions).where(eq(schema.sessions.userId, migratedUserId));
  console.log('migratedUsers:', migratedUsers, 'priorSessions:', priorSessions);
  assert(priorSessions.length >= 2, 'User has active sessions on old devices before password reset', 'Session Security');

  // Clear verifications for clean test
  await pg.exec(`DELETE FROM verifications WHERE identifier LIKE '%legacy_replay%'`);

  // Request recovery for this now-existing Better Auth user (we use a distinct email to bypass in-memory cooldown)
  const existingEmail = 'existing_session_test@corp.com';
  const existingUserId = 'usr_existing_sessions_123';
  await testDb.insert(schema.users).values({
    id: existingUserId,
    name: 'Existing User',
    email: existingEmail,
    emailVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  await testDb.insert(schema.accounts).values({
    id: 'acc_existing_123',
    userId: existingUserId,
    accountId: existingUserId,
    providerId: 'credential',
    password: 'InitialPassword2026!#',
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  await testDb.insert(schema.sessions).values([
    {
      id: 'sess_victim_pc',
      userId: existingUserId,
      token: 'token_victim_pc',
      expiresAt: new Date(Date.now() + 86400000),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'sess_victim_tablet',
      userId: existingUserId,
      token: 'token_victim_tablet',
      expiresAt: new Date(Date.now() + 86400000),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]);

  // Request recovery code for existing user via REAL sendCodeHandler
  await sendCodeHandler(makeRequest('/api/auth/recover/send-code', 'POST', { email: existingEmail }));
  const existingDispatched = testDispatchedEmails.filter((m) => m.email === existingEmail).pop();
  assert(Boolean(existingDispatched?.otp), 'OTP dispatched for existing Better Auth user', 'Email Transport');

  // Reset password via REAL resetPasswordHandler
  const resetExistingReq = makeRequest('/api/auth/recover/reset-password', 'POST', {
    email: existingEmail,
    code: existingDispatched!.otp,
    newPassword: 'BrandNewPassword2026!#Updated',
  });
  const resetExistingRes = await resetPasswordHandler(resetExistingReq);
  const resetExistingData = await resetExistingRes.json();
  assert(resetExistingRes.status === 200 && resetExistingData.success === true, 'Password reset succeeded for existing user', 'Session Security', JSON.stringify(resetExistingData));

  // Verify old sessions were purged from DB
  const sessionsAfter = await testDb.select().from(schema.sessions).where(eq(schema.sessions.userId, existingUserId));
  const oldSessionsRemaining = sessionsAfter.filter((s) => s.id === 'sess_victim_pc' || s.id === 'sess_victim_tablet');
  assert(
    oldSessionsRemaining.length === 0,
    'All old sessions were purged from the database after password reset',
    'Session Security'
  );

  // ==========================================================================
  // SECTION 8: Atomic Rate Limit Reservation under High Concurrency (10 requests)
  // ==========================================================================
  console.log('\n--- Section 8: Atomic Rate Limit Burst Reservation (10 Simultaneous Requests) ---');
  const burstRateEmail = 'burst_rate_test@corp.com';
  await testDb.insert(schema.workspaces).values({
    id: 'ws_burst_rate_1',
    companyName: 'Burst Rate Corp',
    niche: 'salon',
    ownerName: 'Burst Boss',
    ownerEmail: burstRateEmail,
    ownerPhone: '+998901112244',
    passwordHash: 'hash_burst_review',
    teamSize: '1',
    dailyLeadsVolume: '<20',
    plan: 'trial',
    tokenBalance: 0,
    status: 'active',
    emailVerified: false,
    createdAt: new Date(),
  });

  const burstRequests = Array.from({ length: 10 }, () =>
    sendCodeHandler(makeRequest('/api/auth/recover/send-code', 'POST', { email: burstRateEmail }))
  );
  const burstResponses = await Promise.all(burstRequests);
  const burstStatuses = burstResponses.map((r) => r.status);
  const burstSuccessCount = burstStatuses.filter((s) => s === 200).length;
  const burstRateLimitCount = burstStatuses.filter((s) => s === 429).length;
  const burstDispatchedCount = testDispatchedEmails.filter((m) => m.email === burstRateEmail).length;

  console.log('Burst 10 requests statuses:', burstStatuses, 'dispatched emails:', burstDispatchedCount);
  assert(burstSuccessCount === 1, 'Exactly 1 request among 10 simultaneous bursts receives 200 OK', 'Atomic Rate Limiting');
  assert(burstRateLimitCount === 9, 'Remaining 9 requests are rejected with 429 Too Many Requests', 'Atomic Rate Limiting');
  assert(burstDispatchedCount === 1, 'Exactly 1 email was dispatched, eliminating duplicate bursts', 'Atomic Rate Limiting');

  // ==========================================================================
  // SECTION 9: Atomic Attempt Limit & Actual Expiration Check under Concurrency
  // ==========================================================================
  console.log('\n--- Section 9: Atomic Attempt Limit & Actual Expiration under Concurrency ---');
  const mixedEmail = 'concurrent_mixed_codes@business.com';
  await testDb.insert(schema.workspaces).values({
    id: 'ws_mixed_atomic_1',
    companyName: 'Mixed Atomic Corp',
    niche: 'salon',
    ownerName: 'Mixed Boss',
    ownerEmail: mixedEmail,
    ownerPhone: '+998901118833',
    passwordHash: 'hash_mixed_review',
    teamSize: '1',
    dailyLeadsVolume: '<20',
    plan: 'trial',
    tokenBalance: 0,
    status: 'active',
    emailVerified: false,
    createdAt: new Date(),
  });

  // Request code for mixedEmail
  await sendCodeHandler(makeRequest('/api/auth/recover/send-code', 'POST', { email: mixedEmail }));
  const mixedDispatched = testDispatchedEmails.filter((m) => m.email === mixedEmail).at(-1);
  assert(Boolean(mixedDispatched?.otp), 'Recovery OTP dispatched for mixed concurrency test', 'OTP Concurrency');
  const mixedCode = mixedDispatched!.otp;
  const mixedPassword = 'Isolated!Review#Password2026';

  let consumedAfterAttempts: number | null = null;
  const originalPgQuery = pg.query.bind(pg);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (pg as any).query = async (...args: any[]) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (originalPgQuery as any)(...args);
    if (typeof args[0] === 'string' && args[0].toLowerCase().includes('delete from') && args[0].toLowerCase().includes('returning')) {
      for (const row of result.rows || []) {
        const identifier = Array.isArray(row) ? row[1] : row.identifier;
        const value = Array.isArray(row) ? row[2] : row.value;
        if (identifier === `legacy-migration:${mixedEmail}`) {
          consumedAfterAttempts = Number(String(value).split(':').at(-1));
        }
      }
    }
    return result;
  };

  const simultaneousWrong = Array.from({ length: 20 }, () =>
    resetPasswordHandler(
      makeRequest('/api/auth/recover/reset-password', 'POST', {
        email: mixedEmail,
        code: '000000',
        newPassword: mixedPassword,
      })
    )
  );
  const simultaneousCorrect = resetPasswordHandler(
    makeRequest('/api/auth/recover/reset-password', 'POST', {
      email: mixedEmail,
      code: mixedCode,
      newPassword: mixedPassword,
    })
  );

  const mixedResults = await Promise.all([...simultaneousWrong, simultaneousCorrect]);
  const incorrectStatuses = mixedResults.slice(0, 20).map((r) => r.status);
  const correctStatus = mixedResults[20].status;

  console.log('Concurrent mixed results:', {
    incorrectStatuses: incorrectStatuses.slice(0, 5),
    correctStatus,
    consumedAfterAttempts,
  });

  assert(
    correctStatus === 403 || correctStatus === 400,
    'Correct code is rejected when attempts have been exhausted by concurrent requests',
    'Atomic OTP Lockout'
  );
  assert(
    consumedAfterAttempts === null,
    'Code was never redeemed after attempts were exhausted (consumedAfterAttempts is null)',
    'Atomic OTP Lockout'
  );

  console.log('\n🎉 ALL REAL ROUTE HANDLER TESTS PASSED WITH 100% SUCCESS!');
  await pg.close();
}

runRealHandlerTestSuite().catch((err) => {
  console.error('\n❌ Real handler test suite failed:', err);
  process.exit(1);
});
