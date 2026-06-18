from __future__ import annotations

from typing import Any, Optional

from pydantic import BaseModel, Field


class HandoverRequest(BaseModel):
    clientRequestId: Optional[str] = None
    handoverAccepted: bool = True
    input: dict[str, Any] = Field(default_factory=dict)
    sessionContext: dict[str, Any] = Field(default_factory=dict)


class ChatRequest(BaseModel):
    messageType: str = "mascot_state_change"
    sessionContext: dict[str, Any] = Field(default_factory=dict)
    statePatch: dict[str, Any] = Field(default_factory=dict)
    taskID: str


class SearchRequest(BaseModel):
    allowedDomains: list[str] = Field(default_factory=list)
    maxResults: int = 5
    needBrowserAutomation: bool = False
    query: str
    subTaskId: Optional[str] = None
    taskID: Optional[str] = None


class SubTaskModel(BaseModel):
    agent: str
    dependsOn: list[str] = Field(default_factory=list)
    priority: int
    status: str = "planned"
    subTaskId: str
    title: str
    toolkit: str
    result: Optional[dict[str, Any]] = None
    error: Optional[str] = None


class PlanModel(BaseModel):
    confirmedState: dict[str, Any]
    createdAt: str
    humanInteraction: str
    planId: str
    summary: str
    taskID: str
    tasks: list[SubTaskModel]


class TaskView(BaseModel):
    createdAt: str
    events: list[dict[str, Any]] = Field(default_factory=list)
    initialResult: dict[str, Any]
    latestReply: Optional[dict[str, Any]] = None
    latestResult: Optional[dict[str, Any]] = None
    plan: PlanModel
    sessionContext: dict[str, Any]
    status: str
    taskID: str
    telemetry: Optional[dict[str, Any]] = None
    updatedAt: str
