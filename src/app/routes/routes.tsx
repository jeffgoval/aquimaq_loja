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
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
      <Route path="/404" element={<NotFoundPage />} />
    </Routes>
  );
}
