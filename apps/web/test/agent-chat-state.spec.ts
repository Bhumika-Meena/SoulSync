import test from "node:test";
import assert from "node:assert/strict";
import type { AgentChatMessage, PendingApproval, ActiveToolActivity } from "../lib/hooks/useAgentChat";

/**
 * Pure state reducer modeling the exact state transformations in useAgentChat.
 */
interface ChatState {
  messages: AgentChatMessage[];
  isStreaming: boolean;
  isWaitingForApproval: boolean;
  currentActivity: ActiveToolActivity | null;
  pendingApproval: PendingApproval | null;
  error: string | null;
}

function handleIncomingDelta(state: ChatState, assistantId: string, text: string): ChatState {
  return {
    ...state,
    messages: state.messages.map((m) =>
      m.id === assistantId ? { ...m, content: m.content + text } : m
    ),
  };
}

function handleToolStarted(state: ChatState, assistantId: string, tool: string, message: string): ChatState {
  const activity: ActiveToolActivity = { tool, message, status: "running" };
  return {
    ...state,
    currentActivity: activity,
    messages: state.messages.map((m) =>
      m.id === assistantId ? { ...m, activity: [...(m.activity || []), activity] } : m
    ),
  };
}

function handleToolCompleted(state: ChatState, assistantId: string, tool: string): ChatState {
  return {
    ...state,
    currentActivity: null,
    messages: state.messages.map((m) =>
      m.id === assistantId
        ? {
            ...m,
            activity: (m.activity || []).map((a) =>
              a.tool === tool ? { ...a, status: "completed" } : a
            ),
          }
        : m
    ),
  };
}

function handleApprovalRequired(state: ChatState, assistantId: string, approvalData: PendingApproval): ChatState {
  return {
    ...state,
    isWaitingForApproval: true,
    isStreaming: false,
    pendingApproval: approvalData,
    messages: state.messages.map((m) =>
      m.id === assistantId ? { ...m, approval: approvalData } : m
    ),
  };
}

function handleCompleted(state: ChatState, assistantId: string, finalResponse: string): ChatState {
  return {
    ...state,
    isStreaming: false,
    currentActivity: null,
    messages: state.messages.map((m) =>
      m.id === assistantId
        ? { ...m, content: finalResponse || m.content, status: "complete" }
        : m
    ),
  };
}

function handleError(state: ChatState, assistantId: string, errorMessage: string): ChatState {
  return {
    ...state,
    isStreaming: false,
    error: errorMessage,
    messages: state.messages.map((m) =>
      m.id === assistantId ? { ...m, status: "error" } : m
    ),
  };
}

test("AgentChatState: delta chunks append smoothly to streaming assistant message", () => {
  const assistantId = "assistant-1";
  let state: ChatState = {
    messages: [
      { id: "user-1", role: "user", content: "Hello", createdAt: new Date() },
      { id: assistantId, role: "assistant", content: "", status: "streaming", createdAt: new Date() },
    ],
    isStreaming: true,
    isWaitingForApproval: false,
    currentActivity: null,
    pendingApproval: null,
    error: null,
  };

  state = handleIncomingDelta(state, assistantId, "Mindful ");
  state = handleIncomingDelta(state, assistantId, "presence ");
  state = handleIncomingDelta(state, assistantId, "guides us.");

  const assistantMsg = state.messages.find((m) => m.id === assistantId);
  assert.equal(assistantMsg?.content, "Mindful presence guides us.");
  assert.equal(state.isStreaming, true);
});

test("AgentChatState: tool activity tracks execution state and completion", () => {
  const assistantId = "assistant-2";
  let state: ChatState = {
    messages: [
      { id: assistantId, role: "assistant", content: "", status: "streaming", createdAt: new Date() },
    ],
    isStreaming: true,
    isWaitingForApproval: false,
    currentActivity: null,
    pendingApproval: null,
    error: null,
  };

  // Tool starts
  state = handleToolStarted(state, assistantId, "search_memory", "Searching memory");
  assert.equal(state.currentActivity?.tool, "search_memory");
  assert.equal(state.currentActivity?.status, "running");

  // Tool completes
  state = handleToolCompleted(state, assistantId, "search_memory");
  assert.equal(state.currentActivity, null);
  const assistantMsg = state.messages.find((m) => m.id === assistantId);
  assert.equal(assistantMsg?.activity?.[0].status, "completed");
});

test("AgentChatState: approval.required sets pending approval and pauses streaming", () => {
  const assistantId = "assistant-3";
  let state: ChatState = {
    messages: [
      { id: assistantId, role: "assistant", content: "", status: "streaming", createdAt: new Date() },
    ],
    isStreaming: true,
    isWaitingForApproval: false,
    currentActivity: null,
    pendingApproval: null,
    error: null,
  };

  const approvalData: PendingApproval = {
    actionId: "act_999",
    tool: "create_wellness_goal",
    proposedAction: { title: "Daily Morning Walk", description: "20 min walk" },
    message: "Would you like me to activate this goal?",
  };

  state = handleApprovalRequired(state, assistantId, approvalData);

  assert.equal(state.isWaitingForApproval, true);
  assert.equal(state.isStreaming, false);
  assert.equal(state.pendingApproval?.actionId, "act_999");
  assert.equal(state.pendingApproval?.proposedAction.title, "Daily Morning Walk");
});

test("AgentChatState: completed event finalizes message and clears activity", () => {
  const assistantId = "assistant-4";
  let state: ChatState = {
    messages: [
      { id: assistantId, role: "assistant", content: "Almost done", status: "streaming", createdAt: new Date() },
    ],
    isStreaming: true,
    isWaitingForApproval: false,
    currentActivity: null,
    pendingApproval: null,
    error: null,
  };

  state = handleCompleted(state, assistantId, "Fully completed companion response.");
  assert.equal(state.isStreaming, false);
  const assistantMsg = state.messages.find((m) => m.id === assistantId);
  assert.equal(assistantMsg?.status, "complete");
  assert.equal(assistantMsg?.content, "Fully completed companion response.");
});

test("AgentChatState: error event marks message as error and records error message", () => {
  const assistantId = "assistant-5";
  let state: ChatState = {
    messages: [
      { id: assistantId, role: "assistant", content: "Half stream", status: "streaming", createdAt: new Date() },
    ],
    isStreaming: true,
    isWaitingForApproval: false,
    currentActivity: null,
    pendingApproval: null,
    error: null,
  };

  state = handleError(state, assistantId, "Connection lost to agent service");
  assert.equal(state.isStreaming, false);
  assert.equal(state.error, "Connection lost to agent service");
  const assistantMsg = state.messages.find((m) => m.id === assistantId);
  assert.equal(assistantMsg?.status, "error");
});
