"""employer break rules

Revision ID: d4e5f6a7b8c9
Revises: c3d4e5f6a7b8
Create Date: 2026-04-19 14:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "d4e5f6a7b8c9"
down_revision: Union[str, None] = "c3d4e5f6a7b8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "employer_break_rules",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "employer_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("employers.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("min_shift_hours", sa.Numeric(4, 2), nullable=False),
        sa.Column("unpaid_break_minutes", sa.Integer(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )
    op.create_index(
        "ix_employer_break_rules_employer_id",
        "employer_break_rules",
        ["employer_id"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_employer_break_rules_employer_id", table_name="employer_break_rules"
    )
    op.drop_table("employer_break_rules")
