import { CrmRouteGuard } from '@shared/components/auth/CrmRouteGuard';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

export function AppShell() {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto p-6">
          <CrmRouteGuard />
        </main>
      </div>
    </div>
  );
}
