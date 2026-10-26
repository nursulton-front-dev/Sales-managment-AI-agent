'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { messageText } from '@/lib/message-text';
import { X, Send, RotateCcw, MessagesSquare, Info, BookOpen } from 'lucide-react';

type Message = { role: 'user' | 'assistant'; content: string };
export function SandboxDrawer() {
  const { isSandboxOpen, closeSandbox, sandboxAgent, agents, tokenBalance, refreshWorkspace } = useApp();
  const [selected, setSelected] = useState('');
  const [sessions, setSessions] = useState<Record<string, Message[]>>({});
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const end = useRef<HTMLDivElement>(null);
  const inFlight = useRef(false);
  const agentId = selected || sandboxAgent?.id || agents[0]?.id || '';
  const agent = agents.find((item) => item.id === agentId);
  const messages = sessions[agentId] || [];
  useEffect(() => { if (isSandboxOpen && sandboxAgent && !inFlight.current) { setSelected(sandboxAgent.id); setError(null); } }, [isSandboxOpen, sandboxAgent]);
  useEffect(() => { end.current?.scrollIntoView({ block: 'nearest' }); }, [sessions, sending]);
  const prompts = agent?.nicheId === 'clinic' ? ['Какие специалисты принимают?', 'Как подготовиться к приёму?', 'Как записаться?'] : agent?.nicheId === 'courses' || agent?.nicheId === 'education' ? ['Какие курсы у вас есть?', 'Сколько стоит обучение?', 'Есть пробное занятие?'] : agent?.nicheId === 'ecommerce' ? ['Какие товары есть в наличии?', 'Как заказать доставку?', 'Какие способы оплаты?'] : ['Какие услуги вы предлагаете?', 'Сколько это стоит?', 'Как связаться с менеджером?'];
  const send = async (text = draft) => {
    if (!agent || !text.trim() || inFlight.current) return;
    inFlight.current = true; setSending(true); setError(null);
    const content = text.trim(); const target = agent.id; const history = sessions[target] || [];
    setSessions((state) => ({ ...state, [target]: [...history, { role: 'user', content }] })); setDraft('');
    try {
      const res = await fetch('/api/ai/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: content, agentId: target, history, isSandbox: true }) });
      const data = await res.json();
      if (!res.ok || !data.success || typeof data.reply !== 'string') throw new Error(data.error || 'Не удалось получить ответ');
      setSessions((state) => ({ ...state, [target]: [...(state[target] || []), { role: 'assistant', content: data.reply }] }));
      await refreshWorkspace();
    } catch (failure) {
      setSessions((state) => ({ ...state, [target]: history })); setDraft(content);
      setError(failure instanceof Error ? failure.message : 'Ошибка сети');
    } finally { inFlight.current = false; setSending(false); }
  };
  return <Dialog open={isSandboxOpen} onClose={closeSandbox} label="Тест-драйв ИИ-сотрудника" className="drawer">
    <div className="flex items-center justify-between p-5 border-b shrink-0"><h2 className="text-xl font-semibold">Тест-драйв</h2><Button variant="ghost" onClick={closeSandbox} aria-label="Закрыть тест-драйв"><X size={20} /></Button></div>
    {!agent ? <div className="flex-1 p-8 flex flex-col items-center justify-center text-center gap-4"><MessagesSquare size={44} /><h3 className="text-lg font-semibold">Создайте ИИ-сотрудника</h3><p className="text-[var(--text-secondary)]">После сохранения инструкций здесь можно проверить ответы.</p><Link href="/dashboard/agents/new" onClick={closeSandbox} className="text-[var(--accent-link)]">Создать сотрудника</Link></div> : <>
      <div className="p-5 space-y-4 shrink-0"><label htmlFor="sandbox-agent" className="sr-only">ИИ-сотрудник</label><select id="sandbox-agent" className="w-full border rounded-md p-3 bg-[var(--surface)] text-sm" value={agentId} disabled={sending} onChange={(e) => { setSelected(e.target.value); setError(null); setDraft(''); }}>{agents.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.niche}</option>)}</select>
        <p className="flex gap-2 rounded-md bg-[var(--surface-secondary)] p-3 text-sm text-[var(--text-secondary)]"><Info size={17} className="shrink-0 mt-0.5" />Сообщения не отправляются клиентам. Записи в календаре не создаются.</p></div>
      <div className="flex-1 min-h-0 overflow-y-auto px-5 pb-5" aria-live="polite" aria-busy={sending}>
        {!messages.length && <div className="flex flex-col items-center text-center py-8 gap-5"><MessagesSquare size={56} strokeWidth={1.25} className="text-[var(--text-muted)]" /><div><h3 className="text-xl font-semibold">Проверьте ответы сотрудника</h3><p className="text-[var(--text-secondary)] mt-2">Задайте вопрос от лица клиента.</p></div><div className="space-y-2 w-full max-w-sm">{prompts.map((text) => <Button key={text} variant="outline" className="w-full" disabled={sending} onClick={() => send(text)}>{text}</Button>)}</div>{!agent.priceList.trim() && <div className="p-4 rounded-lg bg-[var(--accent-soft)] text-sm"><BookOpen size={22} className="mx-auto mb-2" />Сначала добавьте прайс и услуги в базу знаний.<Link href="/dashboard/agents" onClick={closeSandbox} className="block mt-3 text-[var(--accent-link)]">Открыть настройки сотрудника</Link></div>}</div>}
        <div className="space-y-4">{messages.map((message, i) => <div key={i} className={`flex ${message.role === 'user' ? 'justify-end' : ''}`}><div className={`max-w-[90%] rounded-lg p-3 whitespace-pre-wrap break-words text-sm ${message.role === 'user' ? 'bg-[var(--accent)] text-[var(--accent-text)]' : 'border bg-[var(--surface-secondary)]'}`}>{messageText(message.content)}</div></div>)}</div>
        {sending && <p role="status" className="text-sm text-[var(--text-secondary)] py-4">Сотрудник готовит ответ…</p>}
        {error && <p role="alert" className="text-sm text-[var(--danger-text)] border rounded-md p-3 mt-4">{error}</p>}<div ref={end} />
      </div>
      <div className="border-t p-4 shrink-0 space-y-3"><form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); void send(); }}><input aria-label="Сообщение сотруднику" value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={4000} className="min-w-0 flex-1 border rounded-md px-3 py-2 bg-[var(--surface)] text-base sm:text-sm" placeholder="Напишите сообщение…" /><Button type="submit" aria-label="Отправить сообщение" isLoading={sending} disabled={!draft.trim() || tokenBalance < 1}><Send size={18} /></Button></form><div className="flex flex-wrap justify-between items-center gap-2"><p className="text-xs text-[var(--text-secondary)]">Тестовые ответы расходуют токены. Баланс: {tokenBalance}.</p><Button variant="ghost" size="sm" disabled={sending || !messages.length} onClick={() => { setSessions((state) => ({ ...state, [agentId]: [] })); setError(null); setDraft(''); }}><RotateCcw size={15} />Начать заново</Button></div></div>
    </>}
  </Dialog>;
}
