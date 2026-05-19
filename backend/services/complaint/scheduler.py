"""
MindFlow Complaint Service - Auto-Escalation Scheduler
Runs periodic auto-escalation checks for overdue complaints.

Per COMPLAINT_ENHANCEMENT_TDD.md Section 6.3:
- Runs every 15 minutes
- Checks all non-closed complaints where SLA resolution is past due
- Escalates based on overdue days: Level 1 (overdue), Level 2 (2+ days), Level 3 (5+ days)

Usage:
    python -m services.complaint.scheduler
"""

import asyncio
import signal
import sys
from datetime import datetime

import structlog

from shared.config import get_settings
from shared.database import db_manager

logger = structlog.get_logger()

ESCALATION_INTERVAL_SECONDS = 15 * 60  # 15 minutes

# System user UUID for auto-escalation actions (use tenant's first super admin or a system account)
SYSTEM_USER_ID_PLACEHOLDER = "00000000-0000-0000-0000-000000000000"

_shutdown = False


def handle_shutdown(signum, frame):
    global _shutdown
    logger.info("Shutdown signal received", signal=signum)
    _shutdown = True


async def run_escalation_cycle():
    """Run a single escalation cycle for all tenants."""
    from sqlalchemy import text

    async with db_manager.session() as session:
        # Get all active tenants
        result = await session.execute(text("SELECT id FROM tenants WHERE is_active = TRUE"))
        tenants = result.fetchall()

    total_escalated = 0

    for (tenant_id,) in tenants:
        try:
            async with db_manager.session(tenant_id=tenant_id) as session:
                from .services.complaint_service import ComplaintService
                from uuid import UUID

                service = ComplaintService(session)

                # Try to find a super admin user for this tenant to use as the action performer
                result = await session.execute(
                    text("""
                        SELECT u.id FROM users u
                        JOIN user_tenant_roles utr ON utr.user_id = u.id
                        JOIN roles r ON r.id = utr.role_id
                        WHERE utr.tenant_id = :tid AND r.slug = 'super-admin'
                        LIMIT 1
                    """),
                    {"tid": tenant_id}
                )
                row = result.fetchone()
                system_user_id = UUID(str(row[0])) if row else UUID(SYSTEM_USER_ID_PLACEHOLDER)

                count = await service.run_auto_escalation(tenant_id, system_user_id)
                if count > 0:
                    logger.info(
                        "Auto-escalation completed",
                        tenant_id=str(tenant_id),
                        escalated_count=count
                    )
                    total_escalated += count
        except Exception as e:
            logger.error(
                "Auto-escalation failed for tenant",
                tenant_id=str(tenant_id),
                error=str(e)
            )

    return total_escalated


async def main():
    """Main scheduler loop."""
    settings = get_settings()
    logger.info(
        "Starting complaint auto-escalation scheduler",
        interval_seconds=ESCALATION_INTERVAL_SECONDS,
        environment=settings.environment,
    )

    signal.signal(signal.SIGINT, handle_shutdown)
    signal.signal(signal.SIGTERM, handle_shutdown)

    await db_manager.init_db()
    logger.info("Database connection initialized")

    try:
        while not _shutdown:
            start = datetime.utcnow()
            try:
                count = await run_escalation_cycle()
                duration = (datetime.utcnow() - start).total_seconds()
                logger.info(
                    "Escalation cycle complete",
                    total_escalated=count,
                    duration_seconds=round(duration, 2)
                )
            except Exception as e:
                logger.error("Escalation cycle failed", error=str(e))

            # Sleep in small increments to allow graceful shutdown
            for _ in range(ESCALATION_INTERVAL_SECONDS):
                if _shutdown:
                    break
                await asyncio.sleep(1)
    finally:
        await db_manager.close_db()
        logger.info("Scheduler shut down cleanly")


if __name__ == "__main__":
    asyncio.run(main())
