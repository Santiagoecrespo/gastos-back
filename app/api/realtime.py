"""In-process pub/sub for Server-Sent Events — one manager per process."""

import asyncio


class ConnectionManager:
    def __init__(self) -> None:
        self._subs: dict[str, list[asyncio.Queue]] = {}

    def subscribe(self, group_id: str) -> asyncio.Queue:
        q: asyncio.Queue = asyncio.Queue()
        self._subs.setdefault(group_id, []).append(q)
        return q

    def unsubscribe(self, group_id: str, q: asyncio.Queue) -> None:
        subs = self._subs.get(group_id, [])
        if q in subs:
            subs.remove(q)

    async def broadcast(self, group_id: str, event: str = "refresh") -> None:
        for q in list(self._subs.get(group_id, [])):
            await q.put(event)


manager = ConnectionManager()
