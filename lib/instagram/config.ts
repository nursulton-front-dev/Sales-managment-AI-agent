import crypto from 'crypto';

/**
 * Supported Meta Instagram Graph API Version
 * Fixed and locked across all integrations according to Meta documentation.
 */
export const INSTAGRAM_GRAPH_API_VERSION = 'v21.0';
export const INSTAGRAM_GRAPH_BASE_URL = `https://graph.instagram.com/${INSTAGRAM_GRAPH_API_VERSION}`;
export const META_GRAPH_BASE_URL = `https://graph.facebook.com/${INSTAGRAM_GRAPH_API_VERSION}`;

/**
 * Required Instagram permissions according to specification:
 * - instagram_business_basic
 * - instagram_business_manage_messages
 */
export const INSTAGRAM_SCOPES = [
  'instagram_business_basic',
  'instagram_business_manage_messages',
].join(',');

// Encryption key for securing tokens at rest (AES-256-GCM)
function getDerivedKey(): Buffer {
  const secret = process.env.INSTAGRAM_TOKEN_ENCRYPTION_KEY || process.env.BETTER_AUTH_SECRET;
  if (!secret || secret.length < 32) throw new Error('Настройте секрет шифрования Instagram длиной от 32 символов');
  return crypto.createHash('sha256').update(secret).digest();
}

/**
 * Encrypt sensitive tokens using AES-256-GCM
 */
export function encryptToken(plainText: string): string {
  if (!plainText) return '';
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getDerivedKey(), iv);
  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypt sensitive tokens using AES-256-GCM
 */
export function decryptToken(encryptedPayload: string): string {
  if (!encryptedPayload) return '';
  try {
    const parts = encryptedPayload.split(':');
    if (parts.length !== 3) {
      // In case it was stored unencrypted during initial migration
      return encryptedPayload;
    }
    const [ivHex, authTagHex, encryptedText] = parts;
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      getDerivedKey(),
      Buffer.from(ivHex, 'hex')
    );
    decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    console.error('Failed to decrypt token:', err);
    return '';
  }
}

/**
 * Verify Meta Webhook SHA256 Signature (X-Hub-Signature-256)
 */
export function verifyMetaSignature(
  rawBody: string | Buffer,
  signatureHeader: string | null | undefined,
  appSecret: string
): boolean {
  if (!signatureHeader || !appSecret) return false;
  
  // Format: "sha256=<hex>"
  const parts = signatureHeader.split('=');
  if (parts.length !== 2 || parts[0] !== 'sha256') {
    return false;
  }
  const expectedHash = parts[1];

  const hmac = crypto.createHmac('sha256', appSecret);
  hmac.update(rawBody);
  const calculatedHash = hmac.digest('hex');

  // Constant-time buffer comparison to prevent timing attacks
  const expectedBuffer = Buffer.from(expectedHash, 'hex');
  const calculatedBuffer = Buffer.from(calculatedHash, 'hex');

  if (expectedBuffer.length !== calculatedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, calculatedBuffer);
}

/**
 * Generate cryptographically secure state with HMAC signature
 */
export function createOAuthState(workspaceId: string, userId?: string): string {
  const payload = JSON.stringify({
    workspaceId,
    userId: userId || 'admin',
    timestamp: Date.now(),
    nonce: crypto.randomBytes(8).toString('hex'),
  });
  const encoded = Buffer.from(payload).toString('base64url');
  const signature = crypto
    .createHmac('sha256', getDerivedKey())
    .update(encoded)
    .digest('base64url');
  return `${encoded}.${signature}`;
}

/**
 * Validate OAuth state and extract verified workspaceId
 */
export function verifyOAuthState(stateString: string): { valid: boolean; workspaceId?: string; userId?: string } {
  try {
    const [encoded, signature] = stateString.split('.');
    if (!encoded || !signature) return { valid: false };

    const expectedSignature = crypto
      .createHmac('sha256', getDerivedKey())
      .update(encoded)
      .digest('base64url');

    const sigBuf = Buffer.from(signature);
    const expectedSigBuf = Buffer.from(expectedSignature);

    if (sigBuf.length !== expectedSigBuf.length) {
      return { valid: false };
    }

    if (!crypto.timingSafeEqual(sigBuf, expectedSigBuf)) {
      return { valid: false };
    }

    const payloadJson = Buffer.from(encoded, 'base64url').toString('utf8');
    const data = JSON.parse(payloadJson);

    // State expires after 15 minutes
    if (Date.now() - data.timestamp > 15 * 60 * 1000) {
      return { valid: false };
    }

    return {
      valid: true,
      workspaceId: data.workspaceId,
      userId: data.userId,
    };
  } catch {
    return { valid: false };
  }
}
