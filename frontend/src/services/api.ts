export async function runPipeline(pipeline: any[]) {
  const res = await fetch("http://localhost:8000/run", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(pipeline)
  });

  return res.json();
}

const run = async () => {
  const pipeline = serializePipeline(nodes, edges);
  const result = await runPipeline(pipeline);
  console.log(result);
};
