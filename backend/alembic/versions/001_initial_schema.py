"""initial schema

Revision ID: 001
Revises:
Create Date: 2026-06-27

Creates new tables alongside legacy filmes/avaliacoes.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Keep existing tables (filmes, avaliacoes) untouched
    op.create_table(
        "users",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("name", sa.String(120), nullable=False),
        sa.Column("username", sa.String(30), unique=True, nullable=False),
        sa.Column("email", sa.String(254), unique=True, nullable=False),
        sa.Column("password_hash", sa.String(512), nullable=False),
        sa.Column("role", sa.Enum("user", "admin", name="userrole"), nullable=False, server_default="user"),
        sa.Column("status", sa.Enum("active", "suspended", name="userstatus"), nullable=False, server_default="active"),
        sa.Column("avatar_url", sa.String(512), nullable=True),
        sa.Column("bio", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("last_login_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_users_username", "users", ["username"])
    op.create_index("ix_users_email", "users", ["email"])

    op.create_table(
        "sessions",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("user_id", sa.Integer, sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("token_hash", sa.String(64), unique=True, nullable=False),
        sa.Column("csrf_token_hash", sa.String(64), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("last_used_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_sessions_user_id", "sessions", ["user_id"])
    op.create_index("ix_sessions_token_hash", "sessions", ["token_hash"])

    op.create_table(
        "movies",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("tmdb_id", sa.Integer, unique=True, nullable=True),
        sa.Column("title", sa.String(300), nullable=False),
        sa.Column("original_title", sa.String(300), nullable=True),
        sa.Column("overview", sa.Text, nullable=True),
        sa.Column("release_date", sa.Date, nullable=True),
        sa.Column("runtime_minutes", sa.Integer, nullable=True),
        sa.Column("original_language", sa.String(10), nullable=True),
        sa.Column("poster_path", sa.String(300), nullable=True),
        sa.Column("backdrop_path", sa.String(300), nullable=True),
        sa.Column("trailer_key", sa.String(50), nullable=True),
        sa.Column("tmdb_vote_average", sa.Numeric(4, 2), nullable=True),
        sa.Column("tmdb_vote_count", sa.Integer, nullable=True),
        sa.Column("is_featured", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("tmdb_synced_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_movies_tmdb_id", "movies", ["tmdb_id"])

    op.create_table(
        "genres",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("tmdb_id", sa.Integer, unique=True, nullable=False),
        sa.Column("name", sa.String(80), nullable=False),
    )

    op.create_table(
        "movie_genres",
        sa.Column("movie_id", sa.Integer, sa.ForeignKey("movies.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("genre_id", sa.Integer, sa.ForeignKey("genres.id", ondelete="CASCADE"), primary_key=True),
    )

    op.create_table(
        "reviews",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("movie_id", sa.Integer, sa.ForeignKey("movies.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", sa.Integer, sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("legacy_reviewer_name", sa.String(120), nullable=True),
        sa.Column("rating", sa.Numeric(3, 1), nullable=False),
        sa.Column("title", sa.String(200), nullable=True),
        sa.Column("body", sa.Text, nullable=True),
        sa.Column("contains_spoiler", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("status", sa.Enum("published", "hidden", "deleted", name="reviewstatus"), nullable=False, server_default="published"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("user_id", "movie_id", name="uq_review_user_movie"),
    )
    op.create_index("ix_reviews_movie_id", "reviews", ["movie_id"])
    op.create_index("ix_reviews_user_id", "reviews", ["user_id"])

    op.create_table(
        "watchlist_items",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("user_id", sa.Integer, sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("movie_id", sa.Integer, sa.ForeignKey("movies.id", ondelete="CASCADE"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("user_id", "movie_id", name="uq_watchlist_user_movie"),
    )

    op.create_table(
        "watched_movies",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("user_id", sa.Integer, sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("movie_id", sa.Integer, sa.ForeignKey("movies.id", ondelete="CASCADE"), nullable=False),
        sa.Column("watched_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("user_id", "movie_id", name="uq_watched_user_movie"),
    )

    op.create_table(
        "review_reports",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("review_id", sa.Integer, sa.ForeignKey("reviews.id", ondelete="CASCADE"), nullable=False),
        sa.Column("reporter_user_id", sa.Integer, sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("reason", sa.String(100), nullable=False),
        sa.Column("details", sa.Text, nullable=True),
        sa.Column("status", sa.Enum("open", "resolved", "dismissed", name="reportstatus"), nullable=False, server_default="open"),
        sa.Column("resolved_by", sa.Integer, sa.ForeignKey("users.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint("review_id", "reporter_user_id", "status", name="uq_report_open_per_user"),
    )

    op.create_table(
        "admin_audit_logs",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("admin_user_id", sa.Integer, sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("action", sa.String(100), nullable=False),
        sa.Column("target_type", sa.String(50), nullable=False),
        sa.Column("target_id", sa.Integer, nullable=True),
        sa.Column("metadata", sa.JSON, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("admin_audit_logs")
    op.drop_table("review_reports")
    op.drop_table("watched_movies")
    op.drop_table("watchlist_items")
    op.drop_table("reviews")
    op.drop_table("movie_genres")
    op.drop_table("genres")
    op.drop_table("movies")
    op.drop_table("sessions")
    op.drop_table("users")
    op.execute("DROP TYPE IF EXISTS userrole")
    op.execute("DROP TYPE IF EXISTS userstatus")
    op.execute("DROP TYPE IF EXISTS reviewstatus")
    op.execute("DROP TYPE IF EXISTS reportstatus")
