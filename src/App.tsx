import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import AppLayout from "./layout/AppLayout";
import TaskPage from "./pages/TaskPage";

import { useIsAuthenticated, useIsGuest } from "./store/useAuthStore";
import { lazy, Suspense, useEffect, useLayoutEffect, type ReactNode } from "react";
import { useFetchProgress, useFetchTasks } from "./store/useTaskStore";
import { useCheckAndResetEnergy, useToken } from "./store/useAuthStore";
import RouteLoader from "./components/ui/RouteLoader";
import { useIsDarkMode } from "./store/useSettingsStore";

const AnalyticsPage = lazy(() => import("./pages/AnalyticsPage"));
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const SuccessStairsPage = lazy(() => import("./pages/SuccessStairsPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const LandingPage = lazy(() => import("./pages/LandingPage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const RegisterPage = lazy(() => import("./pages/RegisterPage"));
const PrivacyPolicyPage = lazy(() => import("./pages/PrivacyPolicyPage"));
const TermsOfServicePage = lazy(() => import("./pages/TermsOfServicePage"));

const PublicLazyRoute = ({ children }: { children: ReactNode }) => (
  <Suspense fallback={<RouteLoader className="fixed inset-0 min-h-dvh" />}>
    {children}
  </Suspense>
);

const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const isAuthenticated = useIsAuthenticated();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

const ProtectedLayoutRoute = ({
  children,
  lazy = true,
}: {
  children: ReactNode;
  lazy?: boolean;
}) => (
  <ProtectedRoute>
    <AppLayout>
      {lazy ? (
        <Suspense
          fallback={
            <RouteLoader className="min-h-[calc(100dvh-8rem)] bg-transparent" />
          }
        >
          {children}
        </Suspense>
      ) : (
        children
      )}
    </AppLayout>
  </ProtectedRoute>
);

function App() {
  const isAuthenticated = useIsAuthenticated();
  const isGuest = useIsGuest();
  const token = useToken();
  const fetchTasks = useFetchTasks();
  const fetchProgress = useFetchProgress();
  const checkAndResetEnergy = useCheckAndResetEnergy();
  const isDarkMode = useIsDarkMode();

  useLayoutEffect(() => {
    document.documentElement.classList.toggle("dark", isDarkMode);
    document.body.classList.toggle("dark", isDarkMode);
  }, [isDarkMode]);

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
            <PublicLazyRoute>
              <LandingPage />
            </PublicLazyRoute>
          }
        />
        <Route
          path="/privacy"
          element={
            <PublicLazyRoute>
              <PrivacyPolicyPage />
            </PublicLazyRoute>
          }
        />
        <Route
          path="/terms"
          element={
            <PublicLazyRoute>
              <TermsOfServicePage />
            </PublicLazyRoute>
          }
        />
        <Route
          path="/login"
          element={
            <PublicLazyRoute>
              <LoginPage />
            </PublicLazyRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicLazyRoute>
              <RegisterPage />
            </PublicLazyRoute>
          }
        />

        <Route
          path="/dashboard"
          element={
            <ProtectedLayoutRoute>
              <DashboardPage />
            </ProtectedLayoutRoute>
          }
        />
        <Route
          path="/tasks"
          element={
            <ProtectedLayoutRoute lazy={false}>
              <TaskPage />
            </ProtectedLayoutRoute>
          }
        />
        <Route
          path="/analytics"
          element={
            <ProtectedLayoutRoute>
              <AnalyticsPage />
            </ProtectedLayoutRoute>
          }
        />
        <Route
          path="/stairs"
          element={
            <ProtectedLayoutRoute>
              <SuccessStairsPage />
            </ProtectedLayoutRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedLayoutRoute>
              <SettingsPage />
            </ProtectedLayoutRoute>
          }
        />
        <Route
          path="/success-stairs"
          element={<Navigate to="/stairs" replace />}
        />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
