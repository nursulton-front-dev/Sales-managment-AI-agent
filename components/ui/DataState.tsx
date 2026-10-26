import { AlertCircle, LoaderCircle } from 'lucide-react';
import { Button } from './Button';

export function DataState({ loading, error, retry }: { loading?: boolean; error?: string | null; retry?: () => void }) {
  if (!loading && !error) return null;
  return <div role={error ? 'alert' : 'status'} className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6 flex flex-wrap items-center gap-3">
    {error ? <AlertCircle size={20} /> : <LoaderCircle size={20} className="animate-spin" />}
    <p className="flex-1 min-w-0">{error || 'Загружаем данные…'}</p>
    {error && retry && <Button variant="outline" onClick={retry}>Повторить</Button>}
  </div>;
}
