import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from '@app/layouts/AppShell';
import { ProtectedRoute } from '@shared/components/auth/ProtectedRoute';
import { LoginPage } from '@modules/auth/routes/LoginPage';
import { DashboardPage } from '@modules/dashboard/routes/DashboardPage';
import { StructureAccess } from '@modules/structure/routes/StructureAccess';
import { StructureLayout } from '@modules/structure/routes/StructureLayout';
import { StructureSegmentPage } from '@modules/structure/routes/StructureSegmentPage';
import { ProductsAccess } from '@modules/products/routes/ProductsAccess';
import { ProductsListPage } from '@modules/products/routes/ProductsListPage';
import { ProductEditorPage } from '@modules/products/routes/ProductEditorPage';
import { ProductImportPage } from '@modules/products/routes/ProductImportPage';
import { InventoryAccess } from '@modules/inventory/routes/InventoryAccess';
import { InventoryPage } from '@modules/inventory/routes/InventoryPage';
import { TasksPage } from '@modules/tasks/routes/TasksPage';
import { PurchasesAccess } from '@modules/purchases/routes/PurchasesAccess';
import { PurchasesPage } from '@modules/purchases/routes/PurchasesPage';
import { ReceivingAccess } from '@modules/receiving/routes/ReceivingAccess';
import { ReceivingPage } from '@modules/receiving/routes/ReceivingPage';
import { WorkshopAccess } from '@modules/workshop/routes/WorkshopAccess';
import { WorkshopPage } from '@modules/workshop/routes/WorkshopPage';
import { NotFoundPage } from './NotFoundPage';

/**
 * Rotas protegidas no shell — evoluir por fase mantendo este arquivo como referência.
 */
export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />

        <Route path="structure" element={<StructureAccess />}>
          <Route element={<StructureLayout />}>
            <Route index element={<Navigate to="result-centers" replace />} />
            <Route path=":segment" element={<StructureSegmentPage />} />
          </Route>
        </Route>

        <Route path="products" element={<ProductsAccess />}>
          <Route index element={<ProductsListPage />} />
          <Route path="import" element={<ProductImportPage />} />
          <Route path="new" element={<ProductEditorPage />} />
          <Route path=":id/edit" element={<ProductEditorPage />} />
        </Route>

        <Route path="inventory" element={<InventoryAccess />}>
          <Route index element={<InventoryPage />} />
        </Route>

        <Route path="purchases" element={<PurchasesAccess />}>
          <Route index element={<PurchasesPage />} />
        </Route>

        <Route path="receiving" element={<ReceivingAccess />}>
          <Route index element={<ReceivingPage />} />
        </Route>

        <Route path="workshop" element={<WorkshopAccess />}>
          <Route index element={<WorkshopPage />} />
        </Route>

        <Route path="tasks" element={<TasksPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
      <Route path="/404" element={<NotFoundPage />} />
    </Routes>
  );
}
