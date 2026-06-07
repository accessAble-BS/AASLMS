import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppBodyClass } from '@/components/AppBodyClass';
import { OAuthCallbackRedirect } from '@/components/OAuthCallbackRedirect';
import { LmsAccessRoute } from '@/components/LmsAccessRoute';
import { LmsEditorRoute } from '@/components/LmsEditorRoute';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { AuthCallback } from '@/pages/AuthCallback';
import { CataloguePage } from '@/pages/CataloguePage';
import { CoursePage } from '@/pages/CoursePage';
import { Landing } from '@/pages/Landing';
import { ModulePage } from '@/pages/ModulePage';
import { ViewerPage } from '@/pages/ViewerPage';

export default function App() {
  return (
    <BrowserRouter>
      <AppBodyClass />
      <OAuthCallbackRedirect />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/view" element={<ViewerPage />} />
        <Route
          element={
            <ProtectedRoute>
              <LmsAccessRoute>
                <DashboardLayout />
              </LmsAccessRoute>
            </ProtectedRoute>
          }
        >
          <Route
            path="/dashboard"
            element={
              <LmsEditorRoute>
                <CataloguePage />
              </LmsEditorRoute>
            }
          />
          <Route
            path="/course/:courseId"
            element={
              <LmsEditorRoute>
                <CoursePage />
              </LmsEditorRoute>
            }
          />
          <Route
            path="/module/:courseId/:moduleId"
            element={
              <LmsEditorRoute>
                <ModulePage />
              </LmsEditorRoute>
            }
          />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
