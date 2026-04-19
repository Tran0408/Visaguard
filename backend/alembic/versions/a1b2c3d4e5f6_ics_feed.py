"""swap google oauth fields for ics feed

Revision ID: a1b2c3d4e5f6
Revises: 8d3f921470b0
Create Date: 2026-04-19 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, None] = "8d3f921470b0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("roster_ics_url", sa.Text(), nullable=True))
    op.add_column(
        "users", sa.Column("calendar_last_synced_at", sa.DateTime(), nullable=True)
    )
    op.drop_column("users", "google_access_token")
    op.drop_column("users", "google_refresh_token")
    op.drop_column("users", "google_token_expiry")


def downgrade() -> None:
    op.add_column(
        "users", sa.Column("google_token_expiry", sa.DateTime(), nullable=True)
    )
    op.add_column(
        "users", sa.Column("google_refresh_token", sa.Text(), nullable=True)
    )
    op.add_column(
        "users", sa.Column("google_access_token", sa.Text(), nullable=True)
    )
    op.drop_column("users", "calendar_last_synced_at")
    op.drop_column("users", "roster_ics_url")
