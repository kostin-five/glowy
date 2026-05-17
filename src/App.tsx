import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import TaskPage from "./pages/TaskPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import AppLayout from "./layout/AppLayout";
import DashboardPage from "./pages/DashboardPage";
import { useIsAuthenticated } from "./store/useAuthStore";
import { useEffect } from "react";
import { useFetchTasks } from "./store/useTaskStore";
import RegisterPage from "./pages/RegisterPage";
import LoginPage from "./pages/LoginPage";

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const isAuthenticated = useIsAuthenticated();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

function App() {
  const fetchTasks = useFetchTasks();
  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

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
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
