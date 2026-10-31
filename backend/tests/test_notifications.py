"""Unit Tests for Notification Center (Feature 2 & 3 Integration)."""
from __future__ import annotations

import asyncio

from backend.app.notifications import (
    NotificationCreateRequest,
    create_notification,
    list_notifications,
    mark_notification_read,
)


def test_notification_flow():
    """Verify notification dispatch, listing, and read marking."""
    async def _run():
        notifs = await list_notifications()
        initial_count = len(notifs)

        new_notif = await create_notification(
            NotificationCreateRequest(
                institution_id="INST-NOTIF-01",
                title="Deadline Approaching: Fire Safety Renewal",
                message="15 days remaining before Fire Safety NOC renewal deadline.",
                category="deadline_warning",
                link_url="/action-planner",
            )
        )
        assert new_notif.id is not None
        assert new_notif.is_read is False

        updated_notifs = await list_notifications()
        assert len(updated_notifs) == initial_count + 1

        read_notif = await mark_notification_read(new_notif.id)
        assert read_notif.is_read is True

    asyncio.run(_run())
