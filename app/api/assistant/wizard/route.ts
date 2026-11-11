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

      // Niche detection & 1-question-per-step progression
      if (step === 1) {
        if (!updatedDraft.subStep || updatedDraft.subStep === 'niche') {
          // Detect niche
          if (lowerMsg.includes('курс') || lowerMsg.includes('учеб') || lowerMsg.includes('repetitor') || lowerMsg.includes('maktab') || lowerMsg.includes('dars') || lowerMsg.includes('ingliz')) {
            updatedDraft.nicheTemplate = 'courses';
          } else if (lowerMsg.includes('маркетинг') || lowerMsg.includes('реклам') || lowerMsg.includes('smm') || lowerMsg.includes('target')) {
            updatedDraft.nicheTemplate = 'marketing';
          } else if (lowerMsg.includes('салон') || lowerMsg.includes('клиник') || lowerMsg.includes('услуг') || lowerMsg.includes('remont') || lowerMsg.includes('xizmat') || lowerMsg.includes('go\'zallik') || lowerMsg.includes('shifoxona')) {
            updatedDraft.nicheTemplate = 'services';
          } else if (lowerMsg.includes('магазин') || lowerMsg.includes('do\'kon') || lowerMsg.includes('kiyim') || lowerMsg.includes('savdo')) {
            updatedDraft.nicheTemplate = 'other';
          }

          if (lowerMsg.includes('зовут') || lowerMsg.includes('имя') || lowerMsg.includes('nomi')) {
            const nameMatch = message.match(/(?:зовут|имя|назови|nomi)\s+["«]?([A-Za-zА-Яа-яЁё0-9\s]+)["»]?/i);
            if (nameMatch && nameMatch[1]) {
              updatedDraft.name = nameMatch[1].trim();
            }
          }

          updatedDraft.subStep = 'goal';
          const arch = ARCHETYPES[updatedDraft.nicheTemplate] || ARCHETYPES.courses;

          reply = isUz
            ? `Tushunarli! Sizning yo‘nalishingiz: «${arch.titleUz}». Endi xodimning asosiy vazifasini aniqlaymiz: u nima qilishi kerak — narxlar bo‘yicha maslahat berish, qabulga yozish yoki arizalarni saralashmi?`
            : `Отлично! Сфера бизнеса зафиксирована: «${arch.titleRu}». Какая главная задача будет у сотрудника — консультация по ценам, запись на приём или сбор и квалификация заявок?`;

          suggestedAnswers = isUz
            ? ['Narxlar bo‘yicha maslahat berish', 'Qabulga yoki sinov darsiga yozish', 'Mijozlarni saralash va kontaktlarni yig‘ish']
            : ['Консультация по ценам и прайсу', 'Запись на приём или пробный урок', 'Квалификация и сбор контактов'];
        } else if (updatedDraft.subStep === 'goal') {
          // Record goal
          updatedDraft.targetGoal = message.trim();
          updatedDraft.goalConfirmed = true;
          updatedDraft.subStep = 'knowledge';
          nextStep = 2;
          updatedDraft.currentStep = nextStep;

          const arch = ARCHETYPES[updatedDraft.nicheTemplate] || ARCHETYPES.courses;
          reply = isUz
            ? `Qabul qilindi! Xodimning asosiy vazifasi belgilandi. Endi u bilishi kerak bo‘lgan asosiy xizmatlar va narxlar qanday? Namunadagi narxlarni tasdiqlashingiz, o‘z narxlaringizni yozishingiz yoki fayl yuklashingiz mumkin.`
            : `Принято! Главная задача сотрудника сохранена в резюме. Какие ключевые услуги и цены он должен знать? Вы можете подтвердить базовый прайс-лист, ввести свои цены или прикрепить файл.`;

          suggestedAnswers = isUz
            ? ['Namunadagi narxlarni tasdiqlash', 'O‘z narxlarimni yozaman', 'Fayl biriktiraman']
            : ['Подтвердить цены из образца', 'Напишу цены своими словами', 'Прикреплю файл с прайсом'];
        }
      } else if (step === 2) {
        // Step 2: Knowledge & Pricing & Rules
        if (lowerMsg.includes('образц') || lowerMsg.includes('намун') || lowerMsg.includes('подтвержд') || lowerMsg.includes('tasdiq')) {
          updatedDraft.pricingConfirmed = true;
        } else if (message.length > 5) {
          if (!updatedDraft.servicesAndPricing.includes(message)) {
            updatedDraft.servicesAndPricing = `${updatedDraft.servicesAndPricing}\n- ${message.slice(0, 500)}`;
          }
          updatedDraft.pricingConfirmed = true;
        }

        if (lowerMsg.includes('запрет') || lowerMsg.includes('нельзя') || lowerMsg.includes('mumkin emas')) {
          updatedDraft.restrictions.push(message.slice(0, 200));
        }

        nextStep = 3;
        updatedDraft.currentStep = nextStep;
        updatedDraft.subStep = 'review';

        reply = isUz
          ? `Bilimlar va narxlar o‘ng tomondagi qoralamada saqlandi! Endi xodimning javoblarini test-drayvda sinab ko‘rishingiz yoki ishga tushirish bosqichiga o‘tishingiz mumkin.`
          : `Знания и прайс-лист зафиксированы в резюме справа! Теперь вы можете проверить ответы сотрудника в тест-драйве или сразу перейти к запуску.`;

        suggestedAnswers = isUz
          ? ['Javoblarni test-drayvda sinash', 'Hammasi tayyor, ishga tushirish']
          : ['Проверить в тест-драйве', 'Всё готово, к запуску'];
      } else if (step === 3) {
        // Step 3: Review & Tuning
        if (lowerMsg.includes('короче') || lowerMsg.includes('qisqa')) {
          updatedDraft.tone = 'consultative';
          reply = isUz ? `Qabul qilindi! Xodim maksimal darajada qisqa va lo‘nda javob beradi.` : `Принято! Ответы сотрудника сделаны более краткими и ёмкими.`;
          suggestedAnswers = isUz
            ? ['Ishga tushirish', 'Test-drayvni davom ettirish']
            : ['Перейти к запуску', 'Продолжить тест'];
        } else if (lowerMsg.includes('готов') || lowerMsg.includes('запуск') || lowerMsg.includes('tayyor')) {
          nextStep = 4;
          updatedDraft.currentStep = nextStep;
          updatedDraft.subStep = 'launch';
          reply = isUz
            ? `Ajoyib! Xodim to‘liq sozlangan va ishga tushirishga tayyor. O‘ng tomondan aloqa kanalini tekshiring va «Saqlash va ishga tushirish» tugmasini bosing.`
            : `Замечательно! Сотрудник полностью настроен и готов к работе. Проверьте каналы связи и нажмите «Сохранить и запустить».`;
          suggestedAnswers = isUz
            ? ['Saqlash va ishga tushirish', 'Orqaga qaytish']
            : ['Сохранить и запустить', 'Вернуться назад'];
        } else {
          reply = isUz
            ? `Qoralama yangilandi. Sinov muloqotida yangi javoblarni ko‘rishingiz mumkin. Agar yakunlashga tayyor bo‘lsangiz, «Ishga tushirish» tugmasini bosing.`
            : `Резюме обновлено. Вы можете протестировать ответы или перейти к запуску сотрудника.`;
          suggestedAnswers = isUz
            ? ['Ishga tushirish', 'Test-drayvni davom ettirish']
            : ['Перейти к запуску', 'Продолжить тест'];
        }
      } else {
        // Step 4: Final checks
        reply = isUz
          ? `Xodim saqlanishga tayyor. «Saqlash va ishga tushirish» tugmasini bosing.`
          : `Сотрудник готов к сохранению. Нажмите кнопку «Сохранить и запустить».`;
        suggestedAnswers = isUz
          ? ['Saqlash va ishga tushirish']
          : ['Сохранить и запустить'];
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
