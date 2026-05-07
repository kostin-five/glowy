import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import TaskPage from "./pages/TaskPage";
import ProgressPage from "./pages/ProgressPage";
import AppLayout from "./layout/AppLayout";

function App() {
  return (
    <div className="flex">
      <BrowserRouter>
        <AppLayout>
          <Routes>
            <Route path="/" element={<TaskPage />} />
            <Route path="/progress" element={<ProgressPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AppLayout>
      </BrowserRouter>
    </div>
  );
}

export default App;
