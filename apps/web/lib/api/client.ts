import { getApiBaseUrl } from "./config";
import { ApiClientError } from "./errors";
import type {
  CreateJournalEntryDTO,
  JournalEntryResponseDTO,
  JournalQueryDTO,
  CreateWellnessGoalDTO,
  UpdateWellnessGoalDTO,
  WellnessGoalResponseDTO,
  GoalStatus,
  UserProfileDTO,
  RegisterUserDTO,
  LoginUserDTO,
  AuthResponseDTO,
  AgentChatRequestDTO,
  AgentApprovalRequestDTO,
  ConversationThreadResponseDTO,
  ThreadMessageResponseDTO,
} from "@soulsync/contracts";
import {
  type AgentStreamCallbacks,
  type AgentStreamEvent,
  processReadableStream,
} from "./sse";

export interface RequestContext {
  userId?: string;
  token?: string; // For Phase 4 JWT integration
  signal?: AbortSignal;
  headers?: Record<string, string>;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginatedJournalResult {
  entries: JournalEntryResponseDTO[];
  pagination: PaginationMeta;
}

export interface EmotionTrendRecord {
  id: string;
  diaryEntryId: string;
  primaryEmotion: string;
  secondaryEmotion: string | null;
  intensity: number;
  createdAt: string | Date;
}

export interface EmotionTrendsResult {
  totalAnalyses: number;
  dominantEmotion: string | null;
  averageIntensity: number;
  distribution: Record<string, number>;
  records: EmotionTrendRecord[];
}

export interface RequestOptions extends Omit<RequestInit, "body" | "headers"> {
  body?: unknown;
  headers?: Record<string, string>;
  context?: RequestContext;
  params?: Record<string, string | number | boolean | undefined | null>;
}

interface ApiResponseEnvelope<T> {
  success?: boolean;
  data?: T;
  pagination?: PaginationMeta;
  message?: string;
  error?: {
    code?: string;
    message?: string;
    statusCode?: number;
    details?: unknown;
    path?: string;
    timestamp?: string;
  };
}

/**
 * Core HTTP request handler communicating with the NestJS API gateway.
 */
async function apiRequest<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { body, headers = {}, context, params, ...customOptions } = options;
  const baseUrl = getApiBaseUrl();

  let urlPath = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;

  if (params) {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        query.append(key, String(value));
      }
    }
    const queryString = query.toString();
    if (queryString) {
      urlPath += `${urlPath.includes("?") ? "&" : "?"}${queryString}`;
    }
  }

  const fullUrl = `${baseUrl}${urlPath}`;

  const requestHeaders: Record<string, string> = {
    Accept: "application/json",
    ...headers,
    ...(context?.headers ?? {}),
  };

  // Support current user-context mechanism (Phase 1-3)
  if (context?.userId) {
    requestHeaders["x-user-id"] = context.userId;
  }

  // Support forward-compatible Bearer token (Phase 4)
  if (context?.token) {
    requestHeaders["Authorization"] = `Bearer ${context.token}`;
  }

  let serializedBody: string | undefined;
  if (body !== undefined) {
    requestHeaders["Content-Type"] = "application/json";
    serializedBody = typeof body === "string" ? body : JSON.stringify(body);
  }

  let response: Response;
  try {
    response = await fetch(fullUrl, {
      ...customOptions,
      headers: requestHeaders,
      body: serializedBody,
      signal: context?.signal,
    });
  } catch (networkError: unknown) {
    const message =
      networkError instanceof Error ? networkError.message : "Failed to connect to API";
    throw new ApiClientError(0, message, "NETWORK_ERROR");
  }

  let responseJson: ApiResponseEnvelope<T> | null = null;
  const text = await response.text();
  if (text) {
    try {
      responseJson = JSON.parse(text) as ApiResponseEnvelope<T>;
    } catch {
      // Non-JSON response
    }
  }

  if (!response.ok) {
    const errorEnvelope = responseJson?.error;
    const message =
      errorEnvelope?.message ||
      responseJson?.message ||
      (typeof responseJson === "string" ? responseJson : `Request failed with status ${response.status}`);
    const code = errorEnvelope?.code || (response.status === 401 ? "UNAUTHORIZED" : "API_ERROR");

    throw new ApiClientError(
      response.status,
      message,
      code,
      errorEnvelope?.details,
      errorEnvelope?.path,
      errorEnvelope?.timestamp
    );
  }

  // If response has { success: true, data: ... }, extract data
  if (responseJson && typeof responseJson === "object" && "data" in responseJson) {
    return responseJson.data as T;
  }

  return (responseJson ?? ({} as unknown)) as T;
}

/**
 * Domain-specific API namespaces exposing validated methods.
 */
export const api = {
  /**
   * Journal API methods
   */
  journal: {
    list: async (
      query?: Partial<JournalQueryDTO>,
      context?: RequestContext
    ): Promise<PaginatedJournalResult> => {
      const baseUrl = getApiBaseUrl();
      const params = new URLSearchParams();
      if (query?.page) params.append("page", String(query.page));
      if (query?.limit) params.append("limit", String(query.limit));
      if (query?.search) params.append("search", query.search);
      if (query?.startDate) params.append("startDate", query.startDate);

      const queryString = params.toString();
      const url = `${baseUrl}/journal${queryString ? `?${queryString}` : ""}`;

      const headers: Record<string, string> = { Accept: "application/json" };
      if (context?.userId) headers["x-user-id"] = context.userId;
      if (context?.token) headers["Authorization"] = `Bearer ${context.token}`;

      const res = await fetch(url, { headers, signal: context?.signal });
      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new ApiClientError(
          res.status,
          json?.error?.message || json?.message || "Failed to list journal entries",
          json?.error?.code || "API_ERROR",
          json?.error?.details
        );
      }

      return {
        entries: json.data ?? [],
        pagination: json.pagination ?? {
          page: query?.page ?? 1,
          limit: query?.limit ?? 10,
          total: json.data?.length ?? 0,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
      };
    },

    getToday: (context?: RequestContext): Promise<JournalEntryResponseDTO | null> => {
      return apiRequest<JournalEntryResponseDTO | null>("/journal/today", {
        method: "GET",
        context,
      });
    },

    get: (id: string, context?: RequestContext): Promise<JournalEntryResponseDTO> => {
      return apiRequest<JournalEntryResponseDTO>(`/journal/${id}`, {
        method: "GET",
        context,
      });
    },

    create: (
      data: CreateJournalEntryDTO,
      context?: RequestContext
    ): Promise<JournalEntryResponseDTO> => {
      return apiRequest<JournalEntryResponseDTO>("/journal", {
        method: "POST",
        body: data,
        context,
      });
    },

    delete: (id: string, context?: RequestContext): Promise<{ success: boolean; message: string }> => {
      return apiRequest<{ success: boolean; message: string }>(`/journal/${id}`, {
        method: "DELETE",
        context,
      });
    },
  },

  /**
   * Goals API methods
   */
  goals: {
    list: (
      params?: { status?: GoalStatus },
      context?: RequestContext
    ): Promise<WellnessGoalResponseDTO[]> => {
      return apiRequest<WellnessGoalResponseDTO[]>("/goals", {
        method: "GET",
        params,
        context,
      });
    },

    get: (id: string, context?: RequestContext): Promise<WellnessGoalResponseDTO> => {
      return apiRequest<WellnessGoalResponseDTO>(`/goals/${id}`, {
        method: "GET",
        context,
      });
    },

    create: (
      data: CreateWellnessGoalDTO,
      context?: RequestContext
    ): Promise<WellnessGoalResponseDTO> => {
      return apiRequest<WellnessGoalResponseDTO>("/goals", {
        method: "POST",
        body: data,
        context,
      });
    },

    update: (
      id: string,
      data: UpdateWellnessGoalDTO,
      context?: RequestContext
    ): Promise<WellnessGoalResponseDTO> => {
      return apiRequest<WellnessGoalResponseDTO>(`/goals/${id}`, {
        method: "PATCH",
        body: data,
        context,
      });
    },
  },

  /**
   * Emotions API methods
   */
  emotions: {
    getTrends: (
      params?: { days?: number },
      context?: RequestContext
    ): Promise<EmotionTrendsResult> => {
      return apiRequest<EmotionTrendsResult>("/emotions/trends", {
        method: "GET",
        params,
        context,
      });
    },

    getRecent: (
      params?: { limit?: number },
      context?: RequestContext
    ): Promise<EmotionTrendRecord[]> => {
      return apiRequest<EmotionTrendRecord[]>("/emotions/recent", {
        method: "GET",
        params,
        context,
      });
    },
  },

  /**
   * Users API methods
   */
  users: {
    getProfile: (context?: RequestContext): Promise<UserProfileDTO> => {
      return apiRequest<UserProfileDTO>("/users/profile", {
        method: "GET",
        context,
      });
    },

    getById: (id: string, context?: RequestContext): Promise<UserProfileDTO> => {
      return apiRequest<UserProfileDTO>(`/users/${id}`, {
        method: "GET",
        context,
      });
    },
  },

  /**
   * Auth API methods
   */
  auth: {
    register: (data: RegisterUserDTO): Promise<AuthResponseDTO> => {
      return apiRequest<AuthResponseDTO>("/auth/register", {
        method: "POST",
        body: data,
      });
    },

    login: (data: LoginUserDTO): Promise<AuthResponseDTO> => {
      return apiRequest<AuthResponseDTO>("/auth/login", {
        method: "POST",
        body: data,
      });
    },

    getMe: (context?: RequestContext): Promise<UserProfileDTO> => {
      return apiRequest<UserProfileDTO>("/auth/me", {
        method: "GET",
        context,
      });
    },
  },

  /**
   * Agent API methods
   */
  agent: {
    listThreads: (context?: RequestContext): Promise<ConversationThreadResponseDTO[]> => {
      return apiRequest<ConversationThreadResponseDTO[]>("/agent/threads", {
        method: "GET",
        context,
      });
    },

    listMessages: (
      threadId: string,
      context?: RequestContext
    ): Promise<ThreadMessageResponseDTO[]> => {
      return apiRequest<ThreadMessageResponseDTO[]>(`/agent/threads/${threadId}/messages`, {
        method: "GET",
        context,
      });
    },

    chatStream: async (
      data: AgentChatRequestDTO,
      callbacks: AgentStreamCallbacks,
      context?: RequestContext
    ): Promise<void> => {
      const baseUrl = getApiBaseUrl();
      const url = `${baseUrl}/agent/chat`;

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
        ...(context?.headers ?? {}),
      };

      if (context?.userId) {
        headers["x-user-id"] = context.userId;
      }
      if (context?.token) {
        headers["Authorization"] = `Bearer ${context.token}`;
      }

      let res: Response;
      try {
        res = await fetch(url, {
          method: "POST",
          headers,
          body: JSON.stringify(data),
          signal: context?.signal,
        });
      } catch (networkError: unknown) {
        const message =
          networkError instanceof Error ? networkError.message : "Failed to connect to agent API";
        const clientError = new ApiClientError(0, message, "NETWORK_ERROR");
        callbacks.onError?.(clientError);
        throw clientError;
      }

      if (!res.ok) {
        let errorData: any = {};
        try {
          errorData = await res.json();
        } catch {
          errorData = { message: `Request failed with status ${res.status}` };
        }
        const message = errorData?.error?.message || errorData?.message || `HTTP ${res.status}`;
        const code = errorData?.error?.code || (res.status === 401 ? "UNAUTHORIZED" : "API_ERROR");
        const clientError = new ApiClientError(res.status, message, code, errorData?.error?.details);
        callbacks.onError?.(clientError);
        throw clientError;
      }

      if (!res.body) {
        const noBodyError = new ApiClientError(0, "No response body received from stream", "STREAM_ERROR");
        callbacks.onError?.(noBodyError);
        throw noBodyError;
      }

      await processReadableStream(res.body, callbacks, context?.signal);
    },

    approveStream: async (
      data: AgentApprovalRequestDTO,
      callbacks: AgentStreamCallbacks,
      context?: RequestContext
    ): Promise<void> => {
      const baseUrl = getApiBaseUrl();
      const url = `${baseUrl}/agent/approve`;

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
        ...(context?.headers ?? {}),
      };

      if (context?.userId) {
        headers["x-user-id"] = context.userId;
      }
      if (context?.token) {
        headers["Authorization"] = `Bearer ${context.token}`;
      }

      let res: Response;
      try {
        res = await fetch(url, {
          method: "POST",
          headers,
          body: JSON.stringify(data),
          signal: context?.signal,
        });
      } catch (networkError: unknown) {
        const message =
          networkError instanceof Error ? networkError.message : "Failed to connect to agent API";
        const clientError = new ApiClientError(0, message, "NETWORK_ERROR");
        callbacks.onError?.(clientError);
        throw clientError;
      }

      if (!res.ok) {
        let errorData: any = {};
        try {
          errorData = await res.json();
        } catch {
          errorData = { message: `Request failed with status ${res.status}` };
        }
        const message = errorData?.error?.message || errorData?.message || `HTTP ${res.status}`;
        const code = errorData?.error?.code || (res.status === 401 ? "UNAUTHORIZED" : "API_ERROR");
        const clientError = new ApiClientError(res.status, message, code, errorData?.error?.details);
        callbacks.onError?.(clientError);
        throw clientError;
      }

      if (!res.body) {
        const noBodyError = new ApiClientError(0, "No response body received from stream", "STREAM_ERROR");
        callbacks.onError?.(noBodyError);
        throw noBodyError;
      }

      await processReadableStream(res.body, callbacks, context?.signal);
    },
  },
};

