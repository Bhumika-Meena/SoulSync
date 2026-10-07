from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

class AgentState(BaseModel):
    user_id: str
    thread_id: str
    message: str
    intent: Optional[str] = None
    context_data: Dict[str, Any] = Field(default_factory=dict)
    pending_action: Optional[Dict[str, Any]] = None
    approved: bool = False
    action_result: Optional[Dict[str, Any]] = None
    final_response: str = ""
    events: List[Dict[str, Any]] = Field(default_factory=list)
