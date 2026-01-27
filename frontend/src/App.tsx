import { ReactFlowProvider } from "reactflow";
import PipelineCanvas from "./canvas/PipelineCanvas";

export default function App() {
  return (
    <ReactFlowProvider>
      <PipelineCanvas />
    </ReactFlowProvider>
  );
}
