import type { Agent, Workspace } from '@/src/db/schema';

/** Only fields needed by the dashboard may cross the server boundary. */
export function publicWorkspace(workspace: Workspace) {
  return { id: workspace.id, companyName: workspace.companyName, ownerName: workspace.ownerName,
    ownerEmail: workspace.ownerEmail, ownerPhone: workspace.ownerPhone, niche: workspace.niche,
    subscriptionActive: workspace.status === 'active' && Boolean(workspace.subExpiresAt && new Date(workspace.subExpiresAt).getTime() > Date.now()),
    trialDaysLeft: workspace.subExpiresAt ? Math.max(0, Math.ceil((new Date(workspace.subExpiresAt).getTime() - Date.now()) / 86400000)) : 0,
    plan: workspace.plan, status: workspace.status, tokenBalance: workspace.tokenBalance,
    emailVerified: workspace.emailVerified, subExpiresAt: workspace.subExpiresAt,
    googleCalendarConnected: workspace.googleCalendarConnected, googleCalendarEmail: workspace.googleCalendarEmail,
    googleCalendarWorkingHours: workspace.googleCalendarWorkingHours, googleCalendarSlotDuration: workspace.googleCalendarSlotDuration,
    instagramConnected: workspace.instagramConnected, instagramAgentId: workspace.instagramAgentId, createdAt: workspace.createdAt };
}
export function publicAgent(agent: Agent) {
  return { id: agent.id, name: agent.name, nicheTemplate: agent.nicheTemplate, systemPrompt: agent.systemPrompt,
    knowledgeBase: agent.knowledgeBase, qualificationQuestions: agent.qualificationQuestions,
    isActive: agent.isActive, googleCalendarConnected: agent.googleCalendarConnected,
    telegramConnected: false, createdAt: agent.createdAt };
}
