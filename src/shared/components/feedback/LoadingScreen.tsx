import { Loader2 } from 'lucide-react';

interface LoadingScreenProps {
  label?: string;
}

export function LoadingScreen({ label = 'Carregando...' }: LoadingScreenProps) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-muted-foreground">
      <Loader2 className="h-6 w-6 animate-spin" />
      <span className="text-sm">{label}</span>
    </div>
  );
}
