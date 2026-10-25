import { NextRequest, NextResponse, connection } from 'next/server';
import crypto from 'crypto';
import { getWorkspaceByInstagramUserId, updateWorkspace } from '@/src/db';

/**
 * Meta Data Deletion Request Callback
 * When a user removes our app via Facebook/Instagram settings, Meta sends a signed_request
 * to this endpoint. We parse it, delete the user tokens, and return a confirmation code and status URL.
 */
export async function POST(req: NextRequest) {
  await connection();
  try {
    const formData = await req.formData();
    const signedRequest = formData.get('signed_request') as string;

    const appSecret = process.env.INSTAGRAM_APP_SECRET;
    if (!signedRequest || !appSecret) {
      return NextResponse.json({ error: 'Missing signed_request or secret' }, { status: 400 });
    }

    const [encodedSig, payload] = signedRequest.split('.');
    const expectedSig = crypto
      .createHmac('sha256', appSecret)
      .update(payload)
      .digest('base64url');

    if (encodedSig !== expectedSig) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
    }

    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    const userId = data.user_id;

    if (userId) {
      const ws = await getWorkspaceByInstagramUserId(userId);
      if (ws) {
        await updateWorkspace(ws.id, {
          instagramConnected: false,
          instagramAccessToken: null,
          instagramStatus: 'disconnected',
          instagramAutoReply: false,
          instagramLastError: 'User deleted app connection in Meta settings',
        });
      }
    }

    const confirmationCode = `del_${Date.now()}_${userId || 'anon'}`;
    const statusUrl = `https://chorla-ai.vercel.app/data-deletion?confirmation_code=${confirmationCode}`;

    return NextResponse.json({
      url: statusUrl,
      confirmation_code: confirmationCode,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
