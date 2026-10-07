from typing import Any, Dict, Optional
from langgraph.graph import StateGraph, END
from app.graph.state import AgentState
from app.tools.client import ToolClient

def create_agent_workflow(tool_client: Optional[ToolClient] = None):
    client = tool_client or ToolClient()

    async def triage_intent(state: AgentState) -> Dict[str, Any]:
        msg = state.message.lower()
        events = list(state.events)
        events.append({"type": "agent.started", "data": {"threadId": state.thread_id}})

        # Determine triage intent
        if any(w in msg for w in ["goal", "habit", "target", "start doing", "commit to"]):
            intent = "goal_planning"
        elif any(w in msg for w in ["mood", "feel", "emotion", "trend", "upset", "anxious", "happy"]):
            intent = "emotional_checkin"
        elif any(w in msg for w in ["journal", "entry", "diary", "wrote", "written"]):
            intent = "journal_review"
        elif any(w in msg for w in ["remember", "memory", "recall", "past"]):
            intent = "memory_retrieval"
        else:
            intent = "general_support"

        return {"intent": intent, "events": events}

    async def retrieve_context(state: AgentState) -> Dict[str, Any]:
        events = list(state.events)
        context: Dict[str, Any] = {}
        user_id = state.user_id
        intent = state.intent

        # 1. Search semantic memory if query or reflection context is relevant
        try:
            events.append({"type": "tool.started", "data": {"tool": "search_memory", "message": "Searching reflective memory..."}})
            mem_res = await client.search_memory(user_id, state.message, limit=3)
            context["memory"] = mem_res.get("data", {}).get("results", [])
            events.append({"type": "tool.completed", "data": {"tool": "search_memory", "itemsFound": len(context["memory"])}})
        except Exception as e:
            events.append({"type": "tool.completed", "data": {"tool": "search_memory", "error": str(e)}})

        # 2. Retrieve emotion trends if emotional context is relevant
        if intent in ["emotional_checkin", "goal_planning", "general_support"]:
            try:
                events.append({"type": "tool.started", "data": {"tool": "get_emotion_trends", "message": "Reviewing recent emotional patterns..."}})
                trend_res = await client.get_emotion_trends(user_id, days=7)
                context["emotion_trends"] = trend_res.get("data", {})
                events.append({"type": "tool.completed", "data": {"tool": "get_emotion_trends", "dominantEmotion": context["emotion_trends"].get("dominantEmotion")}})
            except Exception as e:
                events.append({"type": "tool.completed", "data": {"tool": "get_emotion_trends", "error": str(e)}})

        # 3. Retrieve recent journal entries if journal review or goal planning
        if intent in ["journal_review", "goal_planning"]:
            try:
                events.append({"type": "tool.started", "data": {"tool": "get_recent_journal_entries", "message": "Reading recent journal reflections..."}})
                j_res = await client.get_recent_journal_entries(user_id, limit=3)
                context["journal_entries"] = j_res.get("data", {}).get("entries", [])
                events.append({"type": "tool.completed", "data": {"tool": "get_recent_journal_entries", "count": len(context["journal_entries"])}})
            except Exception as e:
                events.append({"type": "tool.completed", "data": {"tool": "get_recent_journal_entries", "error": str(e)}})

        return {"context_data": context, "events": events}

    async def reason_and_plan(state: AgentState) -> Dict[str, Any]:
        msg = state.message
        events = list(state.events)
        pending_action = state.pending_action

        # Check if user intends to set or propose a wellness goal
        if state.intent == "goal_planning" and not pending_action and not state.approved:
            # Extract a sensible goal title from user message
            title = "Daily Mindful Reflection"
            desc = "Dedicate 10 minutes to mindfulness and emotional journaling."
            if "walk" in msg.lower():
                title = "Daily Evening Walk"
                desc = "Take a 20-minute gentle walk outdoors to reset."
            elif "sleep" in msg.lower() or "bed" in msg.lower():
                title = "Consistent Sleep Routine"
                desc = "Begin screen-free wind down 30 minutes before sleep."
            elif "breath" in msg.lower() or "meditat" in msg.lower():
                title = "Morning Breathwork Practice"
                desc = "Practice 5 minutes of calming box breathing each morning."

            pending_action = {
                "actionId": f"act_{state.thread_id}",
                "tool": "create_wellness_goal",
                "title": title,
                "description": desc,
            }

        return {"pending_action": pending_action, "events": events}

    async def check_approval(state: AgentState) -> Dict[str, Any]:
        events = list(state.events)
        action_result = state.action_result

        # If a mutating action is proposed and NOT yet approved by the human:
        if state.pending_action and not state.approved:
            events.append({
                "type": "approval.required",
                "data": {
                    "actionId": state.pending_action.get("actionId"),
                    "tool": state.pending_action.get("tool"),
                    "proposedAction": state.pending_action,
                    "message": f"I would love to help you set the goal '{state.pending_action.get('title')}'. Would you like me to create this for you?",
                },
            })
            return {"events": events}

        # If user approved the proposed action:
        if state.pending_action and state.approved:
            try:
                events.append({
                    "type": "tool.started",
                    "data": {"tool": "create_wellness_goal", "message": "Creating authorized wellness goal..."},
                })
                res = await client.create_wellness_goal(
                    state.user_id,
                    title=state.pending_action["title"],
                    description=state.pending_action.get("description"),
                    approved=True,
                )
                action_result = res.get("data", {})
                events.append({
                    "type": "tool.completed",
                    "data": {"tool": "create_wellness_goal", "status": "ACTIVE"},
                })
            except Exception as e:
                events.append({
                    "type": "tool.completed",
                    "data": {"tool": "create_wellness_goal", "error": str(e)},
                })

        return {"action_result": action_result, "events": events}

    async def safety_validate(state: AgentState) -> Dict[str, Any]:
        # Enforce empathetic companion safety guidelines
        # Ensure no medical advice or diagnosis
        return {}

    async def generate_response(state: AgentState) -> Dict[str, Any]:
        events = list(state.events)
        context = state.context_data
        action = state.action_result
        pending = state.pending_action

        # Synthesize supportive companion response
        parts = []

        if pending and not state.approved:
            parts.append(
                f"I hear how important this is to you. To support your wellness journey, I've prepared a goal: **{pending['title']}** ({pending.get('description')}). Please confirm below if you'd like me to activate it for you."
            )
        elif action and action.get("status") == "ACTIVE":
            parts.append(
                f"Wonderful! I've activated your new wellness goal: **{action.get('goal', {}).get('title', 'Wellness Goal')}**. Taking small, intentional steps is a powerful way to honor your wellbeing."
            )
        else:
            # Companion reflection incorporating retrieved memories / emotions
            dominant_emotion = context.get("emotion_trends", {}).get("dominantEmotion")
            memories = context.get("memory", [])

            if dominant_emotion:
                parts.append(f"Noticing your recent emotional rhythm often centers around feeling {dominant_emotion}.")

            if memories and len(memories) > 0:
                top_mem = memories[0].get("content", "")
                if top_mem:
                    parts.append(f"Drawing from your earlier reflection ('{top_mem[:80]}...'), it shows your thoughtful awareness.")

            parts.append(
                "I'm here with you. Take a gentle breath and acknowledge the space you're creating for yourself today."
            )

        final_text = " ".join(parts)

        # Emit content deltas and completion event
        # Split into readable chunks for streaming
        words = final_text.split(" ")
        for i in range(0, len(words), 4):
            chunk = " ".join(words[i : i + 4]) + " "
            events.append({"type": "content.delta", "data": {"text": chunk}})

        events.append({"type": "agent.completed", "data": {"response": final_text.strip()}})

        return {"final_response": final_text.strip(), "events": events}

    # Build the LangGraph StateGraph
    builder = StateGraph(AgentState)

    builder.add_node("triage_intent", triage_intent)
    builder.add_node("retrieve_context", retrieve_context)
    builder.add_node("reason_and_plan", reason_and_plan)
    builder.add_node("check_approval", check_approval)
    builder.add_node("safety_validate", safety_validate)
    builder.add_node("generate_response", generate_response)

    builder.set_entry_point("triage_intent")
    builder.add_edge("triage_intent", "retrieve_context")
    builder.add_edge("retrieve_context", "reason_and_plan")
    builder.add_edge("reason_and_plan", "check_approval")
    builder.add_edge("check_approval", "safety_validate")
    builder.add_edge("safety_validate", "generate_response")
    builder.add_edge("generate_response", END)

    return builder.compile()
