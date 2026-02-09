import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ReactFlowProvider } from "reactflow";
import LandingPage from "./pages/LandingPage";
import AnalysisPage from "./pages/AnalysisPage";
import PipelineCanvas from "./canvas/PipelineCanvas";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/analyze" element={<AnalysisPage />} />
        <Route
          path="/build"
          element={
            <ReactFlowProvider>
              <PipelineCanvas />
            </ReactFlowProvider>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
