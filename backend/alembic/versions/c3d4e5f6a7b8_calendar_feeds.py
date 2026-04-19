"""multi calendar feeds

Revision ID: c3d4e5f6a7b8
Revises: b2c3d4e5f6a7
Create Date: 2026-04-20 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "c3d4e5f6a7b8"
down_revision: Union[str, None] = "b2c3d4e5f6a7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "calendar_feeds",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("ics_url", sa.Text(), nullable=False),
        sa.Column("employer_label", sa.String(length=120), nullable=False),
        sa.Column("last_synced_at", sa.DateTime(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )
    op.create_index(
        "ix_calendar_feeds_user_id", "calendar_feeds", ["user_id"]
    )

    # Backfill: existing users with roster_ics_url → one feed row.
    op.execute(
        """
        INSERT INTO calendar_feeds (user_id, ics_url, employer_label, last_synced_at)
        SELECT id, roster_ics_url, 'Calendar shift', calendar_last_synced_at
        FROM users
        WHERE roster_ics_url IS NOT NULL AND length(trim(roster_ics_url)) > 0
        """
    )

    op.drop_column("users", "roster_ics_url")
    op.drop_column("users", "calendar_last_synced_at")


def downgrade() -> None:
    op.add_column("users", sa.Column("roster_ics_url", sa.Text(), nullable=True))
    op.add_column(
        "users", sa.Column("calendar_last_synced_at", sa.DateTime(), nullable=True)
    )
    op.execute(
        """
        UPDATE users u
        SET roster_ics_url = f.ics_url,
            calendar_last_synced_at = f.last_synced_at
        FROM (
            SELECT DISTINCT ON (user_id) user_id, ics_url, last_synced_at
            FROM calendar_feeds
            ORDER BY user_id, created_at ASC
        ) f
        WHERE u.id = f.user_id
        """
    )
    op.drop_index("ix_calendar_feeds_user_id", table_name="calendar_feeds")
    op.drop_table("calendar_feeds")
