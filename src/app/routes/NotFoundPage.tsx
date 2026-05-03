import { Link } from 'react-router-dom';
import { Button } from '@ds/primitives';

export function NotFoundPage() {
  return (
    <div className="grid min-h-[60vh] place-items-center text-center">
      <div className="space-y-3">
        <p className="text-sm font-medium text-muted-foreground">404</p>
        <h1 className="text-2xl font-semibold">Página não encontrada</h1>
        <p className="text-sm text-muted-foreground">
          O recurso que você procura não existe ou ainda não foi implementado.
        </p>
        <Button asChild>
          <Link to="/">Voltar ao painel</Link>
        </Button>
      </div>
    </div>
  );
}
