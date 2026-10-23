import { NextRequest, NextResponse, connection } from 'next/server';
import { getAllWorkspaces, updateWorkspace, addTokenLog, getAllTokenLogs } from '@/src/db';

export async function GET() {
  await connection();
  try {
    const workspaces = await getAllWorkspaces();
    const tokenLogs = await getAllTokenLogs();

    // Calculate MRR from active paid subscriptions only (excludes trial, one-time topups, free grants)
    let mrrUsd = 0;
    let trialCount = 0;
    let paidCount = 0;
    let totalTokensIssued = 0;

    workspaces.forEach((w) => {
      totalTokensIssued += w.tokenBalance;
      if (w.plan === 'trial') {
        trialCount += 1;
      } else {
        paidCount += 1;
        if (w.plan === 'start') mrrUsd += 29;
        else if (w.plan === 'business') mrrUsd += 59;
        else if (w.plan === 'pro') mrrUsd += 119;
      }
    });

    const UZS_RATE = 12750;
    const mrrUzs = mrrUsd * UZS_RATE;

    // Strict Partner Share Formula from Master Specification:
    // Partner Share = 20% × (received subscriptions + received topups - direct OpenAI costs - Payme/Click fees)
    let receivedSubscriptionIncome = 0;
    let receivedTopupIncome = 0;
    let totalMessagesProcessed = 0;

    tokenLogs.forEach((log) => {
      const amount = parseFloat(log.amountUsd || '0');
      if (log.actionType === 'subscription' && amount > 0) {
        receivedSubscriptionIncome += amount;
      } else if (log.actionType === 'topup' && amount > 0) {
        receivedTopupIncome += amount;
      }

      if (log.tokensDelta < 0 && (log.actionType === 'chat_reply' || log.actionType === 'calendar_booking')) {
        totalMessagesProcessed += 1;
      }
    });

    const totalReceivedIncome = receivedSubscriptionIncome + receivedTopupIncome;

    // Direct OpenAI API cost estimation: ~$0.001 per message
    const openAiDirectCost = Math.round(totalMessagesProcessed * 0.001 * 100) / 100;

    // Payme/Click acquiring commission: 2.0%
    const gatewayFees = Math.round(totalReceivedIncome * 0.02 * 100) / 100;

    // Calculation base
    const partnerBase = Math.max(0, totalReceivedIncome - openAiDirectCost - gatewayFees);
    const partnerShareUsd = Math.round(partnerBase * 0.2 * 100) / 100;
    const partnerShareUzs = Math.round(partnerShareUsd * UZS_RATE);

    // Calculate total tokens spent from logs
    let totalTokensSpent = 0;
    tokenLogs.forEach((log) => {
      if (log.tokensDelta < 0) {
        totalTokensSpent += Math.abs(log.tokensDelta);
      }
    });

    return NextResponse.json({
      success: true,
      stats: {
        totalWorkspaces: workspaces.length,
        trialCount,
        paidCount,
        mrrUsd,
        mrrUzs,
        receivedSubscriptionIncome,
        receivedTopupIncome,
        totalReceivedIncome,
        openAiDirectCost,
        gatewayFees,
        partnerBase,
        partnerShareUsd,
        partnerShareUzs,
        totalTokensIssued,
        totalTokensSpent,
      },
      workspaces,
    });
  } catch (error: any) {
    console.error('Error fetching admin workspaces:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { workspaceId, action, tokensToAdd, newPlan, status } = body;

    if (!workspaceId) {
      return NextResponse.json({ error: 'workspaceId обязателен' }, { status: 400 });
    }

    const workspaces = await getAllWorkspaces();
    const current = workspaces.find((w) => w.id === workspaceId);
    if (!current) {
      return NextResponse.json({ error: 'Организация не найдена' }, { status: 404 });
    }

    if (action === 'add_tokens') {
      const delta = Number(tokensToAdd) || 500;
      const reason = body.reason || 'Ручная корректировка основателем платформы';
      const updatedBalance = current.tokenBalance + delta;
      const updated = await updateWorkspace(workspaceId, { tokenBalance: updatedBalance });

      await addTokenLog({
        id: `log_admin_${Date.now()}`,
        workspaceId,
        actionType: 'admin_adjustment',
        tokensDelta: delta,
        amountUsd: '0',
        paymentMethod: 'system',
        description: `Суперадмин: +${delta} токенов. Причина: ${reason}`,
        createdAt: new Date(),
      });

      return NextResponse.json({ success: true, workspace: updated });
    }

    if (action === 'change_plan') {
      if (!newPlan) {
        return NextResponse.json({ error: 'newPlan обязателен' }, { status: 400 });
      }

      let bonusTokens = 0;
      if (newPlan === 'start' && current.plan !== 'start') bonusTokens = 2000;
      if (newPlan === 'business' && current.plan !== 'business') bonusTokens = 6000;
      if (newPlan === 'pro' && current.plan !== 'pro') bonusTokens = 15000;

      const updated = await updateWorkspace(workspaceId, {
        plan: newPlan,
        tokenBalance: current.tokenBalance + bonusTokens,
        subExpiresAt: new Date(Date.now() + 86400000 * 30),
      });

      await addTokenLog({
        id: `log_admin_plan_${Date.now()}`,
        workspaceId,
        actionType: 'subscription',
        tokensDelta: bonusTokens,
        amountUsd: newPlan === 'start' ? '29' : newPlan === 'business' ? '59' : newPlan === 'pro' ? '119' : '0',
        paymentMethod: 'system',
        description: `Суперадмин сменил тариф на ${newPlan.toUpperCase()}`,
        createdAt: new Date(),
      });

      return NextResponse.json({ success: true, workspace: updated });
    }

    if (action === 'verify_email') {
      const bonus = current.tokenBalance === 0 ? 100 : 0;
      const updated = await updateWorkspace(workspaceId, {
        emailVerified: true,
        verificationCode: null,
        tokenBalance: current.tokenBalance + bonus,
      });

      if (bonus > 0) {
        await addTokenLog({
          id: `log_admin_verify_${Date.now()}`,
          workspaceId,
          actionType: 'trial_bonus',
          tokensDelta: bonus,
          amountUsd: '0',
          paymentMethod: 'system',
          description: 'Ручная верификация Email суперадмином (+100 токенов)',
          createdAt: new Date(),
        });
      }

      return NextResponse.json({ success: true, workspace: updated });
    }

    if (action === 'set_status') {
      const updated = await updateWorkspace(workspaceId, { status: status || 'active' });
      return NextResponse.json({ success: true, workspace: updated });
    }

    return NextResponse.json({ error: 'Неизвестное действие' }, { status: 400 });
  } catch (error: any) {
    console.error('Error updating admin workspace:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
