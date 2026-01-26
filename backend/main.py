from fastapi import FastAPI
from schemas.block_schema import Block
from orchestrator.run_pipeline import run_pipeline

app = FastAPI()

@app.post("/run")
def run(blocks: list[Block]):
    context = run_pipeline(blocks)
    return {
        "metrics": context.get("metrics", {}),
    }
