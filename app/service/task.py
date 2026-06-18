from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Any, Optional

logger = logging.getLogger("lyriks.task_service")


class TaskLock:
    def __init__(self, task_id: str) -> None:
        self.id = task_id
        self.created_at = datetime.utcnow()
        self.last_accessed = datetime.utcnow()
        self.execution_lock = asyncio.Lock()
        self.cancel_event = asyncio.Event()
        self.background_tasks: set[asyncio.Task[Any]] = set()
        self.metadata: dict[str, Any] = {}

    def touch(self) -> None:
        self.last_accessed = datetime.utcnow()

    def add_background_task(self, task: asyncio.Task[Any]) -> None:
        self.background_tasks.add(task)
        task.add_done_callback(lambda finished: self.background_tasks.discard(finished))
        self.touch()

    async def cleanup(self) -> None:
        self.cancel_event.set()
        for task in list(self.background_tasks):
            if task.done():
                continue
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass
        self.background_tasks.clear()


task_locks: dict[str, TaskLock] = {}
_cleanup_task: Optional[asyncio.Task[Any]] = None


def get_task_lock(task_id: str) -> TaskLock:
    task_lock = task_locks.get(task_id)
    if task_lock is None:
        raise KeyError(f"Task lock not found: {task_id}")
    task_lock.touch()
    return task_lock


def get_task_lock_if_exists(task_id: str) -> Optional[TaskLock]:
    task_lock = task_locks.get(task_id)
    if task_lock is not None:
        task_lock.touch()
    return task_lock


def create_task_lock(task_id: str) -> TaskLock:
    if task_id in task_locks:
        raise ValueError(f"Task lock already exists: {task_id}")
    task_lock = TaskLock(task_id)
    task_locks[task_id] = task_lock
    logger.info("Task lock created taskID=%s", task_id)
    return task_lock


def get_or_create_task_lock(task_id: str) -> TaskLock:
    existing = task_locks.get(task_id)
    if existing is not None:
        existing.touch()
        return existing
    return create_task_lock(task_id)


async def delete_task_lock(task_id: str) -> None:
    task_lock = task_locks.pop(task_id, None)
    if task_lock is None:
        return
    await task_lock.cleanup()
    logger.info("Task lock deleted taskID=%s", task_id)


async def start_cleanup_loop(stale_after_hours: int = 4) -> None:
    global _cleanup_task
    if _cleanup_task is not None and not _cleanup_task.done():
        return
    _cleanup_task = asyncio.create_task(_periodic_cleanup(stale_after_hours))


async def stop_cleanup_loop() -> None:
    global _cleanup_task
    if _cleanup_task is None:
        return
    _cleanup_task.cancel()
    try:
        await _cleanup_task
    except asyncio.CancelledError:
        pass
    _cleanup_task = None


async def _periodic_cleanup(stale_after_hours: int) -> None:
    timeout = timedelta(hours=stale_after_hours)
    while True:
        try:
            await asyncio.sleep(300)
            now = datetime.utcnow()
            stale_ids = [
                task_id
                for task_id, task_lock in list(task_locks.items())
                if now - task_lock.last_accessed > timeout
            ]
            for task_id in stale_ids:
                logger.warning("Cleaning stale task lock taskID=%s", task_id)
                await delete_task_lock(task_id)
        except asyncio.CancelledError:
            break
        except Exception as exc:  # noqa: BLE001
            logger.warning("Task cleanup loop error: %s", exc)
