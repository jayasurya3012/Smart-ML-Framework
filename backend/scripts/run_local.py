import json
from backend.schemas.block_schema import Block
from backend.orchestrator.run_pipeline import run_pipeline


with open("examples/pipelines/churn_pipeline.json") as f:
    raw_blocks = json.load(f)

blocks = [Block(**b) for b in raw_blocks]

context = run_pipeline(blocks)

print("METRICS:")
print(context["metrics"])
