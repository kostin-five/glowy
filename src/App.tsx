import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import AppLayout from "./layout/AppLayout";

import { useIsAuthenticated, useIsGuest } from "./store/useAuthStore";
import { lazy, Suspense, useEffect } from "react";
import { useFetchProgress, useFetchTasks } from "./store/useTaskStore";
import { useCheckAndResetEnergy, useToken } from "./store/useAuthStore";
import AuthLoader from "./components/ui/AuthLoader";

const TaskPage = lazy(() => import("./pages/TaskPage"));
const AnalyticsPage = lazy(() => import("./pages/AnalyticsPage"));
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const SuccessStairsPage = lazy(() => import("./pages/SuccessStairsPage"));
const LandingPage = lazy(() => import("./pages/LandingPage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const RegisterPage = lazy(() => import("./pages/RegisterPage"));
const PrivacyPolicyPage = lazy(() => import("./pages/PrivacyPolicyPage"));
const TermsOfServicePage = lazy(() => import("./pages/TermsOfServicePage"));

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const isAuthenticated = useIsAuthenticated();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

function App() {
  const isAuthenticated = useIsAuthenticated();
  const isGuest = useIsGuest();
  const token = useToken();
  const fetchTasks = useFetchTasks();
  const fetchProgress = useFetchProgress();
  const checkAndResetEnergy = useCheckAndResetEnergy();

  useEffect(() => {
    if (!isAuthenticated || !token || isGuest) return;

    fetchTasks();
    fetchProgress();
    checkAndResetEnergy();
  }, [
    checkAndResetEnergy,
    fetchProgress,
    fetchTasks,
    isAuthenticated,
    isGuest,
    token,
  ]);

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <Suspense
              fallback={
                <AuthLoader className="fixed left-1/2 top-1/2 h-7 w-7 -translate-x-1/2 -translate-y-1/2" />
              }
            >
              <LandingPage />
            </Suspense>
          }
        />
        <Route
          path="/privacy"
          element={
            <Suspense
              fallback={
                <AuthLoader className="fixed left-1/2 top-1/2 h-7 w-7 -translate-x-1/2 -translate-y-1/2" />
              }
            >
              <PrivacyPolicyPage />
            </Suspense>
          }
        />
        <Route
          path="/terms"
          element={
            <Suspense
              fallback={
                <AuthLoader className="fixed left-1/2 top-1/2 h-7 w-7 -translate-x-1/2 -translate-y-1/2" />
              }
            >
              <TermsOfServicePage />
            </Suspense>
          }
        />
        <Route
          path="/login"
          element={
            <Suspense
              fallback={
                <AuthLoader className="fixed left-1/2 top-1/2 h-7 w-7 -translate-x-1/2 -translate-y-1/2" />
              }
            >
              <LoginPage />
            </Suspense>
          }
        />
        <Route
          path="/register"
          element={
            <Suspense
              fallback={
                <AuthLoader className="fixed left-1/2 top-1/2 h-7 w-7 -translate-x-1/2 -translate-y-1/2" />
              }
            >
              <RegisterPage />
            </Suspense>
          }
        />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <AppLayout>
                <DashboardPage />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/tasks"
          element={
            <ProtectedRoute>
              <AppLayout>
                <TaskPage />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/analytics"
          element={
            <ProtectedRoute>
              <AppLayout>
                <AnalyticsPage />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/stairs"
          element={
            <ProtectedRoute>
              <AppLayout>
                <SuccessStairsPage />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route path="/success-stairs" element={<Navigate to="/stairs" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
