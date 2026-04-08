import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import { logAuditEvent, getClientIp } from '@/lib/db/audit-log';
import { supabaseAdmin } from '@/lib/db/supabase';
import { logger } from '@/lib/logger';

const TokenSchema = z.object({
  userId: z.string().min(1),
  role: z.string().min(1),
  roomId: z.string().optional(),
  roomName: z.string().max(100).optional(),
  anonymous: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const accessKey = process.env.NEXT_PUBLIC_100MS_ACCESS_KEY;
    const appSecret = process.env.HMS_APP_SECRET;
    const templateId = process.env.NEXT_PUBLIC_100MS_TEMPLATE_ID || '';

    if (!accessKey || !appSecret) {
      logger.error('100ms keys missing');
      return NextResponse.json({ error: '100ms configuration missing' }, { status: 500 });
    }

    const body = await req.json();
    const parsed = TokenSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
    }

    const { userId, role, roomId, roomName, anonymous } = parsed.data;

    // Allow anonymous listeners - no auth required for listen-only mode
    if (role === 'listener' && anonymous) {
      // Generate management token to find/create room
      const mgmtToken = jwt.sign(
        {
          access_key: accessKey,
          type: 'management',
          version: 2,
          iat: Math.floor(Date.now() / 1000),
          nbf: Math.floor(Date.now() / 1000),
        },
        appSecret,
        { algorithm: 'HS256', expiresIn: '4h', jwtid: crypto.randomUUID() }
      );

      let hmsRoomId = roomId;
      const targetRoomName = roomName || 'zao-live-room';

      if (!hmsRoomId) {
        const listRes = await fetch('https://api.100ms.live/v2/rooms', {
          headers: { Authorization: `Bearer ${mgmtToken}` },
        });
        const rooms = await listRes.json();
        const existing = rooms?.data?.find((r: { name: string }) => r.name === targetRoomName);
        if (existing) {
          hmsRoomId = existing.id;
        } else {
          // Anonymous listeners cannot create rooms - room must already exist
          return NextResponse.json({ error: 'Room not found' }, { status: 404 });
        }
      }

      // Generate listener-only app token with shorter expiry (4 hours)
      const anonToken = jwt.sign(
        {
          access_key: accessKey,
          room_id: hmsRoomId,
          user_id: userId,
          role: 'listener', // Always listener - never allow escalation
          type: 'app',
          version: 2,
          iat: Math.floor(Date.now() / 1000),
          nbf: Math.floor(Date.now() / 1000),
        },
        appSecret,
        { algorithm: 'HS256', expiresIn: '4h', jwtid: crypto.randomUUID() }
      );

      // Audit log anonymous token (no fid available)
      logAuditEvent({
        actorFid: 0,
        action: '100ms.token.generate.anonymous',
        targetType: 'user',
        targetId: userId,
        details: { userId, role: 'listener', roomId: hmsRoomId, anonymous: true },
        ipAddress: getClientIp(req),
      });

      return NextResponse.json({ token: anonToken, roomId: hmsRoomId });
    }

    // Auth guard — prevent unauthenticated token minting for non-anonymous requests
    const { getSessionData } = await import('@/lib/auth/session');
    const session = await getSessionData();
    if (!session?.fid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify requested userId matches session user's FID
    if (userId !== String(session.fid)) {
      return NextResponse.json({ error: 'Forbidden: cannot generate token for another user' }, { status: 403 });
    }

    // Role validation — downgrade moderator/host to speaker if not verified host
    let effectiveRole = role;
    if (role === 'host' || role === 'moderator') {
      let isFishbowlHost = false;
      if (roomName?.startsWith('fishbowl-')) {
        const slug = roomName.replace('fishbowl-', '');
        const { data: fishbowlRoom } = await supabaseAdmin
          .from('fishbowl_rooms')
          .select('host_fid')
          .or(`slug.eq.${slug},id.eq.${roomId || '00000000-0000-0000-0000-000000000000'}`)
          .single();
        isFishbowlHost = fishbowlRoom?.host_fid === session.fid;
      }
      if (!session.isAdmin && !isFishbowlHost) {
        // Downgrade to speaker instead of blocking - user can still participate
        effectiveRole = 'speaker';
      }
    }

    // Generate management token
    const managementToken = jwt.sign(
      {
        access_key: accessKey,
        type: 'management',
        version: 2,
        iat: Math.floor(Date.now() / 1000),
        nbf: Math.floor(Date.now() / 1000),
      },
      appSecret,
      { algorithm: 'HS256', expiresIn: '24h', jwtid: crypto.randomUUID() }
    );

    // Find or create room — use roomName for per-fishbowl rooms, fallback to default
    let hmsRoomId = roomId;
    const targetRoomName = roomName || 'zao-live-room';

    if (!hmsRoomId) {
      const listRes = await fetch('https://api.100ms.live/v2/rooms', {
        headers: { Authorization: `Bearer ${managementToken}` },
      });
      const rooms = await listRes.json();
      const existing = rooms?.data?.find((r: { name: string }) => r.name === targetRoomName);

      if (existing) {
        hmsRoomId = existing.id;
      } else {
        const createRes = await fetch('https://api.100ms.live/v2/rooms', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${managementToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: targetRoomName,
            description: roomName ? `FISHBOWLZ: ${targetRoomName}` : 'ZAO OS Live Audio Room',
            template_id: templateId,
            region: 'us',
          }),
        });
        const created = await createRes.json();
        hmsRoomId = created.id;
      }
    }

    // Generate app token for user
    const appToken = jwt.sign(
      {
        access_key: accessKey,
        room_id: hmsRoomId,
        user_id: userId,
        role: effectiveRole,
        type: 'app',
        version: 2,
        iat: Math.floor(Date.now() / 1000),
        nbf: Math.floor(Date.now() / 1000),
      },
      appSecret,
      { algorithm: 'HS256', expiresIn: '24h', jwtid: crypto.randomUUID() }
    );

    // Audit log token generation
    logAuditEvent({
      actorFid: session.fid,
      action: '100ms.token.generate',
      targetType: 'user',
      targetId: userId,
      details: { userId, role: effectiveRole, roomId: hmsRoomId },
      ipAddress: getClientIp(req),
    });

    return NextResponse.json({ token: appToken, roomId: hmsRoomId });
  } catch (error) {
    logger.error('100ms token error:', error);
    return NextResponse.json({ error: 'Failed to generate token' }, { status: 500 });
  }
}
