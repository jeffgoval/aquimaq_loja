import { AppProviders } from '@app/providers';
import { AppRoutes } from '@app/routes/routes';
import { useAuthBootstrap } from '@modules/auth/hooks/useAuth';

function AppShellRoot() {
  useAuthBootstrap();
  return <AppRoutes />;
}

export default function App() {
  return (
    <AppProviders>
      <AppShellRoot />
    </AppProviders>
  );
}
