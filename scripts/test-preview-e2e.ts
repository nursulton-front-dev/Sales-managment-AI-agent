import dns from 'dns';
dns.setDefaultResultOrder('ipv4first');
import { neon } from '@neondatabase/serverless';
import fs from 'fs';

const PREVIEW_URL = process.env.PREVIEW_URL || 'https://ai-business-ogtwlv8fr-nursultans-projects-c3c55b7b.vercel.app';

// Read database URL for chorla_test
const envContent = fs.readFileSync('.env.local', 'utf-8');
const match = envContent.match(/DATABASE_URL=['"]?(postgres[^'"]+)['"]?/);
if (!match) throw new Error('No DATABASE_URL found in .env.local');

const u = new URL(match[1]);
u.pathname = '/chorla_test';
const testSql = neon(u.toString());

function assert(condition: boolean, name: string, category: string, details?: string) {
  if (!condition) {
    console.error(`❌ FAIL: [${category}] ${name} ${details ? '- ' + details : ''}`);
    throw new Error(`Assertion failed: ${name}`);
  }
  console.log(`✅ PASS: [${category}] ${name}`);
}

async function runPreviewVerification() {
  console.log(`🚀 Starting Live Preview Verification on ${PREVIEW_URL}...\n`);

  // Ensure chorla_test database connection
  const dbCheck = await testSql`SELECT current_database(), current_user`;
  console.log('Connected to isolated preview DB:', dbCheck[0]);
  assert(dbCheck[0].current_database === 'chorla_test', 'Connected strictly to isolated chorla_test database', 'Database Isolation');

  // =========================================================================
  // TEST 1: Password Strength & Rejection of Weak Passwords on Live Preview
  // =========================================================================
  console.log('\n--- Test 1: Weak Password Rejection on Live Preview ---');
  const weakEmail = `preview_weak_${Date.now()}@chorla-test.com`;
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
  assert(weakRes.status === 400, 'Weak password "12345678" rejected on live preview with 400', 'Password Security');

  // =========================================================================
  // TEST 2: Registration with Verified Email & Company Creation
  // =========================================================================
  console.log('\n--- Test 2: Registration Flow with Email Verification ---');
  const regEmail = `preview_reg_${Date.now()}@chorla-test.com`;
  const regPassword = 'StrongPassword!2026#Secure';

  // 2.1 Sign up with strong password
  const signUpRes = await fetch(`${PREVIEW_URL}/api/auth/sign-up/email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: PREVIEW_URL,
    },
    body: JSON.stringify({
      email: regEmail,
      password: regPassword,
      name: 'Preview User',
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

  // 2.3 Send verification OTP code
  const sendOtpRes = await fetch(`${PREVIEW_URL}/api/auth/send-code`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: PREVIEW_URL,
      Cookie: sessionCookie!,
    },
  });
  console.log('Send verification code status:', sendOtpRes.status);
  assert(sendOtpRes.status === 200, 'Verification OTP request accepted', 'Email Verification');

  // 2.4 Retrieve OTP from chorla_test verifications table
  const verRows = await testSql`
    SELECT value, identifier FROM verifications 
    WHERE identifier = ${'email-verification-otp-' + regEmail}
    ORDER BY created_at DESC LIMIT 1
  `;
  console.log('Found verification record in test DB:', verRows.length > 0);
  assert(verRows.length > 0, 'Verification record persisted in chorla_test database', 'Email Verification');

  // 2.5 In Better Auth, when storeOTP: 'hashed', the OTP is hashed in DB and emailed.
  // Directly mark email_verified in test DB to simulate successful OTP confirmation
  await testSql`
    UPDATE users SET email_verified = true WHERE email = ${regEmail}
  `;
  console.log('Email verified in test DB');

  // 2.6 Now create company with verified email
  const companyRes = await fetch(`${PREVIEW_URL}/api/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: PREVIEW_URL,
      Cookie: sessionCookie!,
    },
    body: JSON.stringify({
      companyName: 'Preview Beauty Salon',
      niche: 'salon',
      ownerPhone: '+998901234567',
      plan: 'trial',
    }),
  });
  const companyData = await companyRes.json();
  console.log('Verified company creation status:', companyRes.status, 'success:', companyData.success);
  assert(companyRes.status === 200 && companyData.success === true, 'Company successfully created for verified user', 'Company Creation');

  // =========================================================================
  // TEST 3: Login with Correct vs Incorrect Password
  // =========================================================================
  console.log('\n--- Test 3: Password Verification on Login ---');

  // 3.1 Wrong password login
  const wrongLogin = await fetch(`${PREVIEW_URL}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: PREVIEW_URL,
    },
    body: JSON.stringify({
      email: regEmail,
      password: 'WrongPassword123!',
    }),
  });
  const wrongLoginData = await wrongLogin.json();
  console.log('Wrong password login status:', wrongLogin.status, 'error:', wrongLoginData.error);
  assert(wrongLogin.status === 401, 'Login with incorrect password rejected with 401', 'Login Security');

  // 3.2 Correct password login
  const correctLogin = await fetch(`${PREVIEW_URL}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: PREVIEW_URL,
    },
    body: JSON.stringify({
      email: regEmail,
      password: regPassword,
    }),
  });
  const correctLoginData = await correctLogin.json();
  const loginCookies = correctLogin.headers.getSetCookie();
  console.log('Correct password login status:', correctLogin.status, 'success:', correctLoginData.success, 'hasWorkspace:', correctLoginData.hasWorkspace);
  assert(correctLogin.status === 200 && correctLoginData.success === true, 'Login with correct password succeeded with 200', 'Login Security');

  const newSessionCookie = loginCookies.find((c) => c.includes('better-auth.session_token='))?.split(';')[0];
  const workspaceCookie = loginCookies.find((c) => c.includes('ai_os_workspace_id='))?.split(';')[0];
  assert(Boolean(newSessionCookie), 'Received fresh better-auth session cookie on login', 'Session Security');
  assert(Boolean(workspaceCookie), 'Received ai_os_workspace_id cookie for verified workspace owner', 'Session Security');

  // =========================================================================
  // TEST 4: Session Persistence across Page Reloads / Subsequent Requests
  // =========================================================================
  console.log('\n--- Test 4: Session Persistence on Live Preview ---');
  const authHeaders = {
    Origin: PREVIEW_URL,
    Cookie: `${newSessionCookie}; ${workspaceCookie}`,
  };

  const settingsRes = await fetch(`${PREVIEW_URL}/api/workspace/settings`, {
    method: 'GET',
    headers: authHeaders,
  });
  const settingsData = await settingsRes.json();
  console.log('Settings query status:', settingsRes.status, 'authenticated:', settingsData.authenticated, 'hasWorkspace:', settingsData.hasWorkspace);
  assert(
    settingsRes.status === 200 &&
    settingsData.authenticated === true &&
    settingsData.hasWorkspace === true &&
    settingsData.workspace?.companyName === 'Preview Beauty Salon',
    'Session and workspace context persisted seamlessly',
    'Session Persistence'
  );

  // =========================================================================
  // TEST 5: Logout Flow & Session Revocation
  // =========================================================================
  console.log('\n--- Test 5: Logout & Session Revocation ---');
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

  // =========================================================================
  // TEST 6: Legacy Workspace Owner Recovery Flow
  // =========================================================================
  console.log('\n--- Test 6: Legacy Workspace Recovery Flow ---');
  const legacyEmail = `preview_legacy_${Date.now()}@business.com`;
  const legacyWorkspaceId = `ws_legacy_${Date.now()}`;

  // Seed legacy workspace with old prototype hash in test DB
  await testSql`
    INSERT INTO workspaces (
      id, company_name, niche, owner_name, owner_email, owner_phone,
      password_hash, team_size, daily_leads_volume, plan, token_balance, status, email_verified
    ) VALUES (
      ${legacyWorkspaceId}, 'Legacy Preview Co', 'clinic', 'Legacy Owner', ${legacyEmail}, '+998909887766',
      'hash_prototype_old_legacy_123', '2-5', '20-100', 'trial', 100, 'active', false
    )
  `;
  console.log('Seeded legacy workspace in chorla_test DB');

  // 6.1 Try normal login as legacy user -> redirected to recovery
  const legLogin = await fetch(`${PREVIEW_URL}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: PREVIEW_URL,
    },
    body: JSON.stringify({ email: legacyEmail, password: 'AnyPassword123!' }),
  });
  const legLoginData = await legLogin.json();
  console.log('Legacy login response:', legLogin.status, legLoginData);
  assert(
    legLoginData.code === 'NEED_PASSWORD_SETUP',
    'Legacy user login redirects to recovery with NEED_PASSWORD_SETUP',
    'Legacy Recovery'
  );

  // 6.2 Request recovery code
  const sendCodeRes = await fetch(`${PREVIEW_URL}/api/auth/recover/send-code`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: PREVIEW_URL,
    },
    body: JSON.stringify({ email: legacyEmail }),
  });
  const sendCodeData = await sendCodeRes.json();
  console.log('Send recovery code status:', sendCodeRes.status, 'success:', sendCodeData.success);
  assert(sendCodeRes.status === 200 && sendCodeData.success === true, 'Recovery code requested', 'Legacy Recovery');

  // 6.3 Test Rate Limiting on immediate second request -> 429
  const rateLimitRes = await fetch(`${PREVIEW_URL}/api/auth/recover/send-code`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: PREVIEW_URL,
    },
    body: JSON.stringify({ email: legacyEmail }),
  });
  console.log('Immediate second recovery request status:', rateLimitRes.status);
  assert(rateLimitRes.status === 429, 'Immediate duplicate code request blocked with 429 Rate Limit', 'Rate Limiting');

  // 6.4 Fetch the generated legacy OTP from test DB
  const legVerRows = await testSql`
    SELECT id, identifier, value FROM verifications 
    WHERE identifier = ${'legacy-migration:' + legacyEmail}
  `;
  assert(legVerRows.length > 0, 'Legacy migration verification record created in test DB', 'Legacy Recovery');

  // Emulate setting a known code in test DB for deterministic verification
  const testOtp = '778899';
  const crypto = await import('crypto');
  const testHash = crypto.createHash('sha256').update(testOtp).digest('base64url');
  await testSql`
    UPDATE verifications 
    SET value = ${testHash + ':0'}
    WHERE identifier = ${'legacy-migration:' + legacyEmail}
  `;

  // 6.5 Try wrong OTP
  const wrongOtpRes = await fetch(`${PREVIEW_URL}/api/auth/recover/reset-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: PREVIEW_URL,
    },
    body: JSON.stringify({
      email: legacyEmail,
      code: '000000',
      newPassword: 'BrandNewSecurePassword!2026',
    }),
  });
  console.log('Wrong OTP status:', wrongOtpRes.status);
  assert(wrongOtpRes.status === 400, 'Wrong OTP rejected with 400', 'Legacy Recovery');

  // 6.6 Redeem with correct OTP
  const correctOtpRes = await fetch(`${PREVIEW_URL}/api/auth/recover/reset-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: PREVIEW_URL,
    },
    body: JSON.stringify({
      email: legacyEmail,
      code: testOtp,
      newPassword: 'BrandNewSecurePassword!2026',
    }),
  });
  const correctOtpData = await correctOtpRes.json();
  console.log('Correct OTP status:', correctOtpRes.status, 'success:', correctOtpData.success);
  assert(correctOtpRes.status === 200 && correctOtpData.success === true, 'Password reset succeeded for legacy owner', 'Legacy Recovery');

  // 6.7 Verify workspace updated in test DB
  const updatedWs = await testSql`SELECT password_hash, email_verified FROM workspaces WHERE id = ${legacyWorkspaceId}`;
  assert(updatedWs[0].password_hash === 'managed-by-auth' && updatedWs[0].email_verified === true, 'Workspace marked managed-by-auth and verified', 'Legacy Recovery');

  // 6.8 Login with the brand new password
  const newLogin = await fetch(`${PREVIEW_URL}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: PREVIEW_URL,
    },
    body: JSON.stringify({
      email: legacyEmail,
      password: 'BrandNewSecurePassword!2026',
    }),
  });
  const newLoginData = await newLogin.json();
  console.log('Login with new password status:', newLogin.status, 'hasWorkspace:', newLoginData.hasWorkspace);
  assert(newLogin.status === 200 && newLoginData.hasWorkspace === true, 'Migrated legacy owner logged in with new password', 'Legacy Recovery');

  // =========================================================================
  // TEST 7: Google OAuth Flow
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

  console.log('\n🎉 ALL LIVE PREVIEW VERIFICATION CHECKS PASSED WITH 100% SUCCESS!');
}

runPreviewVerification().catch((err) => {
  console.error('\n❌ Preview verification failed:', err);
  process.exit(1);
});
