import json
import asyncio
from typing import Any, Dict, Optional
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from app.api.auth import verify_internal_hmac
from app.graph.state import AgentState
from app.graph.workflow import create_agent_workflow

router = APIRouter(
    prefix="/internal/v1/agent",
    dependencies=[Depends(verify_internal_hmac)],
)

workflow = create_agent_workflow()

class AgentRunRequest(BaseModel):
    userId: str
    threadId: str
    message: str

class AgentResumeRequest(BaseModel):
    userId: str
    threadId: str
    actionId: str
    approved: bool
    modifiedPayload: Optional[Dict[str, Any]] = None

async def format_sse_stream(events: list):
    for event in events:
        data_json = json.dumps(event.get("data", {}))
        yield f"event: {event['type']}\ndata: {data_json}\n\n"
        await asyncio.sleep(0.02)

@router.post("/run")
async def run_agent(req: AgentRunRequest):
    initial_state = AgentState(
        user_id=req.userId,
        thread_id=req.threadId,
        message=req.message,
    )

    final_state = await workflow.ainvoke(initial_state)
    events = final_state.get("events", [])

    return StreamingResponse(
        format_sse_stream(events),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )

@router.post("/resume")
async def resume_agent(req: AgentResumeRequest):
    # Prepare resumed state with human approval confirmation
    resume_state = AgentState(
        user_id=req.userId,
        thread_id=req.threadId,
        message="User confirmed goal action",
        intent="goal_planning",
        approved=req.approved,
        pending_action={
            "actionId": req.actionId,
            "tool": "create_wellness_goal",
            "title": (req.modifiedPayload or {}).get("title", "Daily Mindful Reflection"),
            "description": (req.modifiedPayload or {}).get("description", "Dedicated time for wellbeing."),
        },
    )

    final_state = await workflow.ainvoke(resume_state)
    events = final_state.get("events", [])

    return StreamingResponse(
        format_sse_stream(events),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
