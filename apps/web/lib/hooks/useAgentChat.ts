"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { api } from "@/lib/api";
import type {
  ConversationThreadResponseDTO,
  ThreadMessageResponseDTO,
} from "@soulsync/contracts";

export interface ActiveToolActivity {
  tool: string;
  message?: string;
  status: "running" | "completed" | "failed";
}

export interface PendingApproval {
  actionId: string;
  tool: string;
  proposedAction: {
    actionId?: string;
    tool?: string;
    title: string;
    description?: string;
    [key: string]: unknown;
  };
  message: string;
}

export interface AgentChatMessage {
  id: string;
  role: "user" | "assistant" | "tool";
  content: string;
  createdAt: string | Date;
  status?: "complete" | "streaming" | "error";
  activity?: ActiveToolActivity[];
  approval?: PendingApproval;
}

export interface UseAgentChatOptions {
  initialThreadId?: string;
  initialMessages?: AgentChatMessage[];
  token?: string;
  userId?: string;
  onFinish?: (message: AgentChatMessage) => void;
  onError?: (error: Error | string) => void;
}

export interface UseAgentChatReturn {
  messages: AgentChatMessage[];
  threadId: string | null;
  isStreaming: boolean;
  isWaitingForApproval: boolean;
  isLoadingThread: boolean;
  currentActivity: ActiveToolActivity | null;
  pendingApproval: PendingApproval | null;
  error: string | null;
  sendMessage: (content: string) => Promise<void>;
  approveAction: (
    actionId: string,
    approved: boolean,
    modifiedPayload?: Record<string, unknown>
  ) => Promise<void>;
  stop: () => void;
  switchThread: (newThreadId: string | null) => Promise<void>;
  clearError: () => void;
  setMessages: React.Dispatch<React.SetStateAction<AgentChatMessage[]>>;
}

export function useAgentChat(options: UseAgentChatOptions = {}): UseAgentChatReturn {
  const { data: session } = useSession();
  const token = options.token || session?.accessToken;
  const userId = options.userId || session?.user?.id;

  const [messages, setMessages] = useState<AgentChatMessage[]>(options.initialMessages ?? []);
  const [threadId, setThreadId] = useState<string | null>(options.initialThreadId ?? null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isWaitingForApproval, setIsWaitingForApproval] = useState(false);
  const [isLoadingThread, setIsLoadingThread] = useState(false);
  const [currentActivity, setCurrentActivity] = useState<ActiveToolActivity | null>(null);
  const [pendingApproval, setPendingApproval] = useState<PendingApproval | null>(null);
  const [error, setError] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  // Clean up any ongoing fetch on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const stop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
    setCurrentActivity(null);
    setMessages((prev) =>
      prev.map((m) => (m.status === "streaming" ? { ...m, status: "complete" } : m))
    );
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const switchThread = useCallback(
    async (newThreadId: string | null) => {
      stop();
      setError(null);
      setPendingApproval(null);
      setIsWaitingForApproval(false);

      if (!newThreadId) {
        setThreadId(null);
        setMessages([]);
        return;
      }

      setThreadId(newThreadId);
      setIsLoadingThread(true);

      try {
        const rawMessages = await api.agent.listMessages(newThreadId, {
          token,
          userId,
        });

        const formattedMessages: AgentChatMessage[] = rawMessages.map(
          (m: ThreadMessageResponseDTO) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            createdAt: m.createdAt,
            status: "complete",
          })
        );

        setMessages(formattedMessages);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to load thread messages";
        setError(msg);
      } finally {
        setIsLoadingThread(false);
      }
    },
    [stop, token, userId]
  );

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isStreaming) return;

      if (!token) {
        setError("Please sign in to communicate with your wellness companion.");
        return;
      }

      // Stop any prior execution
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      setIsStreaming(true);
      setError(null);
      setPendingApproval(null);
      setIsWaitingForApproval(false);
      setCurrentActivity(null);

      const userMsgId = `user_${Date.now()}`;
      const assistantMsgId = `assistant_${Date.now()}`;
      const nowIso = new Date().toISOString();

      const userMessage: AgentChatMessage = {
        id: userMsgId,
        role: "user",
        content: content.trim(),
        createdAt: nowIso,
        status: "complete",
      };

      const assistantMessage: AgentChatMessage = {
        id: assistantMsgId,
        role: "assistant",
        content: "",
        createdAt: nowIso,
        status: "streaming",
        activity: [],
      };

      setMessages((prev) => [...prev, userMessage, assistantMessage]);

      let accumulatedContent = "";
      let activityList: ActiveToolActivity[] = [];

      try {
        await api.agent.chatStream(
          {
            threadId: threadId || undefined,
            message: content.trim(),
          },
          {
            onEvent: (event) => {
              if (event.type === "agent.started" && event.data.threadId) {
                setThreadId(event.data.threadId);
              }
            },
            onToolStarted: (tool, toolMessage) => {
              const act: ActiveToolActivity = { tool, message: toolMessage, status: "running" };
              setCurrentActivity(act);
              activityList = [...activityList, act];
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMsgId ? { ...m, activity: [...activityList] } : m
                )
              );
            },
            onToolCompleted: (tool, data) => {
              activityList = activityList.map((a) =>
                a.tool === tool
                  ? { ...a, status: (data.error ? "failed" : "completed") as "failed" | "completed" }
                  : a
              );
              setCurrentActivity(null);
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMsgId ? { ...m, activity: [...activityList] } : m
                )
              );
            },
            onDelta: (text) => {
              accumulatedContent += text;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMsgId
                    ? { ...m, content: accumulatedContent, status: "streaming" }
                    : m
                )
              );
            },
            onApprovalRequired: (data) => {
              const approval: PendingApproval = {
                actionId: data.actionId,
                tool: data.tool,
                proposedAction: data.proposedAction,
                message: data.message,
              };
              setPendingApproval(approval);
              setIsWaitingForApproval(true);
              setIsStreaming(false);
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMsgId ? { ...m, approval, status: "complete" } : m
                )
              );
            },
            onCompleted: (response) => {
              const final = response || accumulatedContent;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMsgId ? { ...m, content: final, status: "complete" } : m
                )
              );
              setCurrentActivity(null);
              setIsStreaming(false);
              options.onFinish?.({
                id: assistantMsgId,
                role: "assistant",
                content: final,
                createdAt: new Date().toISOString(),
                status: "complete",
              });
            },
            onError: (err) => {
              const errMsg = typeof err === "string" ? err : err.message;
              setError(errMsg);
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMsgId
                    ? {
                        ...m,
                        status: "error",
                        content: m.content || "An error occurred while generating a response.",
                      }
                    : m
                )
              );
              setIsStreaming(false);
              options.onError?.(errMsg);
            },
          },
          {
            token,
            userId,
            signal: abortController.signal,
          }
        );
      } catch (err: any) {
        if (err.name === "AbortError" || abortController.signal.aborted) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsgId ? { ...m, status: "complete" } : m
            )
          );
        } else {
          const errMsg = err?.message || "Failed to communicate with companion";
          setError(errMsg);
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsgId
                ? {
                    ...m,
                    status: "error",
                    content: m.content || errMsg,
                  }
                : m
            )
          );
        }
      } finally {
        setIsStreaming(false);
        abortControllerRef.current = null;
      }
    },
    [isStreaming, token, threadId, userId, options]
  );

  const approveAction = useCallback(
    async (
      actionId: string,
      approved: boolean,
      modifiedPayload?: Record<string, unknown>
    ) => {
      if (isStreaming) return;

      if (!token) {
        setError("Please sign in to confirm this action.");
        return;
      }

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      setIsStreaming(true);
      setIsWaitingForApproval(false);
      setPendingApproval(null);
      setError(null);

      const resumeMsgId = `assistant_resume_${Date.now()}`;
      const nowIso = new Date().toISOString();

      const resumeMessage: AgentChatMessage = {
        id: resumeMsgId,
        role: "assistant",
        content: "",
        createdAt: nowIso,
        status: "streaming",
        activity: [],
      };

      setMessages((prev) => [...prev, resumeMessage]);

      let accumulatedContent = "";
      let activityList: ActiveToolActivity[] = [];

      try {
        await api.agent.approveStream(
          {
            actionId,
            approved,
            modifiedPayload,
            threadId: threadId || undefined,
          },
          {
            onToolStarted: (tool, toolMessage) => {
              const act: ActiveToolActivity = { tool, message: toolMessage, status: "running" };
              setCurrentActivity(act);
              activityList = [...activityList, act];
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === resumeMsgId ? { ...m, activity: [...activityList] } : m
                )
              );
            },
            onToolCompleted: (tool, data) => {
              activityList = activityList.map((a) =>
                a.tool === tool
                  ? { ...a, status: (data.error ? "failed" : "completed") as "failed" | "completed" }
                  : a
              );
              setCurrentActivity(null);
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === resumeMsgId ? { ...m, activity: [...activityList] } : m
                )
              );
            },
            onDelta: (text) => {
              accumulatedContent += text;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === resumeMsgId
                    ? { ...m, content: accumulatedContent, status: "streaming" }
                    : m
                )
              );
            },
            onCompleted: (response) => {
              const final = response || accumulatedContent;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === resumeMsgId ? { ...m, content: final, status: "complete" } : m
                )
              );
              setCurrentActivity(null);
              setIsStreaming(false);
              options.onFinish?.({
                id: resumeMsgId,
                role: "assistant",
                content: final,
                createdAt: new Date().toISOString(),
                status: "complete",
              });
            },
            onError: (err) => {
              const errMsg = typeof err === "string" ? err : err.message;
              setError(errMsg);
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === resumeMsgId
                    ? {
                        ...m,
                        status: "error",
                        content: m.content || "An error occurred while resuming the action.",
                      }
                    : m
                )
              );
              setIsStreaming(false);
              options.onError?.(errMsg);
            },
          },
          {
            token,
            userId,
            signal: abortController.signal,
          }
        );
      } catch (err: any) {
        if (err.name === "AbortError" || abortController.signal.aborted) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === resumeMsgId ? { ...m, status: "complete" } : m
            )
          );
        } else {
          const errMsg = err?.message || "Failed to resume companion action";
          setError(errMsg);
          setMessages((prev) =>
            prev.map((m) =>
              m.id === resumeMsgId
                ? {
                    ...m,
                    status: "error",
                    content: m.content || errMsg,
                  }
                : m
            )
          );
        }
      } finally {
        setIsStreaming(false);
        abortControllerRef.current = null;
      }
    },
    [isStreaming, token, threadId, userId, options]
  );

  return {
    messages,
    threadId,
    isStreaming,
    isWaitingForApproval,
    isLoadingThread,
    currentActivity,
    pendingApproval,
    error,
    sendMessage,
    approveAction,
    stop,
    switchThread,
    clearError,
    setMessages,
  };
}
