"""allow report history without duplicate-open reports

Revision ID: 003
Revises: 002
Create Date: 2026-06-27
"""
from typing import Sequence, Union

from alembic import op

revision: str = "003"
down_revision: Union[str, None] = "002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_constraint(
        "uq_report_open_per_user",
        "review_reports",
        type_="unique",
    )


def downgrade() -> None:
    op.create_unique_constraint(
        "uq_report_open_per_user",
        "review_reports",
        ["review_id", "reporter_user_id", "status"],
    )
