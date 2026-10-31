import dns from 'dns';
dns.setDefaultResultOrder('ipv4first');
import { neon } from '@neondatabase/serverless';
import fs from 'fs';
import { Resend } from 'resend';

const PREVIEW_URL = process.env.PREVIEW_URL || 'https://ai-business-oelriupa2-nursultans-projects-c3c55b7b.vercel.app';
const TEST_EMAIL = 'androhaker01@gmail.com';

// Read database URL for chorla_test
const envContent = fs.readFileSync('.env.local', 'utf-8');
const match = envContent.match(/DATABASE_URL=['"]?(postgres[^'"]+)['"]?/);
if (!match) throw new Error('No DATABASE_URL found in .env.local');

const resendMatch = envContent.match(/RESEND_API_KEY=['"]?([^'"\r\n]+)['"]?/);
if (!resendMatch) throw new Error('No RESEND_API_KEY found in .env.local');
const resend = new Resend(resendMatch[1]);

const u = new URL(match[1]);
u.pathname = '/chorla_test';
const rawSql = neon(u.toString());
async function testSql(strings: TemplateStringsArray, ...values: any[]): Promise<any[]> {
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      return (await (rawSql as any)(strings, ...values)) as any[];
    } catch (err) {
      if (attempt === 5) throw err;
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
  return [];
}

function assert(condition: boolean, name: string, category: string, details?: string) {
  if (!condition) {
    console.error(`❌ FAIL: [${category}] ${name} ${details ? '- ' + details : ''}`);
    throw new Error(`Assertion failed: ${name}`);
  }
  console.log(`✅ PASS: [${category}] ${name}`);
}

// Poll Resend API for the latest delivered email to TEST_EMAIL
async function getLatestDeliveredOTP(sinceTimestamp: number): Promise<string> {
  console.log(`⏳ Waiting for real email delivered via Resend to ${TEST_EMAIL}...`);
  for (let attempt = 1; attempt <= 20; attempt++) {
    try {
      const list = await resend.emails.list();
      const items = list.data?.data || [];
      for (const item of items) {
        if (item.to.includes(TEST_EMAIL)) {
          const itemTime = new Date(item.created_at).getTime();
          if (itemTime >= sinceTimestamp - 8000) {
            const detail = await resend.emails.get(item.id);
            const fullText = `${detail.data?.subject || ''} ${detail.data?.text || ''}`;
            const match = fullText.match(/\b\d{6}\b/);
            if (match) {
              console.log(`📬 Received real email [${item.id}]: "${detail.data?.subject}". Extracted OTP: ${match[0]}`);
              return match[0];
            }
          }
        }
      }
    } catch (err) {
      console.warn(`Resend poll attempt ${attempt} warning:`, err);
    }
    await new Promise((r) => setTimeout(r, 1500));
  }
  throw new Error(`Timeout waiting for real email delivered to ${TEST_EMAIL} in Resend`);
}

async function runPreviewVerification() {
  console.log(`🚀 Starting Full Live Preview Verification on ${PREVIEW_URL}...\n`);

  // Ensure chorla_test database connection
  const dbCheck = await testSql`SELECT current_database(), current_user`;
  console.log('Connected to isolated preview DB:', dbCheck[0]);
  assert(dbCheck[0].current_database === 'chorla_test', 'Connected strictly to isolated chorla_test database', 'Database Isolation');

  // =========================================================================
  // TEST 1: Password Strength & Rejection of Weak Passwords on Live Preview
  // =========================================================================
  console.log('\n--- Test 1: Weak Password Rejection on Live Preview ---');
  const weakEmail = `preview_weak_${Date.now()}@test.com`;
  const weakRes = await fetch(`${PREVIEW_URL}/api/auth/sign-up/email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: PREVIEW_URL,
    },
    body: JSON.stringify({
      email: weakEmail,
      password: '12345678', // Weak password
      name: 'Weak Pass Tester',
    }),
  });
  const weakData = await weakRes.json();
  console.log('Weak sign-up response status:', weakRes.status, 'body:', weakData);
  assert(weakRes.status === 400 && weakData.code === 'PASSWORD_TOO_WEAK', 'Weak password "12345678" rejected on live preview with 400', 'Password Security');

  // =========================================================================
  // TEST 2: Real Email Delivery & Registration Flow with Verified Mailbox
  // =========================================================================
  console.log('\n--- Test 2: Real Resend Delivery & Registration Flow ---');
  const regPassword = 'StrongPassword!2026#Secure';

  // 2.0 Clean any prior test records for TEST_EMAIL in isolated test DB
  await testSql`DELETE FROM accounts WHERE user_id IN (SELECT id FROM users WHERE email = ${TEST_EMAIL})`;
  await testSql`DELETE FROM sessions WHERE user_id IN (SELECT id FROM users WHERE email = ${TEST_EMAIL})`;
  await testSql`DELETE FROM users WHERE email = ${TEST_EMAIL}`;
  await testSql`DELETE FROM workspaces WHERE owner_email = ${TEST_EMAIL}`;
  await testSql`DELETE FROM verifications WHERE identifier LIKE ${'%' + TEST_EMAIL + '%'}`;
  console.log(`Cleaned prior test records for ${TEST_EMAIL} in isolated chorla_test DB`);

  // 2.1 Sign up with strong password
  const signUpRes = await fetch(`${PREVIEW_URL}/api/auth/sign-up/email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: PREVIEW_URL,
    },
    body: JSON.stringify({
      email: TEST_EMAIL,
      password: regPassword,
      name: 'Real Resend Tester',
    }),
  });
  const signUpCookies = signUpRes.headers.getSetCookie();
  console.log('Sign-up status:', signUpRes.status);
  assert(signUpRes.status === 200, 'User successfully registered via Better Auth on live preview', 'Registration');

  const sessionCookie = signUpCookies.find((c) => c.includes('better-auth.session_token='))?.split(';')[0];
  assert(Boolean(sessionCookie), 'Received session token cookie from Better Auth', 'Registration');

  // 2.2 Attempt to create company BEFORE email verification -> MUST BE 403
  const prematureReg = await fetch(`${PREVIEW_URL}/api/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: PREVIEW_URL,
      Cookie: sessionCookie!,
    },
    body: JSON.stringify({
      companyName: 'Premature Corp',
      niche: 'salon',
      ownerPhone: '+998901112233',
      plan: 'trial',
    }),
  });
  const prematureData = await prematureReg.json();
  console.log('Premature company registration status:', prematureReg.status, 'error:', prematureData.error);
  assert(prematureReg.status === 403, 'Company creation strictly forbidden for unverified email on live preview', 'Ownership Security');

  // 2.3 Send verification OTP code via real Resend transport
  const sendTime = Date.now();
  const sendOtpRes = await fetch(`${PREVIEW_URL}/api/auth/send-code`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: PREVIEW_URL,
      Cookie: sessionCookie!,
    },
  });
  console.log('Send verification code status:', sendOtpRes.status);
  assert(sendOtpRes.status === 200, 'Verification OTP request accepted and dispatched via real Resend', 'Email Verification');

  // 2.4 Retrieve the REAL OTP code from the delivered Resend email (NO DB spoofing/updating!)
  const realOtp = await getLatestDeliveredOTP(sendTime);
  assert(Boolean(realOtp && realOtp.length === 6), 'Received real 6-digit OTP code from Resend email', 'Real Email Delivery');

  // 2.5 Submit real OTP to verify-email endpoint
  const verifyRes = await fetch(`${PREVIEW_URL}/api/auth/verify-email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: PREVIEW_URL,
      Cookie: sessionCookie!,
    },
    body: JSON.stringify({ code: realOtp }),
  });
  const verifyData = await verifyRes.json();
  console.log('Verify email status:', verifyRes.status, 'data:', verifyData);
  assert(verifyRes.status === 200 && verifyData.success === true, 'Email successfully verified using real OTP from email', 'Real Email Verification');

  // 2.6 Verify in DB that Better Auth natively updated email_verified to true
  const dbUser = await testSql`SELECT email_verified FROM users WHERE email = ${TEST_EMAIL}`;
  assert(dbUser[0]?.email_verified === true, 'users.email_verified is organically true in chorla_test DB without manual updates', 'Email Verification');

  // =========================================================================
  // TEST 3: proxy.ts & Access without ai_os_workspace_id
  // =========================================================================
  console.log('\n--- Test 3: Proxy & Access Flow without ai_os_workspace_id ---');

  // 3.1 Authenticated session entering /dashboard without workspace cookie
  // Should NOT be redirected to /login by proxy.ts
  const dashboardRes = await fetch(`${PREVIEW_URL}/dashboard`, {
    method: 'GET',
    headers: {
      Origin: PREVIEW_URL,
      Cookie: sessionCookie!,
    },
    redirect: 'manual',
  });
  console.log('Dashboard response status with session only:', dashboardRes.status, 'location:', dashboardRes.headers.get('location'));
  const locationHeader = dashboardRes.headers.get('location') || '';
  assert(
    !locationHeader.includes('/login'),
    'proxy.ts allows authenticated Better Auth session through without ai_os_workspace_id (no bounce to /login)',
    'Proxy Routing'
  );

  // 3.2 Fetch settings before company created -> reports authenticated: true, hasWorkspace: false
  const settingsNoWsRes = await fetch(`${PREVIEW_URL}/api/workspace/settings`, {
    method: 'GET',
    headers: {
      Origin: PREVIEW_URL,
      Cookie: sessionCookie!,
    },
  });
  const settingsNoWsData = await settingsNoWsRes.json();
  console.log('Settings status without workspace:', settingsNoWsRes.status, settingsNoWsData);
  assert(
    settingsNoWsRes.status === 200 &&
    settingsNoWsData.authenticated === true &&
    settingsNoWsData.hasWorkspace === false,
    'Settings returns authenticated=true, hasWorkspace=false allowing smooth transition to /register?step=2',
    'Proxy & Onboarding'
  );

  // 3.3 Create company for verified user
  const companyRes = await fetch(`${PREVIEW_URL}/api/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: PREVIEW_URL,
      Cookie: sessionCookie!,
    },
    body: JSON.stringify({
      companyName: 'Chorla Real Beauty',
      niche: 'salon',
      ownerPhone: '+998901234567',
      plan: 'trial',
    }),
  });
  const companyData = await companyRes.json();
  const companyCookies = companyRes.headers.getSetCookie();
  console.log('Company creation status:', companyRes.status, 'success:', companyData.success);
  assert(companyRes.status === 200 && companyData.success === true, 'Company successfully created', 'Company Creation');

  const workspaceCookie = companyCookies.find((c) => c.includes('ai_os_workspace_id='))?.split(';')[0];
  assert(Boolean(workspaceCookie), 'Received ai_os_workspace_id cookie from company registration', 'Company Creation');

  // 3.4 Now simulate missing ai_os_workspace_id on an existing company owner (e.g. cookie dropped/cleared)
  // Request /api/workspace/settings with ONLY sessionCookie
  const autoRestoreRes = await fetch(`${PREVIEW_URL}/api/workspace/settings`, {
    method: 'GET',
    headers: {
      Origin: PREVIEW_URL,
      Cookie: sessionCookie!, // NO workspace cookie passed!
    },
  });
  const autoRestoreData = await autoRestoreRes.json();
  const autoRestoreCookies = autoRestoreRes.headers.getSetCookie();
  console.log('Auto-restore settings status:', autoRestoreRes.status, 'hasWorkspace:', autoRestoreData.hasWorkspace);
  assert(
    autoRestoreRes.status === 200 &&
    autoRestoreData.authenticated === true &&
    autoRestoreData.hasWorkspace === true &&
    autoRestoreData.workspace?.companyName === 'Chorla Real Beauty',
    'Workspace resolved by verified server session even when workspace cookie was missing',
    'Workspace Auto-Recovery'
  );

  const restoredWorkspaceCookie = autoRestoreCookies.find((c) => c.includes('ai_os_workspace_id='))?.split(';')[0];
  assert(Boolean(restoredWorkspaceCookie), 'Server automatically restored ai_os_workspace_id cookie on response', 'Workspace Auto-Recovery');

  // =========================================================================
  // TEST 4: Login Verification (Wrong vs Correct Password)
  // =========================================================================
  console.log('\n--- Test 4: Password Verification on Login ---');

  // 4.1 Wrong password login
  const wrongLogin = await fetch(`${PREVIEW_URL}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: PREVIEW_URL,
    },
    body: JSON.stringify({
      email: TEST_EMAIL,
      password: 'IncorrectPassword999!',
    }),
  });
  const wrongLoginData = await wrongLogin.json();
  console.log('Wrong password login status:', wrongLogin.status, 'error:', wrongLoginData.error);
  assert(wrongLogin.status === 401, 'Login with incorrect password rejected with 401', 'Login Security');

  // 4.2 Correct password login
  const correctLogin = await fetch(`${PREVIEW_URL}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: PREVIEW_URL,
    },
    body: JSON.stringify({
      email: TEST_EMAIL,
      password: regPassword,
    }),
  });
  const correctLoginData = await correctLogin.json();
  const loginCookies = correctLogin.headers.getSetCookie();
  console.log('Correct password login status:', correctLogin.status, 'success:', correctLoginData.success);
  assert(correctLogin.status === 200 && correctLoginData.success === true, 'Login with correct password succeeded with 200', 'Login Security');

  const newSessionCookie = loginCookies.find((c) => c.includes('better-auth.session_token='))?.split(';')[0];
  assert(Boolean(newSessionCookie), 'Received fresh better-auth session cookie on login', 'Session Security');

  // =========================================================================
  // TEST 5: Real Resend Delivery & Legacy Account Recovery Flow
  // =========================================================================
  console.log('\n--- Test 5: Real Resend Delivery & Legacy Account Recovery ---');

  // 5.0 Set up legacy workspace state: delete Better Auth user & credential account, leave workspace with legacy hash
  await testSql`DELETE FROM accounts WHERE user_id IN (SELECT id FROM users WHERE email = ${TEST_EMAIL})`;
  await testSql`DELETE FROM sessions WHERE user_id IN (SELECT id FROM users WHERE email = ${TEST_EMAIL})`;
  await testSql`DELETE FROM users WHERE email = ${TEST_EMAIL}`;
  await testSql`DELETE FROM verifications WHERE identifier LIKE ${'%' + TEST_EMAIL + '%'}`;
  await testSql`
    UPDATE workspaces 
    SET password_hash = 'hash_old_legacy_prototype_123', email_verified = false 
    WHERE owner_email = ${TEST_EMAIL}
  `;
  console.log(`Converted ${TEST_EMAIL} workspace to legacy prototype hash state`);

  // 5.1 Try normal login as legacy user -> rejected with NEED_PASSWORD_SETUP
  const legLogin = await fetch(`${PREVIEW_URL}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: PREVIEW_URL,
    },
    body: JSON.stringify({ email: TEST_EMAIL, password: 'AnyPassword123!' }),
  });
  const legLoginData = await legLogin.json();
  console.log('Legacy login response:', legLogin.status, legLoginData);
  assert(
    legLoginData.code === 'NEED_PASSWORD_SETUP',
    'Legacy user login redirects to recovery with NEED_PASSWORD_SETUP',
    'Legacy Recovery'
  );

  // 5.2 Request recovery code via real Resend transport
  const recoverySendTime = Date.now();
  const sendRecoveryRes = await fetch(`${PREVIEW_URL}/api/auth/recover/send-code`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: PREVIEW_URL,
    },
    body: JSON.stringify({ email: TEST_EMAIL }),
  });
  const sendRecoveryData = await sendRecoveryRes.json();
  console.log('Send recovery code status:', sendRecoveryRes.status, 'success:', sendRecoveryData.success);
  assert(sendRecoveryRes.status === 200 && sendRecoveryData.success === true, 'Recovery code requested', 'Legacy Recovery');

  // 5.3 Retrieve REAL recovery OTP from the delivered Resend email (NO DB manipulation!)
  const realRecoveryOtp = await getLatestDeliveredOTP(recoverySendTime);
  assert(Boolean(realRecoveryOtp && realRecoveryOtp.length === 6), 'Received real 6-digit recovery OTP from Resend email', 'Legacy Recovery');

  // 5.4 Try wrong OTP -> 400
  const wrongRecoveryRes = await fetch(`${PREVIEW_URL}/api/auth/recover/reset-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: PREVIEW_URL,
    },
    body: JSON.stringify({
      email: TEST_EMAIL,
      code: '000000',
      newPassword: 'BrandNewSecurePassword!2026#',
    }),
  });
  console.log('Wrong recovery OTP status:', wrongRecoveryRes.status);
  assert(wrongRecoveryRes.status === 400, 'Wrong OTP rejected with 400', 'Legacy Recovery');

  // 5.5 Redeem with REAL recovery OTP from email
  const newPassword = 'BrandNewSecurePassword!2026#';
  const correctRecoveryRes = await fetch(`${PREVIEW_URL}/api/auth/recover/reset-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: PREVIEW_URL,
    },
    body: JSON.stringify({
      email: TEST_EMAIL,
      code: realRecoveryOtp,
      newPassword,
    }),
  });
  const correctRecoveryData = await correctRecoveryRes.json();
  const recoveryCookies = correctRecoveryRes.headers.getSetCookie();
  console.log('Correct recovery OTP status:', correctRecoveryRes.status, 'success:', correctRecoveryData.success);
  assert(correctRecoveryRes.status === 200 && correctRecoveryData.success === true, 'Password reset succeeded using real OTP from email', 'Legacy Recovery');

  // Verify workspace updated to managed-by-auth in chorla_test DB
  const updatedWs = await testSql`SELECT password_hash, email_verified FROM workspaces WHERE owner_email = ${TEST_EMAIL}`;
  assert(updatedWs[0].password_hash === 'managed-by-auth' && updatedWs[0].email_verified === true, 'Workspace marked managed-by-auth and email_verified=true', 'Legacy Recovery');

  // 5.6 Login with the brand new password
  const newLogin = await fetch(`${PREVIEW_URL}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: PREVIEW_URL,
    },
    body: JSON.stringify({
      email: TEST_EMAIL,
      password: newPassword,
    }),
  });
  const newLoginData = await newLogin.json();
  const postResetCookies = newLogin.headers.getSetCookie();
  console.log('Login with new password status:', newLogin.status, 'hasWorkspace:', newLoginData.hasWorkspace);
  assert(newLogin.status === 200 && newLoginData.hasWorkspace === true, 'Migrated legacy owner successfully logged in with new password', 'Legacy Recovery');

  const activeSessionCookie = postResetCookies.find((c) => c.includes('better-auth.session_token='))?.split(';')[0];
  const activeWorkspaceCookie = postResetCookies.find((c) => c.includes('ai_os_workspace_id='))?.split(';')[0];
  assert(Boolean(activeSessionCookie), 'Obtained active session cookie after password recovery', 'Session Security');

  // =========================================================================
  // TEST 6: Logout Flow & Verification that Revoked Session CANNOT Access Data
  // =========================================================================
  console.log('\n--- Test 6: Logout & Session Revocation Verification ---');

  // 6.1 Save session cookie before logout
  const savedStaleSessionCookie = activeSessionCookie!;
  const authHeaders = {
    Origin: PREVIEW_URL,
    Cookie: `${activeSessionCookie}; ${activeWorkspaceCookie}`,
  };

  // 6.2 Execute logout
  const logoutRes = await fetch(`${PREVIEW_URL}/api/auth/logout`, {
    method: 'POST',
    headers: authHeaders,
  });
  const logoutData = await logoutRes.json();
  const logoutCookies = logoutRes.headers.getSetCookie();
  console.log('Logout status:', logoutRes.status, 'success:', logoutData.success);
  assert(logoutRes.status === 200 && logoutData.success === true, 'Logout API succeeded', 'Logout');

  // Verify cookies were cleared (max-age=0 or expires in past)
  const clearedSession = logoutCookies.some((c) => c.includes('better-auth.session_token=') && (c.includes('Max-Age=0') || c.toLowerCase().includes('expires=')));
  const clearedWorkspace = logoutCookies.some((c) => c.includes('ai_os_workspace_id=') && (c.includes('Max-Age=0') || c.toLowerCase().includes('expires=')));
  assert(clearedSession && clearedWorkspace, 'Session and workspace cookies cleared on logout', 'Logout');

  // 6.3 CRITICAL: Verify that the saved old session CANNOT access protected data
  const staleAccessRes = await fetch(`${PREVIEW_URL}/api/workspace/settings`, {
    method: 'GET',
    headers: {
      Origin: PREVIEW_URL,
      Cookie: savedStaleSessionCookie,
    },
  });
  const staleAccessData = await staleAccessRes.json();
  console.log('Stale session access status:', staleAccessRes.status, 'authenticated:', staleAccessData.authenticated);
  assert(
    staleAccessRes.status === 401 && staleAccessData.authenticated === false,
    'Revoked session strictly DENIED access to protected data with 401 Unauthorized',
    'Session Revocation'
  );

  // Also verify /api/leads with stale session
  const staleLeadsRes = await fetch(`${PREVIEW_URL}/api/leads`, {
    method: 'GET',
    headers: {
      Origin: PREVIEW_URL,
      Cookie: savedStaleSessionCookie,
    },
  });
  console.log('Stale session leads access status:', staleLeadsRes.status);
  assert(
    staleLeadsRes.status === 401 || staleLeadsRes.status === 404,
    'Revoked session cannot access leads endpoint',
    'Session Revocation'
  );

  // =========================================================================
  // TEST 7: Google OAuth Flow Initiation & Callback URL Verification
  // =========================================================================
  console.log('\n--- Test 7: Google OAuth Endpoint Verification ---');
  const googleAuthRes = await fetch(`${PREVIEW_URL}/api/auth/sign-in/social`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: PREVIEW_URL,
    },
    body: JSON.stringify({
      provider: 'google',
      callbackURL: `${PREVIEW_URL}/dashboard`,
    }),
  });
  const googleAuthData = await googleAuthRes.json();
  console.log('Google OAuth initiation response:', googleAuthRes.status, googleAuthData);
  assert(
    Boolean(googleAuthData.url && googleAuthData.url.includes('accounts.google.com')),
    'Google OAuth initiation endpoint redirects to accounts.google.com',
    'Google OAuth'
  );

  const googleRedirectUrl = new URL(googleAuthData.url);
  const actualRedirectUri = googleRedirectUrl.searchParams.get('redirect_uri');
  console.log('Google OAuth client_id configured:', Boolean(googleRedirectUrl.searchParams.get('client_id')));
  console.log('Google OAuth redirect_uri:', actualRedirectUri);
  assert(
    actualRedirectUri === `${PREVIEW_URL}/api/auth/callback/google`,
    `Google OAuth redirect_uri dynamically matches current preview: ${actualRedirectUri}`,
    'Google OAuth'
  );

  console.log('\n🎉 ALL LIVE PREVIEW VERIFICATION CHECKS (INCLUDING REAL RESEND DELIVERY & RECOVERY) PASSED WITH 100% SUCCESS!');
}

runPreviewVerification().catch((err) => {
  console.error('\n❌ Preview verification failed:', err);
  process.exit(1);
});
