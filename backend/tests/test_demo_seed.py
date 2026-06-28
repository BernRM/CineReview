from app.models.library import WatchedMovie, WatchlistItem
from app.models.movie import Genre, Movie
from app.models.review import Review
from app.models.user import User, UserRole
from app.security.passwords import verify_password
from app.services.demo_seed import (
    DEMO_ADMIN_EMAIL,
    DEMO_ADMIN_PASSWORD,
    DEMO_USER_EMAIL,
    DEMO_USER_PASSWORD,
    seed_demo_data,
)


def test_demo_seed_is_complete_and_idempotent(db):
    first = seed_demo_data(db)
    second = seed_demo_data(db)

    assert first == second == {"users": 2, "movies": 9, "reviews": 7}
    assert db.query(User).count() == 2
    assert db.query(Movie).count() == 9
    assert db.query(Genre).count() == 9
    assert db.query(Review).count() == 7
    assert db.query(WatchlistItem).count() == 3
    assert db.query(WatchedMovie).count() == 3


def test_demo_accounts_have_expected_access_and_credentials(db):
    seed_demo_data(db)

    admin = db.query(User).filter(User.email == DEMO_ADMIN_EMAIL).one()
    user = db.query(User).filter(User.email == DEMO_USER_EMAIL).one()

    assert admin.role == UserRole.admin
    assert user.role == UserRole.user
    assert verify_password(DEMO_ADMIN_PASSWORD, admin.password_hash)
    assert verify_password(DEMO_USER_PASSWORD, user.password_hash)
