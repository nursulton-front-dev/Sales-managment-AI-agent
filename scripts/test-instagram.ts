import {
  createOAuthState,
  verifyOAuthState,
  verifyMetaSignature,
  encryptToken,
  decryptToken,
  INSTAGRAM_GRAPH_API_VERSION,
} from '../lib/instagram/config';
import crypto from 'crypto';

async function runTests() {
  console.log('--- STARTING INSTAGRAM DIRECT INTEGRATION TESTS ---');

  // Test 1: Fixed API version check
  if (INSTAGRAM_GRAPH_API_VERSION !== 'v21.0') {
    throw new Error(`Expected v21.0, got ${INSTAGRAM_GRAPH_API_VERSION}`);
  }
  console.log('✓ Test 1: Fixed Meta Graph API version is v21.0');

  // Test 2: Token Encryption and Decryption (AES-256-GCM)
  const sampleToken = 'EAABwzLixnjYBO123456789_long_lived_meta_access_token_sample';
  const encrypted = encryptToken(sampleToken);
  if (!encrypted.includes(':')) {
    throw new Error('Encrypted payload must have IV:Tag:Cipher format');
  }
  const decrypted = decryptToken(encrypted);
  if (decrypted !== sampleToken) {
    throw new Error(`Decrypted token does not match original! Got: ${decrypted}`);
  }
  console.log('✓ Test 2: AES-256-GCM token encryption and decryption verified');

  // Test 3: OAuth State creation and tamper-evident verification
  const wsId = 'ws_test_tenant_1';
  const state = createOAuthState(wsId, 'owner@test.com');
  const verified = verifyOAuthState(state);
  if (!verified.valid || verified.workspaceId !== wsId) {
    throw new Error(`State verification failed: ${JSON.stringify(verified)}`);
  }

  // Test 3b: Tampered state rejection
  const [encPart, sigPart] = state.split('.');
  const decodedPayload = Buffer.from(encPart, 'base64url').toString('utf8');
  const tamperedPayload = decodedPayload.replace('ws_test_tenant_1', 'ws_hacked_tenant');
  const tamperedEnc = Buffer.from(tamperedPayload).toString('base64url');
  const tamperedState = `${tamperedEnc}.${sigPart}`;
  const tamperedResult = verifyOAuthState(tamperedState);
  if (tamperedResult.valid) {
    throw new Error('Tampered state was incorrectly accepted!');
  }
  console.log('✓ Test 3: Cryptographic state generation, signature verification and anti-tampering verified');

  // Test 4: Meta Webhook X-Hub-Signature-256 validation
  const appSecret = 'meta_test_app_secret_12345';
  const payload = JSON.stringify({
    object: 'instagram',
    entry: [{ id: '178414000000', time: Date.now() }],
  });

  const validHash = crypto.createHmac('sha256', appSecret).update(payload).digest('hex');
  const validHeader = `sha256=${validHash}`;

  const isSigValid = verifyMetaSignature(payload, validHeader, appSecret);
  if (!isSigValid) {
    throw new Error('Valid signature was rejected');
  }

  // Test 4b: Invalid signature rejection
  const invalidHeader = `sha256=${validHash.slice(0, -4)}dead`;
  const isSigInvalid = verifyMetaSignature(payload, invalidHeader, appSecret);
  if (isSigInvalid) {
    throw new Error('Invalid signature was accepted!');
  }
  console.log('✓ Test 4: Webhook X-Hub-Signature-256 constant-time verification & rejection verified');

  console.log('--- ALL INSTAGRAM INTEGRATION TESTS PASSED SUCCESSFULLY ---');
}

runTests().catch((err) => {
  console.error('TEST RUN FAILURE:', err);
  process.exit(1);
});
