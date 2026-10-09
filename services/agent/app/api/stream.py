import json
import logging
from typing import Any, AsyncGenerator, Dict, Optional, Set
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from langgraph.checkpoint.memory import MemorySaver

from app.api.auth import verify_internal_hmac
from app.graph.state import AgentState
from app.graph.workflow import create_agent_workflow

logger = logging.getLogger(__name__)

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

async def stream_workflow_events(
    state: AgentState, config: Dict[str, Any]
) -> AsyncGenerator[str, None]:
    """Streams genuine incremental model tokens and lifecycle events over SSE.

    Uses LangGraph's astream_events(..., version='v2') to intercept real-time
    chat model token deltas (on_chat_model_stream) and node lifecycle events,
    filtering out internal reasoning, prompts, and raw tool arguments.
    """
    last_event_index = 0
    token_streamed = False

    try:
        async for ev in workflow.astream_events(state, version="v2", config=config):
            ev_name = ev.get("event")

            # 1. Real incremental model token streaming
            if ev_name == "on_chat_model_stream":
                chunk = ev.get("data", {}).get("chunk")
                chunk_text = ""
                if chunk is not None:
                    if hasattr(chunk, "content") and isinstance(chunk.content, str):
                        chunk_text = chunk.content
                    elif isinstance(chunk, str):
                        chunk_text = chunk
                if chunk_text:
                    token_streamed = True
                    payload = json.dumps({"text": chunk_text})
                    yield f"event: content.delta\ndata: {payload}\n\n"

            # 2. Node lifecycle & tool events as nodes complete
            elif ev_name == "on_chain_end" and ev.get("name") in [
                "triage_intent",
                "retrieve_context",
                "reason_and_plan",
                "check_approval",
                "safety_validate",
                "generate_response",
            ]:
                node_output = ev.get("data", {}).get("output")
                if isinstance(node_output, dict):
                    node_events = node_output.get("events", [])
                    if len(node_events) > last_event_index:
                        new_events = node_events[last_event_index:]
                        last_event_index = len(node_events)
                        for e in new_events:
                            etype = e.get("type")
                            # If tokens were streamed genuinely from the model, omit synthetic chunks
                            if etype == "content.delta" and token_streamed:
                                continue
                            if etype == "approval.required":
                                act_id = e.get("data", {}).get("actionId")
                                if act_id:
                                    _action_ownership[act_id] = state.user_id

                            data_json = json.dumps(e.get("data", {}))
                            yield f"event: {etype}\ndata: {data_json}\n\n"

    except Exception as exc:
        logger.error("Error during agent event stream: %s", type(exc).__name__)
        err_payload = json.dumps({
            "code": "PROVIDER_ERROR",
            "message": "A streaming interruption occurred with the companion service.",
        })
        yield f"event: agent.error\ndata: {err_payload}\n\n"

@router.post("/run")
async def run_agent(req: AgentRunRequest):
    initial_state = AgentState(
        user_id=req.userId,
        thread_id=req.threadId,
        message=req.message,
    )
    config = {"configurable": {"thread_id": req.threadId}}

    return StreamingResponse(
        stream_workflow_events(initial_state, config),
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

    config = {"configurable": {"thread_id": req.threadId}}

    return StreamingResponse(
        stream_workflow_events(resume_state, config),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
