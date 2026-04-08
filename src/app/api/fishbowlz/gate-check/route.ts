import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/db/supabase';
import { getSessionData } from '@/lib/auth/session';
import { checkTokenGate } from '@/lib/fishbowlz/tokenGate';

const GateCheckSchema = z.object({
  roomId: z.string().uuid(),
  fid: z.number().int().positive(),
  wallet: z.string().startsWith('0x').optional(),
  inviteCode: z.string().max(20).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionData();
    if (!session?.fid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const parsed = GateCheckSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
    }

    const { roomId, fid, wallet, inviteCode } = parsed.data;

    // Call the RPC function to determine gate type and check non-token gates
    const { data: rpcResult, error: rpcError } = await supabaseAdmin
      .rpc('fishbowl_check_gate', {
        p_room_id: roomId,
        p_fid: fid,
        p_wallet: wallet ?? null,
        p_invite_code: inviteCode ?? null,
      });

    if (rpcError) {
      return NextResponse.json({
        allowed: false,
        reason: 'Gate check failed',
        gateType: 'unknown',
      }, { status: 500 });
    }

    // If the RPC resolved a non-token gate, return its result directly
    if (rpcResult.gate_type !== 'token') {
      return NextResponse.json({
        allowed: rpcResult.allowed,
        reason: rpcResult.reason,
        gateType: rpcResult.gate_type,
      });
    }

    // For token gates, perform the on-chain balance check
    if (!wallet) {
      return NextResponse.json({
        allowed: false,
        reason: 'Wallet address required for token-gated rooms',
        gateType: 'token',
      });
    }

    // Fetch the room's token gate config
    const { data: room, error: roomError } = await supabaseAdmin
      .from('fishbowl_rooms')
      .select('token_gate_address, token_gate_min_balance, token_gate_chain_id')
      .eq('id', roomId)
      .single();

    if (roomError || !room || !room.token_gate_address) {
      return NextResponse.json({
        allowed: false,
        reason: 'Room not found or missing token gate config',
        gateType: 'token',
      });
    }

    const tokenResult = await checkTokenGate({
      walletAddress: wallet,
      tokenAddress: room.token_gate_address,
      minBalance: room.token_gate_min_balance || '0',
      chainId: room.token_gate_chain_id || 8453,
    });

    return NextResponse.json({
      allowed: tokenResult.allowed,
      reason: tokenResult.allowed ? 'Token gate passed' : 'Insufficient token balance',
      gateType: 'token',
    });
  } catch {
    return NextResponse.json({ error: 'Gate check failed' }, { status: 500 });
  }
}
