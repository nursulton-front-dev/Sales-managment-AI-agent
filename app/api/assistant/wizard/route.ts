import { NextRequest, NextResponse, connection } from 'next/server';
import { getServerSessionContext } from '@/src/server/auth/session';
import { getWorkspaceById, updateWorkspace, getAllAgents, createAgent } from '@/src/db';
import { getMaxAgentsForPlan } from '@/lib/pricing';
import { AgentDraft, WizardChatResponse } from '@/lib/wizard/types';
import { ARCHETYPES, createInitialDraft } from '@/lib/wizard/archetypes';
import { compileAgentDraft } from '@/lib/wizard/prompt-builder';
import { getLLMProvider } from '@/lib/server/ai';

export async function GET() {
  await connection();
  try {
    const session = await getServerSessionContext();
    if (!session.workspaceId) {
      return NextResponse.json({ success: false, error: 'Требуется авторизация' }, { status: 401 });
    }

    const workspace = await getWorkspaceById(session.workspaceId);
    if (!workspace) {
      return NextResponse.json({ success: false, error: 'Организация не найдена' }, { status: 404 });
    }

    const settings = (workspace.settings as Record<string, any>) || {};
    const existingDraft: AgentDraft = settings.agentDraft || createInitialDraft('courses', 'ru');

    return NextResponse.json({
      success: true,
      draft: existingDraft,
      plan: workspace.plan || 'trial',
      maxAgents: getMaxAgentsForPlan(workspace.plan || 'trial'),
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Ошибка запроса' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  await connection();
  try {
    const session = await getServerSessionContext();
    if (!session.workspaceId) {
      return NextResponse.json({ success: false, error: 'Требуется авторизация' }, { status: 401 });
    }

    const body = await req.json();
    const { action } = body;
    const workspaceId = session.workspaceId;
    const workspace = await getWorkspaceById(workspaceId);
    if (!workspace) {
      return NextResponse.json({ success: false, error: 'Организация не найдена' }, { status: 404 });
    }

    // ACTION: SAVE DRAFT
    if (action === 'save_draft') {
      const { draft } = body;
      if (!draft || typeof draft !== 'object') {
        return NextResponse.json({ success: false, error: 'Некорректный черновик' }, { status: 400 });
      }

      const currentSettings = ((workspace.settings as Record<string, any>) || {});
      const updatedDraft: AgentDraft = {
        ...draft,
        updatedAt: new Date().toISOString(),
      };

      await updateWorkspace(workspaceId, {
        settings: {
          ...currentSettings,
          agentDraft: updatedDraft,
        },
      });

      return NextResponse.json({ success: true, draft: updatedDraft });
    }

    // ACTION: SANDBOX CHAT (Zero side-effects test-drive)
    if (action === 'sandbox_chat') {
      const { message, draft, history = [], tuningInstruction, lang = 'ru' } = body;
      if (!message || typeof message !== 'string') {
        return NextResponse.json({ success: false, error: 'Укажите сообщение для теста' }, { status: 400 });
      }

      const compiled = compileAgentDraft(draft);
      const isUz = lang === 'uz';

      let simulatedAction: { type: 'calendar_check' | 'lead_qualified' | 'handover'; details: string } | undefined;
      const lower = message.toLowerCase();

      if (lower.includes('+998') || lower.includes('телефон') || lower.includes('raqam') || lower.match(/\d{9}/)) {
        simulatedAction = {
          type: 'lead_qualified',
          details: isUz ? 'Mijoz telefon raqami saqlandi (test rejimi)' : 'Телефон клиента зафиксирован (симуляция лида)',
        };
      } else if (lower.includes('запис') || lower.includes('время') || lower.includes('kun') || lower.includes('soat')) {
        simulatedAction = {
          type: 'calendar_check',
          details: isUz ? 'Bo\'sh vaqtlar tekshirildi (test taqvim)' : 'Свободные слоты проверены (тестовый календарь)',
        };
      }

      const systemPrompt = `${compiled.systemPrompt}
${tuningInstruction ? `\nДОПОЛНИТЕЛЬНАЯ ИНСТРУКЦИЯ ПОЛЬЗОВАТЕЛЯ:\n${tuningInstruction}` : ''}
ВНИМАНИЕ: ЭТО ТЕСТОВЫЙ ДИАЛОГ (SANDBOX).
ОБЩАЙСЯ ТОЧНО ТАК, КАК НАСТРОЕННЫЙ СОТРУДНИК.`;

      let reply = '';
      try {
        const provider = getLLMProvider();
        const trimmedHistory = Array.isArray(history)
          ? history.slice(-6).map((h: any) => ({
              role: (h.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
              content: String(h.content || '').slice(0, 1000),
            }))
          : [];

        const llmResponse = await provider.complete({
          messages: [
            { role: 'system', content: systemPrompt },
            ...trimmedHistory,
            { role: 'user', content: message },
          ],
          temperature: 0.3,
          maxTokens: 600,
        });
        reply = llmResponse.content;
      } catch {
        // Fallback response for sandbox
        reply = isUz
          ? `Assalomu alaykum! Men ${compiled.name}man. Xizmatlarimiz va narxlarimiz bo'yicha maslahat berishga tayyorman. Qaysi xizmat sizni qiziqtirmoqda?`
          : `Здравствуйте! Я ${compiled.name}. С удовольствием проконсультирую вас по нашим программам и стоимости. Какой формат вас интересует?`;
      }

      return NextResponse.json({
        success: true,
        reply,
        simulatedAction,
      });
    }

    // ACTION: FINALIZE (Create actual agent in DB)
    if (action === 'finalize') {
      const { draft } = body;
      if (!draft || typeof draft !== 'object') {
        return NextResponse.json({ success: false, error: 'Черновик не передан' }, { status: 400 });
      }

      const existingAgents = await getAllAgents(workspaceId);
      const currentPlan = workspace.plan || 'trial';
      const maxAgents = getMaxAgentsForPlan(currentPlan);

      if (existingAgents.length >= maxAgents) {
        return NextResponse.json(
          {
            success: false,
            error: `Достигнут лимит сотрудников для тарифа ${currentPlan.toUpperCase()} (максимум ${maxAgents}). Для добавления сотрудников перейдите на тариф BUSINESS или PRO.`,
            code: 'AGENT_LIMIT_REACHED',
          },
          { status: 403 }
        );
      }

      const compiled = compileAgentDraft(draft);

      const agent = await createAgent({
        workspaceId,
        name: compiled.name,
        nicheTemplate: compiled.nicheTemplate,
        knowledgeBase: compiled.knowledgeBase,
        qualificationQuestions: compiled.qualificationQuestions,
        systemPrompt: compiled.systemPrompt,
        tgBotToken: null,
        googleCalendarConnected: compiled.googleCalendarConnected,
        isActive: true,
      }, maxAgents);

      // Clean up draft in workspace settings upon successful creation
      const currentSettings = ((workspace.settings as Record<string, any>) || {});
      const newSettings = { ...currentSettings };
      delete newSettings.agentDraft;

      await updateWorkspace(workspaceId, {
        settings: newSettings,
      });

      return NextResponse.json({
        success: true,
        agentId: agent.id,
        agentName: agent.name,
        message: 'ИИ-сотрудник успешно создан и готов к подключению каналов связи',
      });
    }

    // ACTION: INTERVIEW CHAT (Conversational setup wizard loop)
    if (action === 'chat') {
      const { message, draft, history = [], lang = 'ru', attachedText } = body;
      const isUz = lang === 'uz';

      if (!message && !attachedText) {
        return NextResponse.json({ success: false, error: 'Сообщение пустое' }, { status: 400 });
      }

      const currentDraft: AgentDraft = draft || createInitialDraft('courses', isUz ? 'uz' : 'ru');
      const archetype = ARCHETYPES[currentDraft.nicheTemplate] || ARCHETYPES.courses;

      // Safe update based on user input
      const updatedDraft: AgentDraft = { ...currentDraft };

      // Incorporate attached materials / price list if provided
      if (attachedText && typeof attachedText === 'string') {
        const cleanAttached = attachedText.slice(0, 10000).trim();
        updatedDraft.servicesAndPricing = `${updatedDraft.servicesAndPricing}\n\n[Добавленные материалы]:\n${cleanAttached}`;
      }

      // Step advancement logic
      const step = currentDraft.currentStep;
      let nextStep = step;
      let reply = '';
      let suggestedAnswers: string[] = [];

      const lowerMsg = (message || '').toLowerCase();

      // Niche detection from message if still in step 1
      if (step === 1) {
        if (lowerMsg.includes('курс') || lowerMsg.includes('учеб') || lowerMsg.includes('repetitor') || lowerMsg.includes('maktab') || lowerMsg.includes('dars')) {
          updatedDraft.nicheTemplate = 'courses';
        } else if (lowerMsg.includes('маркетинг') || lowerMsg.includes('реклам') || lowerMsg.includes('smm') || lowerMsg.includes('target')) {
          updatedDraft.nicheTemplate = 'marketing';
        } else if (lowerMsg.includes('салон') || lowerMsg.includes('клиник') || lowerMsg.includes('услуг') || lowerMsg.includes('remont') || lowerMsg.includes('xizmat')) {
          updatedDraft.nicheTemplate = 'services';
        }

        // Check if user specified a name
        if (lowerMsg.includes('зовут') || lowerMsg.includes('имя') || lowerMsg.includes('nomi')) {
          const nameMatch = message.match(/(?:зовут|имя|назови|nomi)\s+["«]?([A-Za-zА-Яа-яЁё0-9\s]+)["»]?/i);
          if (nameMatch && nameMatch[1]) {
            updatedDraft.name = nameMatch[1].trim();
          }
        }

        // Advance to step 2 after first exchange
        nextStep = 2;
        updatedDraft.currentStep = nextStep;

        const arch = ARCHETYPES[updatedDraft.nicheTemplate];
        reply = isUz
          ? `Tushunarli! Sizning yo'nalishingiz: «${arch.titleUz}». Xodimning maqsadi: mijozlarga to'g'ri maslahat berish va qabulga yozish.\n\nKeling, xizmatlar va narxlarni aniqlaymiz: ${arch.interviewQuestionsUz[0]}`
          : `Отлично! Выбрано направление «${arch.titleRu}». Главная цель сотрудника — быстро отвечать клиентам и вести запись.\n\nДавайте определим ключевые услуги и стоимость: ${arch.interviewQuestionsRu[0]}`;

        suggestedAnswers = isUz
          ? ['Narxlarimiz namunadagi kabi', 'Fayl yoki matn yuboraman', 'Hozircha aniq emas']
          : ['Цены как в образце', 'Вставлю наш прайс-лист', 'Пока не знаю'];
      } else if (step === 2) {
        // Step 2: Knowledge & Pricing & Rules
        if (lowerMsg.includes('запрет') || lowerMsg.includes('нельзя') || lowerMsg.includes('mumkin emas')) {
          updatedDraft.restrictions.push(message.slice(0, 200));
        } else if (message.length > 10 && !lowerMsg.includes('дальше') && !lowerMsg.includes('keyingi')) {
          // Append user's answer into servicesAndPricing or restrictions
          if (!updatedDraft.servicesAndPricing.includes(message)) {
            updatedDraft.servicesAndPricing = `${updatedDraft.servicesAndPricing}\n- ${message.slice(0, 500)}`;
          }
        }

        nextStep = 3;
        updatedDraft.currentStep = nextStep;

        reply = isUz
          ? `Ma'lumotlar saqlandi! Xodimning dastlabki bilimlari shakllantirildi. Endi o'ng tomondagi qoralamani tekshirishingiz yoki pastdagi «Test-drayv» orqali xodim bilan sinov tariqasida yozishib ko'rishingiz mumkin.\n\nAgar hammasi ma'qul bo'lsa, «Ishga tushirish» bosqichiga o'tamiz.`
          : `Отлично! Знания и прайс-лист зафиксированы в черновике. Теперь вы можете проверить карточку сотрудника справа или протестировать его ответы во вкладке «Тестовый диалог».\n\nХотите что-то скорректировать (например, тон или ограничения) или переходим к запуску?`;

        suggestedAnswers = isUz
          ? ['Javoblarni sinab ko\'rish', 'Qisqaroq javob ber', 'Hammasi tayyor, ishga tushirish']
          : ['Протестировать ответы', 'Отвечай короче', 'Всё готово, к запуску'];
      } else if (step === 3) {
        // Step 3: Review & Tuning
        if (lowerMsg.includes('короче') || lowerMsg.includes('qisqa')) {
          updatedDraft.tone = 'consultative';
          reply = isUz ? `Qabul qilindi! Xodim maksimal darajada qisqa va lo'nda javob beradi.` : `Принято! Ответы сотрудника сделаны более краткими и емкими.`;
        } else if (lowerMsg.includes('готов') || lowerMsg.includes('запуск') || lowerMsg.includes('tayyor')) {
          nextStep = 4;
          updatedDraft.currentStep = nextStep;
          reply = isUz
            ? `Ajoyib! Xodim to'liq sozlangan va ishga tushirishga tayyor. O'ng tomondan kerakli aloqa kanallarini (Telegram, Instagram, Sayt vidjeti) tanlang va «Xodimni yaratish» tugmasini bosing.`
            : `Замечательно! Сотрудник полностью настроен и готов к работе. Выберите каналы связи (Telegram, Instagram, Виджет сайта) и нажмите «Создать сотрудника».`;
          suggestedAnswers = isUz
            ? ['Xodimni yaratish', 'Orqaga qaytish']
            : ['Создать сотрудника', 'Вернуться назад'];
        } else {
          reply = isUz
            ? `Qoralama yangilandi. Sinov muloqotida yangi javoblarni ko'rishingiz mumkin. Agar yakunlashga tayyor bo'lsangiz, «Ishga tushirish» tugmasini bosing.`
            : `Черновик обновлен. Вы можете продолжить тестовый диалог или перейти к запуску сотрудника.`;
          suggestedAnswers = isUz
            ? ['Ishga tushirish', 'Test-drayvni davom ettirish']
            : ['Перейти к запуску', 'Продолжить тест'];
        }
      } else {
        // Step 4: Final checks
        reply = isUz
          ? `Xodim yaratilishga tayyor. «Xodimni yaratish» tugmasini bosing.`
          : `Сотрудник готов к сохранению. Нажмите кнопку «Создать сотрудника» для фиксации.`;
      }

      updatedDraft.updatedAt = new Date().toISOString();

      // Auto-save draft into workspace settings
      const currentSettings = ((workspace.settings as Record<string, any>) || {});
      await updateWorkspace(workspaceId, {
        settings: {
          ...currentSettings,
          agentDraft: updatedDraft,
        },
      });

      return NextResponse.json({
        success: true,
        reply,
        updatedDraft,
        suggestedAnswers,
      });
    }

    return NextResponse.json({ success: false, error: 'Неизвестное действие' }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Внутренняя ошибка мастера' },
      { status: 500 }
    );
  }
}
