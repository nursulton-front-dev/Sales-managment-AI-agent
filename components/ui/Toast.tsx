'use client';

import React from 'react';
import { useApp } from '@/context/AppContext';
import { CheckCircle2, AlertCircle, Info, X, AlertTriangle } from 'lucide-react';

export function ToastContainer() {
  const { toasts, removeToast } = useApp();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        let Icon = CheckCircle2;
        let iconColor = 'text-emerald-600 bg-emerald-50';
        let borderColor = 'border-emerald-200';

        if (toast.type === 'error') {
          Icon = AlertCircle;
          iconColor = 'text-red-600 bg-red-50';
          borderColor = 'border-red-200';
        } else if (toast.type === 'warning') {
          Icon = AlertTriangle;
          iconColor = 'text-amber-600 bg-amber-50';
          borderColor = 'border-amber-200';
        } else if (toast.type === 'info') {
          Icon = Info;
          iconColor = 'text-blue-600 bg-blue-50';
          borderColor = 'border-blue-200';
        }

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 bg-white rounded-xl shadow-lg border ${borderColor} transition-all duration-300 transform translate-y-0`}
          >
            <div className={`p-1.5 rounded-lg shrink-0 ${iconColor}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0 pt-0.5">
              <h4 className="text-sm font-semibold text-slate-900 leading-tight">
                {toast.title}
              </h4>
              {toast.description && (
                <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                  {toast.description}
                </p>
              )}
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-md transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
