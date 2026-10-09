import pytest
from langchain_core.language_models.fake_chat_models import FakeListChatModel
from app.graph.state import AgentState
from app.graph.workflow import create_agent_workflow
from app.tools.client import ToolClient
from app.core.config import settings

class MockToolClient:
    def __init__(self):
        self.calls = []

    async def get_recent_journal_entries(self, user_id: str, limit: int = 5):
        self.calls.append(("get_recent_journal_entries", user_id, limit))
        return {
            "success": True,
            "data": {
                "entries": [
                    {"id": "j_1", "content": "Went for a peaceful walk today", "createdAt": "2026-10-07T12:00:00Z"}
                ],
                "total": 1,
            },
        }

    async def get_emotion_trends(self, user_id: str, days: int = 7):
        self.calls.append(("get_emotion_trends", user_id, days))
        return {
            "success": True,
            "data": {
                "days": days,
                "dominantEmotion": "calm",
                "totalAnalyses": 3,
            },
        }

    async def search_memory(self, user_id: str, query: str, limit: int = 5, min_similarity: float = 0.2):
        self.calls.append(("search_memory", user_id, query, limit))
        return {
            "success": True,
            "data": {
                "query": query,
                "results": [
                    {"id": "mem_1", "content": "I felt grounded in the forest", "similarity": 0.88, "sourceType": "JOURNAL_ENTRY"}
                ],
            },
        }

    async def create_wellness_goal(self, user_id: str, title: str, description: str = None, target_date: str = None, approved: bool = False):
        self.calls.append(("create_wellness_goal", user_id, title, approved))
        if not approved:
            return {
                "success": True,
                "data": {"status": "PENDING_APPROVAL", "requiresApproval": True},
            }
        return {
            "success": True,
            "data": {
                "status": "ACTIVE",
                "requiresApproval": False,
                "goal": {"id": "g_123", "title": title, "status": "ACTIVE"},
            },
        }

@pytest.mark.asyncio
async def test_normal_reflection_workflow():
    mock_client = MockToolClient()
    workflow = create_agent_workflow(mock_client)

    state = AgentState(
        user_id="user_test_1",
        thread_id="thread_test_1",
        message="I have been feeling a bit overwhelmed, can you check how I was feeling earlier?",
    )

    result = await workflow.ainvoke(state)
    events = result["events"]
    event_types = [e["type"] for e in events]

    assert "agent.started" in event_types
    assert "tool.started" in event_types
    assert "tool.completed" in event_types
    assert "content.delta" in event_types
    assert "agent.completed" in event_types
    assert result["final_response"] != ""
    assert ("search_memory", "user_test_1", state.message, 3) in mock_client.calls

@pytest.mark.asyncio
async def test_goal_mutation_requires_approval():
    mock_client = MockToolClient()
    workflow = create_agent_workflow(mock_client)

    state = AgentState(
        user_id="user_test_2",
        thread_id="thread_test_2",
        message="I want to commit to a daily morning breathwork habit",
    )

    result = await workflow.ainvoke(state)
    events = result["events"]
    event_types = [e["type"] for e in events]

    assert "approval.required" in event_types
    approval_event = next(e for e in events if e["type"] == "approval.required")
    assert approval_event["data"]["tool"] == "create_wellness_goal"
    assert "Morning Breathwork Practice" in approval_event["data"]["proposedAction"]["title"]
    assert result.get("action_result") is None  # Not executed yet!

@pytest.mark.asyncio
async def test_approval_resumption_executes_goal():
    mock_client = MockToolClient()
    workflow = create_agent_workflow(mock_client)

    resumed_state = AgentState(
        user_id="user_test_2",
        thread_id="thread_test_2",
        message="User confirmed approval",
        intent="goal_planning",
        approved=True,
        pending_action={
            "actionId": "act_test",
            "tool": "create_wellness_goal",
            "title": "Morning Breathwork Practice",
            "description": "5 minutes box breathing",
        },
    )

    result = await workflow.ainvoke(resumed_state)
    events = result["events"]
    event_types = [e["type"] for e in events]

    assert "approval.required" not in event_types
    assert result["action_result"] is not None
    assert result["action_result"]["status"] == "ACTIVE"
    assert ("create_wellness_goal", "user_test_2", "Morning Breathwork Practice", True) in mock_client.calls

@pytest.mark.asyncio
async def test_rejection_cancels_action_and_blocks_mutation():
    """Verify approved=False cancels action, blocks tool execution, and returns empathetic refusal."""
    mock_client = MockToolClient()
    workflow = create_agent_workflow(mock_client)

    rejected_state = AgentState(
        user_id="user_test_3",
        thread_id="thread_test_3",
        message="User declined goal action",
        intent="goal_planning",
        approved=False,
        rejected=True,
        pending_action={
            "actionId": "act_test_reject",
            "tool": "create_wellness_goal",
            "title": "Daily Evening Walk",
        },
    )

    result = await workflow.ainvoke(rejected_state)
    events = result["events"]
    event_types = [e["type"] for e in events]

    # Crucial assertion: approval.required must NOT be re-emitted
    assert "approval.required" not in event_types
    # Crucial assertion: create_wellness_goal tool must NOT be executed
    assert not any(call[0] == "create_wellness_goal" for call in mock_client.calls)
    # Action result must be CANCELLED
    assert result.get("action_result", {}).get("status") == "CANCELLED"
    # Final response must empathetically acknowledge cancellation
    assert "cancelled setting this goal" in result["final_response"].lower()

@pytest.mark.asyncio
async def test_custom_llm_model_reasoning_integration():
    """Verify model reasoning integration using mock chat model."""
    mock_client = MockToolClient()
    fake_llm = FakeListChatModel(
        responses=["I hear how much thoughtfulness you bring to your daily emotional reflections."]
    )
    workflow = create_agent_workflow(mock_client, llm=fake_llm)

    state = AgentState(
        user_id="user_test_4",
        thread_id="thread_test_4",
        message="I'm feeling calm and reflective today about the sunset.",
    )

    result = await workflow.ainvoke(state)
    assert "I hear how much thoughtfulness you bring" in result["final_response"]

@pytest.mark.asyncio
async def test_production_provider_outage_produces_controlled_error():
    """Verify provider failures in production produce controlled error events rather than disguised mocks."""
    mock_client = MockToolClient()
    
    class FailingChatModel:
        async def ainvoke(self, *args, **kwargs):
            raise RuntimeError("Simulated upstream provider outage / rate limit")

    workflow = create_agent_workflow(mock_client, llm=FailingChatModel())
    original_env = settings.ENVIRONMENT
    settings.ENVIRONMENT = "production"
    try:
        state = AgentState(
            user_id="user_test_5",
            thread_id="thread_test_5",
            message="Check in with me please",
        )
        result = await workflow.ainvoke(state)
        events = result["events"]
        error_events = [e for e in events if e.get("type") == "agent.error"]
        assert len(error_events) == 1
        assert error_events[0]["data"]["code"] == "PROVIDER_ERROR"
        # Must not expose raw internal tracebacks
        assert "Simulated upstream provider outage" not in error_events[0]["data"]["message"]
    finally:
        settings.ENVIRONMENT = original_env
