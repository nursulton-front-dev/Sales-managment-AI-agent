'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { useApp, type Agent } from '@/context/AppContext';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Dialog } from '@/components/ui/Dialog';
import { DataState } from '@/components/ui/DataState';
import { useUnsavedChanges } from '@/lib/useUnsavedChanges';
import { Users, Plus, Play, BookOpen, Plug, CalendarDays, X, ArrowRight } from 'lucide-react';

export default function AgentsPage() { return <Suspense><AgentList /></Suspense>; }
function AgentList() {
  const { agents, agentsLoading, agentsError, refreshAgents, openSandbox, toggleAgentStatus, workspace } = useApp();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const searchParams = useSearchParams();
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const editing = agents.find((agent) => agent.id === (editingId || searchParams.get('edit')));
  const closeEditor = () => { setEditingId(null); if (searchParams.has('edit')) router.replace('/dashboard/agents', { scroll: false }); };
  const filtered = agents.filter((agent) => agent.name.toLowerCase().includes(query.toLowerCase()) && (filter === 'all' || (filter === 'active' ? agent.isActive : !agent.isActive)));
  const connected = (agent: Agent) => agent.telegramConnected || (workspace?.instagramConnected && workspace.instagramAgentId === agent.id);
  if (agentsLoading || agentsError) return <DataState loading={agentsLoading} error={agentsError} retry={refreshAgents} />;
  return <div className="space-y-6">
    <PageHeader title="ИИ-сотрудники" description="Настраивайте ответы, знания и каналы общения." actions={<Link className="inline-flex gap-2 items-center rounded-md px-4 py-2.5 bg-[var(--accent)] text-[var(--accent-text)] font-medium text-sm" href="/dashboard/agents/new"><Plus size={16} />Создать сотрудника</Link>} />
    {agents.length > 0 && <div className="flex flex-col sm:flex-row gap-3 max-w-3xl"><Input aria-label="Найти сотрудника" placeholder="Найти сотрудника" value={query} onChange={(e) => setQuery(e.target.value)} /><Select aria-label="Статус сотрудника" value={filter} onChange={(e) => setFilter(e.target.value)} options={[{ value: 'all', label: 'Все статусы' }, { value: 'active', label: 'Включены' }, { value: 'paused', label: 'На паузе' }]} /></div>}
    {!filtered.length ? <Card><CardBody className="text-center py-16"><Users size={40} className="mx-auto mb-4 text-[var(--text-muted)]" /><h2 className="font-semibold text-lg">{agents.length ? 'Сотрудники не найдены' : 'Создайте первого ИИ-сотрудника'}</h2><p className="text-[var(--text-secondary)] mt-2">{agents.length ? 'Измените поиск или фильтр.' : 'Добавьте инструкции и прайс, затем проверьте ответы.'}</p></CardBody></Card> : <div className="grid xl:grid-cols-[1fr_320px] gap-5">
      <div className="space-y-5">{filtered.map((agent) => <Card key={agent.id}><CardBody>
        <div className="flex gap-4 items-start"><div className="w-14 h-14 rounded-full bg-[var(--surface-secondary)] flex items-center justify-center shrink-0"><Users size={26} strokeWidth={1.5} /></div><div className="min-w-0 flex-1"><h2 className="text-lg font-semibold">{agent.name}</h2><p className="text-sm text-[var(--text-secondary)] mt-1">{agent.niche}</p><div className="mt-2"><Badge variant={!agent.isActive ? 'neutral' : connected(agent) ? 'success' : 'warning'}>{!agent.isActive ? 'На паузе' : connected(agent) ? 'Канал подключён' : 'Только тестирование'}</Badge></div></div></div>
        <dl className="divide-y border-y my-6">
          <div className="py-4 flex gap-3 items-center"><BookOpen size={19} /><dt>База знаний</dt><dd className="ml-auto text-sm text-[var(--text-secondary)]">{agent.priceList.trim() ? 'Добавлена' : 'Нужно заполнить'}</dd></div>
          <div className="py-4 flex gap-3 items-center"><Plug size={19} /><dt>Каналы</dt><dd className="ml-auto text-sm text-[var(--text-secondary)]">{connected(agent) ? 'Подключены' : 'Не подключены'}</dd></div>
          <div className="py-4 flex gap-3 items-center"><CalendarDays size={19} /><dt>Календарь</dt><dd className="ml-auto text-sm text-[var(--text-secondary)]">{workspace?.googleCalendarConnected && agent.googleCalendarEnabled ? 'Подключён' : 'Не подключён'}</dd></div>
        </dl>
        {!connected(agent) && <p className="text-sm p-3 bg-[var(--surface-secondary)] rounded-md text-[var(--text-secondary)] mb-5">Подключите канал, чтобы сотрудник начал отвечать клиентам.</p>}
        <div className="flex flex-wrap gap-3"><Button variant="outline" className="flex-1" onClick={() => setEditingId(agent.id)}>Настроить</Button><Button variant="outline" className="flex-1" onClick={() => openSandbox(agent.id)}><Play size={16} />Тест-драйв</Button><Button variant="ghost" onClick={() => toggleAgentStatus(agent.id)}>{agent.isActive ? 'Приостановить' : 'Включить'}</Button></div>
      </CardBody></Card>)}</div>
      <Card className="self-start"><CardBody className="space-y-5"><h2 className="font-semibold text-lg">Следующий шаг</h2><p><strong>1. Проверьте прайс и услуги</strong><span className="block text-sm text-[var(--text-secondary)] mt-2">Используйте актуальную информацию о вашей компании.</span></p><p><strong>2. Подключите канал общения</strong><span className="block text-sm text-[var(--text-secondary)] mt-2">Выберите сотрудника, который будет отвечать клиентам.</span></p><Link href="/dashboard/integrations" className="flex items-center gap-2 text-[var(--accent-link)] text-sm">Открыть интеграции <ArrowRight size={16} /></Link></CardBody></Card>
    </div>}
    {editing && <AgentEditor key={editing.id} agent={editing} onClose={closeEditor} onSaved={refreshAgents} />}
  </div>;
}

function AgentEditor({ agent, onClose, onSaved }: { agent: Agent; onClose: () => void; onSaved: () => Promise<void> }) {
  const { showToast } = useApp();
  const [name, setName] = useState(agent.name);
  const [knowledge, setKnowledge] = useState(agent.priceList);
  const [prompt, setPrompt] = useState(agent.systemPrompt);
  const [questions, setQuestions] = useState(agent.qualificationQuestions.join('\n'));
  const [saving, setSaving] = useState(false);
  const dirty = name !== agent.name || knowledge !== agent.priceList || prompt !== agent.systemPrompt || questions !== agent.qualificationQuestions.join('\n');
  useUnsavedChanges(dirty);
  const closeEditor = () => { if (!saving && (!dirty || window.confirm('Изменения не сохранены. Закрыть редактор?'))) onClose(); };
  return <Dialog open onClose={closeEditor} label="Настройка ИИ-сотрудника" className="w-2xl">
      <form className="p-6 space-y-5" onSubmit={async (e) => { e.preventDefault(); if (saving) return; setSaving(true); try { const res = await fetch('/api/agents', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: agent.id, name, knowledgeBase: knowledge, systemPrompt: prompt, qualificationQuestions: questions.split('\n').map((q) => q.trim()).filter(Boolean) }) }); const data = await res.json(); if (!res.ok || !data.success) throw new Error(data.error || 'Ошибка сохранения'); onClose(); await onSaved(); showToast('Настройки сотрудника сохранены'); } catch (error) { showToast('Не удалось сохранить', error instanceof Error ? error.message : 'Ошибка сети', 'error'); } finally { setSaving(false); } }}>
        <div className="flex justify-between items-center"><h2 className="font-semibold text-lg">Настройка сотрудника</h2><Button variant="ghost" onClick={closeEditor} aria-label="Закрыть редактор"><X size={20} /></Button></div>
        <Input label="Имя сотрудника" required maxLength={200} value={name} onChange={(e) => setName(e.target.value)} />
        {[['knowledge', 'Услуги и прайс', knowledge, setKnowledge], ['questions', 'Вопросы квалификации — по одному на строке', questions, setQuestions], ['prompt', 'Инструкции сотруднику', prompt, setPrompt]].map(([id, label, value, setter]) => <div key={id as string}><label htmlFor={id as string} className="block text-sm font-medium mb-2">{label as string}</label><textarea id={id as string} rows={5} className="w-full border rounded-md bg-[var(--surface)] p-3 text-sm" value={value as string} onChange={(e) => (setter as (v: string) => void)(e.target.value)} required={id === 'prompt'} /></div>)}
        <Button type="submit" isLoading={saving}>Сохранить изменения</Button>
      </form>
    </Dialog>;
}
