# RAIL-BLOCK AI: FastAPI Application Gateway
# Serves the AI/ML optimizer to the frontend dashboard

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Optional
import uvicorn

# Import the Python algorithms from our AI engine
from ai_engine import RailBlockOptimizer

app = FastAPI(
    title="RAIL-BLOCK AI Gateway",
    description="REST API for Indian Railways Automatic Block Planning Solver",
    version="1.0.0"
)

# Enable CORS (Cross-Origin Resource Sharing)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for local prototyping
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic schemas for data validation
class BlockRequest(BaseModel):
    id: str
    dept: str
    deptName: str
    workType: str
    section: str
    stationStartY: float
    stationEndY: float
    start: str
    end: str
    machine: str

class Stop(BaseModel):
    code: str
    time: str

class TrainPath(BaseModel):
    id: str
    number: str
    name: str
    type: str
    stops: List[Stop]
    delays: Dict[str, List[int]]

class OptimizationInput(BaseModel):
    requests: List[BlockRequest]
    trains: List[TrainPath]

@app.get("/api/status")
def read_status():
    return {
        "status": "online",
        "service": "RAIL-BLOCK AI",
        "engine": "CP-SAT MILP & ST-GCN Predictor"
    }

@app.post("/api/optimize")
def run_optimization(payload: OptimizationInput):
    try:
        # Instantiate optimizer
        stations = ["SBC", "BNC", "KJM", "WFD", "MLO", "BWT"]
        optimizer = RailBlockOptimizer(stations)
        
        # Convert input payload to standard python lists of dicts
        req_dicts = [req.dict() for req in payload.requests]
        train_dicts = [train.dict() for train in payload.trains]
        
        # Run optimization algorithms (DBSCAN + GNN + RL + Solver)
        result = optimizer.optimize(req_dicts, train_dicts)
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Optimizer error: {str(e)}")

if __name__ == "__main__":
    # Start server on localhost:8000
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
