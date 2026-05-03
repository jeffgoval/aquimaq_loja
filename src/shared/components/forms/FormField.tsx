import type { ReactNode } from 'react';
import { Label } from '@ds/primitives';

export interface FormFieldProps {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}

/**
 * FormField v1 — rótulo, controlo, dica de contexto e mensagem de erro alinhados ao design system.
 */
export function FormField({ id, label, error, hint, children }: FormFieldProps) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      {error ? <p className="text-xs text-danger">{error}</p> : null}
    </div>
  );
}
