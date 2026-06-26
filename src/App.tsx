import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import AppLayout from "./layout/AppLayout";
import TaskPage from "./pages/TaskPage";

import {
  useIsAuthenticated,
  useIsGuest,
  useRestoreAuthSession,
  useAuthStore,
} from "./store/useAuthStore";
import {
  lazy,
  Suspense,
  useEffect,
  useLayoutEffect,
  useState,
  type ReactNode,
} from "react";
import { useFetchProgress, useFetchTasks } from "./store/useTaskStore";
import RouteLoader from "./components/ui/RouteLoader";
import CookieConsent from "./components/CookieConsent";
import {
  useSetDarkMode,
  useStartRoute,
  useThemeMode,
} from "./store/useSettingsStore";
import {
  clearLocalAuthSession,
  hasLegacyAuthToken,
  redirectToLogin,
} from "./api/authSession";

const AnalyticsPage = lazy(() => import("./pages/AnalyticsPage"));
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const SuccessStairsPage = lazy(() => import("./pages/SuccessStairsPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const LandingPage = lazy(() => import("./pages/LandingPage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const RegisterPage = lazy(() => import("./pages/RegisterPage"));
const PrivacyPolicyPage = lazy(() => import("./pages/PrivacyPolicyPage"));
const TermsOfServicePage = lazy(() => import("./pages/TermsOfServicePage"));
const PersonalDataConsentPage = lazy(
  () => import("./pages/PersonalDataConsentPage")
);
const OfferPage = lazy(() => import("./pages/OfferPage"));
const RefundPolicyPage = lazy(() => import("./pages/RefundPolicyPage"));
const ContactsPage = lazy(() => import("./pages/ContactsPage"));
const PricingPage = lazy(() => import("./pages/PricingPage"));

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

const PublicRoute = ({ children }: { children: ReactNode }) => {
  const isAuthenticated = useIsAuthenticated();
  const startRoute = useStartRoute();

  if (isAuthenticated) {
    return <Navigate to={startRoute} replace />;
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

import { handleUnauthorizedSession } from "./api/authSession";

function App() {
  const [isHydrated, setIsHydrated] = useState(() =>
    useAuthStore.persist.hasHydrated()
  );
  const isAuthenticated = useIsAuthenticated();
  const isGuest = useIsGuest();
  const fetchTasks = useFetchTasks();
  const fetchProgress = useFetchProgress();
  const themeMode = useThemeMode();
  const setDarkMode = useSetDarkMode();
  const startRoute = useStartRoute();
  const restoreAuthSession = useRestoreAuthSession();
  const hasLegacyToken = isHydrated && hasLegacyAuthToken();

  useEffect(() => {
    const handleUnauthorized = () => {
      handleUnauthorizedSession();
    };

    window.addEventListener("glowy:unauthorized", handleUnauthorized);
    return () => window.removeEventListener("glowy:unauthorized", handleUnauthorized);
  }, []);

  useLayoutEffect(() => {
    const systemThemeMedia = window.matchMedia("(prefers-color-scheme: dark)");

    const applyTheme = () => {
      const shouldUseDark =
        themeMode === "system"
          ? systemThemeMedia.matches
          : themeMode === "dark";

      document.documentElement.classList.toggle("dark", shouldUseDark);
      document.body.classList.toggle("dark", shouldUseDark);
      setDarkMode(shouldUseDark);
    };

    applyTheme();

    if (themeMode !== "system") return;

    systemThemeMedia.addEventListener("change", applyTheme);
    return () => systemThemeMedia.removeEventListener("change", applyTheme);
  }, [setDarkMode, themeMode]);

  useEffect(() => {
    const unsubFinishHydration = useAuthStore.persist.onFinishHydration(() =>
      setIsHydrated(true)
    );

    return () => unsubFinishHydration();
  }, []);

  useEffect(() => {
    if (!isHydrated) return;

    if (hasLegacyAuthToken()) {
      clearLocalAuthSession();
      redirectToLogin();
      return;
    }

    const initAuth = async () => {
      restoreAuthSession();
      if (!useAuthStore.getState().isGuest) {
        await useAuthStore.getState().checkAuth();
      }
    };

    initAuth();
  }, [isHydrated, restoreAuthSession]);

  useEffect(() => {
    if (hasLegacyToken) return;
    if (!isAuthenticated || isGuest) return;

    fetchTasks();
    fetchProgress();
  }, [fetchProgress, fetchTasks, hasLegacyToken, isAuthenticated, isGuest]);

  if (!isHydrated || hasLegacyToken) {
    return <RouteLoader className="fixed inset-0 min-h-dvh" />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <PublicRoute>
              <PublicLazyRoute>
                <LandingPage />
              </PublicLazyRoute>
            </PublicRoute>
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
          path="/personal-data-consent"
          element={
            <PublicLazyRoute>
              <PersonalDataConsentPage />
            </PublicLazyRoute>
          }
        />
        <Route
          path="/offer"
          element={
            <PublicLazyRoute>
              <OfferPage />
            </PublicLazyRoute>
          }
        />
        <Route
          path="/refund-policy"
          element={
            <PublicLazyRoute>
              <RefundPolicyPage />
            </PublicLazyRoute>
          }
        />
        <Route
          path="/contacts"
          element={
            <PublicLazyRoute>
              <ContactsPage />
            </PublicLazyRoute>
          }
        />
        <Route
          path="/pricing"
          element={
            <PublicLazyRoute>
              <PricingPage />
            </PublicLazyRoute>
          }
        />
        <Route
          path="/login"
          element={
            <PublicRoute>
              <PublicLazyRoute>
                <LoginPage />
              </PublicLazyRoute>
            </PublicRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicRoute>
              <PublicLazyRoute>
                <RegisterPage />
              </PublicLazyRoute>
            </PublicRoute>
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
        <Route path="*" element={<Navigate to={startRoute} replace />} />
      </Routes>
      <CookieConsent />
    </BrowserRouter>
  );
}

export default App;
