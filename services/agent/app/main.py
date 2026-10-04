import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="SoulSync AI Agent Service",
    version="0.1.0",
    description="Stateful reasoning engine built with LangGraph",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/healthz")
async def health_check():
    return {"status": "ok", "service": "soulsync-agent", "version": "0.1.0"}
