import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import TaskPage from "./pages/TaskPage";
import ProgressPage from "./pages/ProgressPage";
import Sidebar from "./components/Sidebar";

function App() {
  return (
    <div className="flex">
      <BrowserRouter>
        <Sidebar />
        <Routes>
          <Route path="/" element={<TaskPage />} />
          <Route path="/progress" element={<ProgressPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
