/**
 * Unified Channel Status & Source of Truth Resolver
 * Single point of truth for Overview, Agents, Integrations, and Agent Wizards.
 * Distinguishes messaging communication channels from scheduling integrations.
 */

export type ChannelCategory = 'messaging' | 'scheduling';

export type ChannelState =
  | 'connected'        // Active, enabled, and permitted to reply
  | 'paused'           // Connected, but auto-reply or channel is turned off
  | 'needs_permission' // Connected, but missing permission (e.g. Telegram Business can_reply=false)
  | 'needs_reconnect'  // Token expired or invalid, requires re-authorization (Instagram)
  | 'error'            // Configuration or webhook error (e.g. invalid Telegram bot token)
  | 'not_connected';   // Channel is not configured or disconnected

export interface ChannelStatusInfo {
  id: 'telegram_business' | 'telegram_bot' | 'instagram' | 'web_widget' | 'google_calendar';
  name: string;
  category: ChannelCategory;
  state: ChannelState;
  stateLabel: string;
  badgeVariant: 'success' | 'warning' | 'neutral' | 'error';
  canReply: boolean;
  assignedAgentId?: string | null;
  assignedAgentName?: string | null;
  identifier?: string | null; // e.g. username or domain
  details?: string;
}

export interface AgentChannelSummary {
  agentId: string;
  agentName: string;
  isActive: boolean;
  canReplyAnywhere: boolean;
  channels: ChannelStatusInfo[];
  primaryChannelText: string;
  primaryBadge: {
    label: string;
    variant: 'success' | 'warning' | 'neutral' | 'error';
  };
  calendarConnected: boolean;
}

export interface WorkspaceChannelsSummary {
  workspaceId: string;
  hasActiveMessagingChannel: boolean;
  activeMessagingChannelsCount: number;
  channels: ChannelStatusInfo[];
  calendar: ChannelStatusInfo;
  disconnectedAlerts: string[];
}

/**
 * Resolves Telegram Business status for a workspace
 */
export function resolveTelegramBusinessStatus(workspace: any, agents: any[] = []): ChannelStatusInfo {
  const isConnected = Boolean(workspace?.telegramBusinessConnected && workspace?.telegramBusinessUserId);
  const isEnabled = Boolean(workspace?.telegramBusinessEnabled);
  const canReply = Boolean(workspace?.telegramBusinessCanReply);
  const agentId = workspace?.telegramBusinessAgentId || null;
  const assignedAgent = agents.find((a) => a.id === agentId);
  const username = workspace?.telegramBusinessUsername || null;

  if (!isConnected) {
    return {
      id: 'telegram_business',
      name: 'Telegram Business (секретарь)',
      category: 'messaging',
      state: 'not_connected',
      stateLabel: 'Не подключён',
      badgeVariant: 'neutral',
      canReply: false,
      assignedAgentId: null,
      identifier: null,
      details: 'Подключите личный аккаунт через @gapcha_assistant_bot',
    };
  }

  if (!canReply) {
    return {
      id: 'telegram_business',
      name: 'Telegram Business',
      category: 'messaging',
      state: 'needs_permission',
      stateLabel: 'Требуется разрешение',
      badgeVariant: 'warning',
      canReply: false,
      assignedAgentId: agentId,
      assignedAgentName: assignedAgent?.name,
      identifier: username ? `@${username}` : null,
      details: 'В Telegram Business отключено право бота отвечать на сообщения. Включите «Разрешить отвечать» в приложении.',
    };
  }

  if (!isEnabled) {
    return {
      id: 'telegram_business',
      name: 'Telegram Business',
      category: 'messaging',
      state: 'paused',
      stateLabel: 'На паузе',
      badgeVariant: 'warning',
      canReply: false,
      assignedAgentId: agentId,
      assignedAgentName: assignedAgent?.name,
      identifier: username ? `@${username}` : null,
      details: 'Автоответы временно приостановлены в настройках интеграции.',
    };
  }

  return {
    id: 'telegram_business',
    name: 'Telegram Business',
    category: 'messaging',
    state: 'connected',
    stateLabel: 'Подключён',
    badgeVariant: 'success',
    canReply: true,
    assignedAgentId: agentId,
    assignedAgentName: assignedAgent?.name,
    identifier: username ? `@${username}` : null,
    details: username ? `Отвечает от имени @${username}` : 'Активен в личном аккаунте',
  };
}

/**
 * Resolves Instagram Direct status for a workspace
 */
export function resolveInstagramStatus(workspace: any, agents: any[] = []): ChannelStatusInfo {
  const isConnected = Boolean(workspace?.instagramConnected && workspace?.instagramUserId);
  const autoReply = Boolean(workspace?.instagramAutoReply);
  const statusStr = (workspace?.instagramStatus || 'disconnected').toLowerCase();
  const agentId = workspace?.instagramAgentId || null;
  const assignedAgent = agents.find((a) => a.id === agentId);
  const username = workspace?.instagramUsername || null;

  if (!isConnected || statusStr === 'disconnected') {
    return {
      id: 'instagram',
      name: 'Instagram Direct',
      category: 'messaging',
      state: 'not_connected',
      stateLabel: 'Не подключён',
      badgeVariant: 'neutral',
      canReply: false,
      assignedAgentId: null,
      identifier: null,
      details: 'Свяжите страницу Facebook и профессиональный аккаунт Instagram.',
    };
  }

  if (statusStr === 'needs_reconnect') {
    return {
      id: 'instagram',
      name: 'Instagram Direct',
      category: 'messaging',
      state: 'needs_reconnect',
      stateLabel: 'Требуется переподключение',
      badgeVariant: 'warning',
      canReply: false,
      assignedAgentId: agentId,
      assignedAgentName: assignedAgent?.name,
      identifier: username ? `@${username}` : null,
      details: 'Срок действия токена Meta истёк или доступ отозван. Требуется повторный вход через Facebook.',
    };
  }

  if (statusStr === 'error') {
    return {
      id: 'instagram',
      name: 'Instagram Direct',
      category: 'messaging',
      state: 'error',
      stateLabel: 'Ошибка подключения',
      badgeVariant: 'error',
      canReply: false,
      assignedAgentId: agentId,
      assignedAgentName: assignedAgent?.name,
      identifier: username ? `@${username}` : null,
      details: workspace?.instagramLastError || 'Ошибка взаимодействия с Meta Graph API.',
    };
  }

  if (!autoReply) {
    return {
      id: 'instagram',
      name: 'Instagram Direct',
      category: 'messaging',
      state: 'paused',
      stateLabel: 'На паузе',
      badgeVariant: 'warning',
      canReply: false,
      assignedAgentId: agentId,
      assignedAgentName: assignedAgent?.name,
      identifier: username ? `@${username}` : null,
      details: 'Автоответы в Direct приостановлены в настройках.',
    };
  }

  return {
    id: 'instagram',
    name: 'Instagram Direct',
    category: 'messaging',
    state: 'connected',
    stateLabel: 'Подключён',
    badgeVariant: 'success',
    canReply: true,
    assignedAgentId: agentId,
    assignedAgentName: assignedAgent?.name,
    identifier: username ? `@${username}` : null,
    details: username ? `Привязан аккаунт @${username}` : 'Активен для входящих сообщений',
  };
}

/**
 * Resolves WebWidget (Чат на сайте) status
 */
export function resolveWebWidgetStatus(widget: any, agents: any[] = []): ChannelStatusInfo {
  if (!widget) {
    return {
      id: 'web_widget',
      name: 'Чат на сайте',
      category: 'messaging',
      state: 'not_connected',
      stateLabel: 'Не настроен',
      badgeVariant: 'neutral',
      canReply: false,
      assignedAgentId: null,
      identifier: null,
      details: 'Создайте виджет и скопируйте код на ваш сайт.',
    };
  }

  const agentId = widget.agentId || null;
  const assignedAgent = agents.find((a) => a.id === agentId);
  const enabled = Boolean(widget.enabled);
  const lastSeenAt = widget.lastSeenAt ? new Date(widget.lastSeenAt) : null;
  const isInstalledLive = Boolean(lastSeenAt && Date.now() - lastSeenAt.getTime() < 30 * 86400000);

  if (!enabled) {
    return {
      id: 'web_widget',
      name: 'Чат на сайте',
      category: 'messaging',
      state: 'paused',
      stateLabel: 'Отключён',
      badgeVariant: 'warning',
      canReply: false,
      assignedAgentId: agentId,
      assignedAgentName: assignedAgent?.name,
      identifier: widget.lastSeenOrigin || null,
      details: 'Виджет временно выключен в панели управления.',
    };
  }

  return {
    id: 'web_widget',
    name: 'Чат на сайте',
    category: 'messaging',
    state: 'connected',
    stateLabel: isInstalledLive ? 'Активен на сайте' : 'Готов к установке',
    badgeVariant: 'success',
    canReply: true,
    assignedAgentId: agentId,
    assignedAgentName: assignedAgent?.name,
    identifier: widget.lastSeenOrigin || null,
    details: isInstalledLive
      ? `Установлен на ${widget.lastSeenOrigin || 'сайте'}`
      : 'Код сгенерирован и ожидает установки на сайт',
  };
}

/**
 * Resolves Google Calendar status (SCHEDULING integration, not a messaging channel)
 */
export function resolveGoogleCalendarStatus(workspace: any): ChannelStatusInfo {
  const isConnected = Boolean(workspace?.googleCalendarConnected && workspace?.googleRefreshToken);
  const email = workspace?.googleCalendarEmail || null;

  if (!isConnected) {
    return {
      id: 'google_calendar',
      name: 'Google Календарь',
      category: 'scheduling',
      state: 'not_connected',
      stateLabel: 'Не подключён',
      badgeVariant: 'neutral',
      canReply: false,
      identifier: null,
      details: 'Интеграция расписания. Позволяет ИИ проверять свободные слоты и записывать клиентов.',
    };
  }

  return {
    id: 'google_calendar',
    name: 'Google Календарь',
    category: 'scheduling',
    state: 'connected',
    stateLabel: 'Подключён',
    badgeVariant: 'success',
    canReply: false, // Scheduling integration, cannot send chat messages directly
    identifier: email,
    details: email ? `Синхронизирован с ${email}` : 'Записи создаются автоматически',
  };
}

/**
 * Resolves full channel summary for a specific agent
 */
export function getAgentChannelStatuses(agent: any, workspace: any, widget: any = null): AgentChannelSummary {
  const channels: ChannelStatusInfo[] = [];

  // 1. Custom Telegram Bot (assigned directly to agent)
  if (agent?.telegramConnected || agent?.tgBotToken || agent?.telegramToken) {
    const isConnected = Boolean(agent.telegramConnected);
    const username = agent.telegramUsername || null;
    channels.push({
      id: 'telegram_bot',
      name: 'Свой Telegram-бот',
      category: 'messaging',
      state: isConnected ? 'connected' : 'error',
      stateLabel: isConnected ? 'Подключён' : 'Ошибка токена',
      badgeVariant: isConnected ? 'success' : 'error',
      canReply: isConnected && Boolean(agent.isActive),
      assignedAgentId: agent.id,
      assignedAgentName: agent.name,
      identifier: username ? `@${username}` : null,
      details: isConnected ? (username ? `@${username}` : 'Бот активен') : 'Неверный токен бота или ошибка webhook',
    });
  }

  // 2. Telegram Business (assigned via workspace.telegramBusinessAgentId)
  if (workspace?.telegramBusinessConnected && workspace?.telegramBusinessAgentId === agent?.id) {
    channels.push(resolveTelegramBusinessStatus(workspace, [agent]));
  }

  // 3. Instagram Direct (assigned via workspace.instagramAgentId)
  if (workspace?.instagramConnected && workspace?.instagramAgentId === agent?.id) {
    channels.push(resolveInstagramStatus(workspace, [agent]));
  }

  // 4. WebWidget (assigned via widget.agentId)
  if (widget && widget.enabled && widget.agentId === agent?.id) {
    channels.push(resolveWebWidgetStatus(widget, [agent]));
  }

  const activeChannels = channels.filter((c) => c.canReply);
  const canReplyAnywhere = Boolean(agent?.isActive && activeChannels.length > 0);

  // Determine primary display badge and text
  let primaryChannelText = 'Каналы не подключены';
  let primaryBadge: AgentChannelSummary['primaryBadge'] = {
    label: 'Только тестирование',
    variant: 'neutral',
  };

  if (channels.length > 0) {
    const channelNames = channels.map((c) => {
      if (c.id === 'telegram_business') return `Telegram Business${c.identifier ? ` (${c.identifier})` : ''}`;
      if (c.id === 'telegram_bot') return c.identifier ? `@${c.identifier.replace('@', '')}` : 'Свой бот';
      if (c.id === 'instagram') return `Instagram${c.identifier ? ` (${c.identifier})` : ''}`;
      if (c.id === 'web_widget') return 'Чат на сайте';
      return c.name;
    });

    primaryChannelText = channelNames.join(', ');

    if (!agent?.isActive) {
      primaryBadge = { label: 'Сотрудник выключен', variant: 'warning' };
    } else if (canReplyAnywhere) {
      primaryBadge = { label: 'ИИ на связи', variant: 'success' };
    } else {
      // Channels attached, but none currently able to reply (paused or needs permission)
      const needsPerm = channels.some((c) => c.state === 'needs_permission');
      const needsRec = channels.some((c) => c.state === 'needs_reconnect');
      if (needsPerm) {
        primaryBadge = { label: 'Требуется разрешение', variant: 'warning' };
      } else if (needsRec) {
        primaryBadge = { label: 'Требуется переподключение', variant: 'warning' };
      } else {
        primaryBadge = { label: 'Канал на паузе', variant: 'warning' };
      }
    }
  }

  return {
    agentId: agent?.id || '',
    agentName: agent?.name || '',
    isActive: Boolean(agent?.isActive),
    canReplyAnywhere,
    channels,
    primaryChannelText,
    primaryBadge,
    calendarConnected: Boolean(workspace?.googleCalendarConnected && agent?.googleCalendarConnected),
  };
}

/**
 * Resolves full workspace-level channels summary for Dashboard Overview and Metrics
 */
export function getWorkspaceChannelsSummary(
  workspace: any,
  agents: any[] = [],
  widget: any = null
): WorkspaceChannelsSummary {
  const tgBusiness = resolveTelegramBusinessStatus(workspace, agents);
  const instagram = resolveInstagramStatus(workspace, agents);
  const webWidget = resolveWebWidgetStatus(widget, agents);
  const calendar = resolveGoogleCalendarStatus(workspace);

  const messagingChannels: ChannelStatusInfo[] = [tgBusiness, instagram, webWidget];

  // Include custom bots from agents
  agents.forEach((agent) => {
    if (agent.telegramConnected || agent.tgBotToken || agent.telegramToken) {
      const isConnected = Boolean(agent.telegramConnected);
      messagingChannels.push({
        id: 'telegram_bot',
        name: `Бот @${(agent.telegramUsername || 'bot').replace('@', '')}`,
        category: 'messaging',
        state: isConnected ? 'connected' : 'error',
        stateLabel: isConnected ? 'Подключён' : 'Ошибка',
        badgeVariant: isConnected ? 'success' : 'error',
        canReply: isConnected && Boolean(agent.isActive),
        assignedAgentId: agent.id,
        assignedAgentName: agent.name,
        identifier: agent.telegramUsername ? `@${agent.telegramUsername}` : null,
        details: isConnected ? 'Свой бот Telegram' : 'Неверный токен бота',
      });
    }
  });

  const activeMessagingChannels = messagingChannels.filter((c) => c.canReply);

  // Disconnected alerts: channels that were previously connected or configured but now have errors/pause
  const disconnectedAlerts: string[] = [];
  if (tgBusiness.state === 'needs_permission') {
    disconnectedAlerts.push('В Telegram Business выключено разрешение на ответы бота. Включите «Разрешить отвечать» в настройках Telegram.');
  }
  if (instagram.state === 'needs_reconnect') {
    disconnectedAlerts.push('Instagram Direct отключён: истёк срок действия токена Meta. Переподключите аккаунт в разделе Интеграции.');
  }
  if (instagram.state === 'error') {
    disconnectedAlerts.push('Ошибка соединения с Instagram Direct. Проверьте статус в Интеграциях.');
  }

  return {
    workspaceId: workspace?.id || '',
    hasActiveMessagingChannel: activeMessagingChannels.length > 0,
    activeMessagingChannelsCount: activeMessagingChannels.length,
    channels: messagingChannels,
    calendar,
    disconnectedAlerts,
  };
}
