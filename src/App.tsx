import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import TaskPage from "./pages/TaskPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import AppLayout from "./layout/AppLayout";
import DashboardPage from "./pages/DashboardPage";

function App() {
  return (
    <BrowserRouter>
      <AppLayout>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/tasks" element={<TaskPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppLayout>
    </BrowserRouter>
  );
}

export default App;
