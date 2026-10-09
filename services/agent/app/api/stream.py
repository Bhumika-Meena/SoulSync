import json
import asyncio
from typing import Any, Dict, Optional, Set
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from langgraph.checkpoint.memory import MemorySaver

from app.api.auth import verify_internal_hmac
from app.graph.state import AgentState
from app.graph.workflow import create_agent_workflow

router = APIRouter(
    prefix="/internal/v1/agent",
    dependencies=[Depends(verify_internal_hmac)],
)

# Process-local MemorySaver checkpointer for thread execution state
memory_saver = MemorySaver()
workflow = create_agent_workflow(checkpointer=memory_saver)

# Process-local action tracking for authorization binding and duplicate prevention
_action_ownership: Dict[str, str] = {}
_processed_actions: Set[str] = set()

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

    final_state = await workflow.ainvoke(
        initial_state,
        config={"configurable": {"thread_id": req.threadId}},
    )
    events = final_state.get("events", [])

    # Register ownership of any proposed actions to prevent unauthorized resumption
    for ev in events:
        if ev.get("type") == "approval.required":
            act_id = ev.get("data", {}).get("actionId")
            if act_id:
                _action_ownership[act_id] = req.userId

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
    # 1. Authorize: Ensure action belongs to the requesting user if known
    if req.actionId in _action_ownership and _action_ownership[req.actionId] != req.userId:
        raise HTTPException(
            status_code=403,
            detail="Unauthorized: Action does not belong to the authenticated user",
        )

    # 2. Prevent duplicate execution of mutating or finalized actions
    if req.actionId in _processed_actions:
        raise HTTPException(
            status_code=409,
            detail="Action has already been processed",
        )

    _processed_actions.add(req.actionId)

    # 3. Build resume state according to human decision
    if req.approved:
        resume_state = AgentState(
            user_id=req.userId,
            thread_id=req.threadId,
            message="User confirmed goal action",
            intent="goal_planning",
            approved=True,
            rejected=False,
            pending_action={
                "actionId": req.actionId,
                "tool": "create_wellness_goal",
                "title": (req.modifiedPayload or {}).get("title", "Daily Mindful Reflection"),
                "description": (req.modifiedPayload or {}).get("description", "Dedicated time for wellbeing."),
            },
        )
    else:
        resume_state = AgentState(
            user_id=req.userId,
            thread_id=req.threadId,
            message="User declined goal action",
            intent="goal_planning",
            approved=False,
            rejected=True,
            pending_action=None,
        )

    final_state = await workflow.ainvoke(
        resume_state,
        config={"configurable": {"thread_id": req.threadId}},
    )
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
