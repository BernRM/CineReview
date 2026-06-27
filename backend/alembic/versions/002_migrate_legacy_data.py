"""migrate legacy filmes and avaliacoes to new schema

Revision ID: 002
Revises: 001
Create Date: 2026-06-27

Copies data from legacy filmes/avaliacoes tables into movies/reviews.
Safe to run on empty DBs (no-op) and existing DBs (migrates).
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import text

revision: str = "002"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()

    # Check if legacy tables exist
    has_filmes = conn.execute(
        text("SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='filmes')")
    ).scalar()

    if not has_filmes:
        return

    from datetime import datetime, timezone
    now = datetime.now(timezone.utc)

    filmes = conn.execute(text("SELECT id, titulo, sinopse FROM filmes ORDER BY id")).fetchall()
    filme_id_map: dict[int, int] = {}

    for row in filmes:
        result = conn.execute(
            text(
                "INSERT INTO movies (title, overview, is_featured, is_active, created_at, updated_at) "
                "VALUES (:title, :overview, false, true, :now, :now) "
                "ON CONFLICT DO NOTHING RETURNING id"
            ),
            {"title": row.titulo, "overview": row.sinopse, "now": now},
        )
        inserted = result.fetchone()
        if inserted:
            filme_id_map[row.id] = inserted[0]

    has_avaliacoes = conn.execute(
        text("SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='avaliacoes')")
    ).scalar()

    if not has_avaliacoes:
        return

    avaliacoes = conn.execute(
        text("SELECT id, filme_id, nome_avaliador, nota, comentario FROM avaliacoes ORDER BY id")
    ).fetchall()

    for row in avaliacoes:
        movie_id = filme_id_map.get(row.filme_id)
        if movie_id is None:
            continue
        rating = max(1.0, min(10.0, float(row.nota)))
        rating = round(rating, 1)
        conn.execute(
            text(
                "INSERT INTO reviews (movie_id, legacy_reviewer_name, rating, body, contains_spoiler, status, created_at, updated_at) "
                "VALUES (:movie_id, :name, :rating, :body, false, 'published', :now, :now) "
                "ON CONFLICT DO NOTHING"
            ),
            {"movie_id": movie_id, "name": row.nome_avaliador, "rating": rating, "body": row.comentario, "now": now},
        )


def downgrade() -> None:
    # Data migration is not reversible without data loss risk
    pass
