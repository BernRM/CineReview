"""Deterministic presentation data for the classroom demo environment."""

from datetime import date, datetime, timedelta, timezone

from sqlalchemy.orm import Session as DbSession

from app.models.library import WatchedMovie, WatchlistItem
from app.models.movie import Genre, Movie
from app.models.review import Review, ReviewStatus
from app.models.user import User, UserRole, UserStatus
from app.security.passwords import hash_password

DEMO_ADMIN_EMAIL = "admin@cineview.local"
DEMO_ADMIN_PASSWORD = "CineView@Admin2026"
DEMO_USER_EMAIL = "usuario@cineview.local"
DEMO_USER_PASSWORD = "CineView@User2026"

_GENRES = {
    12: "Aventura",
    14: "Fantasia",
    16: "Animação",
    18: "Drama",
    28: "Ação",
    35: "Comédia",
    53: "Suspense",
    80: "Crime",
    878: "Ficção científica",
}

_MOVIES = [
    {
        "tmdb_id": 693134,
        "title": "Duna: Parte Dois",
        "original_title": "Dune: Part Two",
        "overview": (
            "Paul Atreides une-se a Chani e aos Fremen enquanto busca vingança "
            "contra os conspiradores que destruíram sua família."
        ),
        "release_date": date(2024, 2, 27),
        "runtime_minutes": 166,
        "original_language": "en",
        "poster_path": "/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg",
        "backdrop_path": "/xOMo8BRK7PfcJv9JCnx7s5hj0PX.jpg",
        "tmdb_vote_average": 8.2,
        "tmdb_vote_count": 6900,
        "is_featured": True,
        "genres": [12, 18, 878],
    },
    {
        "tmdb_id": 872585,
        "title": "Oppenheimer",
        "original_title": "Oppenheimer",
        "overview": (
            "A trajetória do físico J. Robert Oppenheimer e o impacto humano e "
            "político da criação da bomba atômica."
        ),
        "release_date": date(2023, 7, 19),
        "runtime_minutes": 181,
        "original_language": "en",
        "poster_path": "/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg",
        "backdrop_path": "/fm6KqXpk3M2HVveHwCrBSSBaO0V.jpg",
        "tmdb_vote_average": 8.1,
        "tmdb_vote_count": 9800,
        "is_featured": False,
        "genres": [18],
    },
    {
        "tmdb_id": 569094,
        "title": "Homem-Aranha: Através do Aranhaverso",
        "original_title": "Spider-Man: Across the Spider-Verse",
        "overview": (
            "Miles Morales atravessa o multiverso e encontra uma equipe de "
            "Pessoas-Aranha encarregada de proteger sua própria existência."
        ),
        "release_date": date(2023, 5, 31),
        "runtime_minutes": 140,
        "original_language": "en",
        "poster_path": "/8Vt6mWEReuy4Of61Lnj5Xj704m8.jpg",
        "backdrop_path": "/4HodYYKEIsGOdinkGi2Ucz6X9i0.jpg",
        "tmdb_vote_average": 8.4,
        "tmdb_vote_count": 7200,
        "is_featured": False,
        "genres": [12, 16, 28, 878],
    },
    {
        "tmdb_id": 157336,
        "title": "Interestelar",
        "original_title": "Interstellar",
        "overview": (
            "Uma equipe de exploradores viaja por um buraco de minhoca no espaço "
            "para tentar garantir o futuro da humanidade."
        ),
        "release_date": date(2014, 11, 5),
        "runtime_minutes": 169,
        "original_language": "en",
        "poster_path": "/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg",
        "backdrop_path": "/xJHokMbljvjADYdit5fK5VQsXEG.jpg",
        "tmdb_vote_average": 8.5,
        "tmdb_vote_count": 38000,
        "is_featured": False,
        "genres": [12, 18, 878],
    },
    {
        "tmdb_id": 238,
        "title": "O Poderoso Chefão",
        "original_title": "The Godfather",
        "overview": (
            "O patriarca de uma dinastia do crime transfere o controle de seu "
            "império clandestino para o filho relutante."
        ),
        "release_date": date(1972, 3, 14),
        "runtime_minutes": 175,
        "original_language": "en",
        "poster_path": "/3bhkrj58Vtu7enYsRolD1fZdja1.jpg",
        "backdrop_path": "/tmU7GeKVybMWFButWEGl2M4GeiP.jpg",
        "tmdb_vote_average": 8.7,
        "tmdb_vote_count": 21000,
        "is_featured": False,
        "genres": [18, 80],
    },
    {
        "tmdb_id": 496243,
        "title": "Parasita",
        "original_title": "기생충",
        "overview": (
            "Uma família com dificuldades financeiras se infiltra pouco a pouco "
            "na casa e na rotina de uma família rica."
        ),
        "release_date": date(2019, 5, 30),
        "runtime_minutes": 133,
        "original_language": "ko",
        "poster_path": "/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg",
        "backdrop_path": "/TU9NIjwzjoKPwQHoHshkFcQUCG.jpg",
        "tmdb_vote_average": 8.5,
        "tmdb_vote_count": 19000,
        "is_featured": False,
        "genres": [18, 35, 53],
    },
    {
        "tmdb_id": 346698,
        "title": "Barbie",
        "original_title": "Barbie",
        "overview": (
            "Barbie deixa o mundo perfeito da Barbielândia para descobrir o que "
            "significa viver no mundo real."
        ),
        "release_date": date(2023, 7, 19),
        "runtime_minutes": 114,
        "original_language": "en",
        "poster_path": "/iuFNMS8U5cb6xfzi51Dbkovj7vM.jpg",
        "backdrop_path": "/ctMserH8g2SeOAnCw5gFjdQF8mo.jpg",
        "tmdb_vote_average": 7.0,
        "tmdb_vote_count": 10000,
        "is_featured": False,
        "genres": [12, 35],
    },
    {
        "tmdb_id": 603,
        "title": "Matrix",
        "original_title": "The Matrix",
        "overview": (
            "Um programador descobre que a realidade em que vive é uma simulação "
            "e se junta à rebelião contra as máquinas."
        ),
        "release_date": date(1999, 3, 30),
        "runtime_minutes": 136,
        "original_language": "en",
        "poster_path": "/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg",
        "backdrop_path": "/fNG7i7RqMErkcqhohV2a6cV1Ehy.jpg",
        "tmdb_vote_average": 8.2,
        "tmdb_vote_count": 26000,
        "is_featured": False,
        "genres": [28, 878],
    },
    {
        "tmdb_id": 129,
        "title": "A Viagem de Chihiro",
        "original_title": "千と千尋の神隠し",
        "overview": (
            "Uma garota entra em um mundo governado por deuses, bruxas e espíritos "
            "onde os humanos são transformados em animais."
        ),
        "release_date": date(2001, 7, 20),
        "runtime_minutes": 125,
        "original_language": "ja",
        "poster_path": "/39wmItIWsg5sZMyRUHLkWBcuVCM.jpg",
        "backdrop_path": "/Ab8mkHmkYADjU7wQiOkia9BzGvS.jpg",
        "tmdb_vote_average": 8.5,
        "tmdb_vote_count": 17000,
        "is_featured": False,
        "genres": [12, 16, 14],
    },
]


def _upsert_demo_users(db: DbSession, now: datetime) -> dict[str, User]:
    definitions = [
        {
            "key": "admin",
            "name": "Administrador CineView",
            "username": "admin_demo",
            "email": DEMO_ADMIN_EMAIL,
            "password": DEMO_ADMIN_PASSWORD,
            "role": UserRole.admin,
            "bio": "Conta administrativa preparada para a apresentação do CineView.",
        },
        {
            "key": "user",
            "name": "Usuário Demonstração",
            "username": "usuario_demo",
            "email": DEMO_USER_EMAIL,
            "password": DEMO_USER_PASSWORD,
            "role": UserRole.user,
            "bio": "Cinófilo, fã de ficção científica, animação e grandes histórias.",
        },
    ]
    users: dict[str, User] = {}
    for item in definitions:
        user = db.query(User).filter(User.email == item["email"]).first()
        if user is None:
            user = User(
                created_at=now,
                email=item["email"],
                username=item["username"],
                name=item["name"],
                password_hash="",
            )
            db.add(user)
        user.name = item["name"]
        user.username = item["username"]
        user.password_hash = hash_password(item["password"])
        user.role = item["role"]
        user.status = UserStatus.active
        user.bio = item["bio"]
        user.updated_at = now
        users[item["key"]] = user
    db.flush()
    return users


def _upsert_genres(db: DbSession) -> dict[int, Genre]:
    genres: dict[int, Genre] = {}
    for tmdb_id, name in _GENRES.items():
        genre = db.query(Genre).filter(Genre.tmdb_id == tmdb_id).first()
        if genre is None:
            genre = Genre(tmdb_id=tmdb_id, name=name)
            db.add(genre)
        else:
            genre.name = name
        genres[tmdb_id] = genre
    db.flush()
    return genres


def _upsert_movies(
    db: DbSession,
    genres: dict[int, Genre],
    now: datetime,
) -> dict[int, Movie]:
    movies: dict[int, Movie] = {}
    for index, item in enumerate(_MOVIES):
        movie = db.query(Movie).filter(Movie.tmdb_id == item["tmdb_id"]).first()
        if movie is None:
            movie = Movie(tmdb_id=item["tmdb_id"], title=item["title"], created_at=now)
            db.add(movie)
        for field in (
            "title",
            "original_title",
            "overview",
            "release_date",
            "runtime_minutes",
            "original_language",
            "poster_path",
            "backdrop_path",
            "tmdb_vote_average",
            "tmdb_vote_count",
            "is_featured",
        ):
            setattr(movie, field, item[field])
        movie.is_active = True
        movie.updated_at = now - timedelta(seconds=index)
        movie.tmdb_synced_at = now
        movie.genres = [genres[genre_id] for genre_id in item["genres"]]
        movies[item["tmdb_id"]] = movie
    db.flush()
    return movies


def _add_review(
    db: DbSession,
    movie: Movie,
    now: datetime,
    *,
    rating: float,
    title: str,
    body: str,
    user: User | None = None,
    reviewer: str | None = None,
    days_ago: int = 0,
) -> None:
    query = db.query(Review).filter(Review.movie_id == movie.id)
    if user is not None:
        query = query.filter(Review.user_id == user.id)
    else:
        query = query.filter(
            Review.user_id.is_(None),
            Review.legacy_reviewer_name == reviewer,
        )
    review = query.first()
    timestamp = now - timedelta(days=days_ago)
    if review is None:
        review = Review(
            movie_id=movie.id,
            user_id=user.id if user else None,
            legacy_reviewer_name=reviewer,
            created_at=timestamp,
            updated_at=timestamp,
            rating=rating,
        )
        db.add(review)
    review.rating = rating
    review.title = title
    review.body = body
    review.contains_spoiler = False
    review.status = ReviewStatus.published
    review.updated_at = timestamp


def _seed_reviews(
    db: DbSession,
    users: dict[str, User],
    movies: dict[int, Movie],
    now: datetime,
) -> None:
    _add_review(
        db,
        movies[693134],
        now,
        user=users["user"],
        rating=9.5,
        title="Espetáculo em grande escala",
        body="Visual impressionante, trilha marcante e uma evolução excelente da história.",
        days_ago=2,
    )
    _add_review(
        db,
        movies[496243],
        now,
        user=users["user"],
        rating=9.0,
        title="Tenso, divertido e necessário",
        body="Uma crítica social afiada construída com humor e suspense na medida certa.",
        days_ago=8,
    )
    _add_review(
        db,
        movies[157336],
        now,
        user=users["admin"],
        rating=9.5,
        title="Ficção científica com coração",
        body="Uma experiência ambiciosa sobre tempo, família e escolhas humanas.",
        days_ago=12,
    )
    _add_review(
        db,
        movies[569094],
        now,
        user=users["admin"],
        rating=9.0,
        title="Animação sem limites",
        body="Inventivo em cada quadro e cheio de personalidade do começo ao fim.",
        days_ago=5,
    )
    _add_review(
        db,
        movies[346698],
        now,
        reviewer="Marina Costa",
        rating=8.0,
        title="Muito além do rosa",
        body="Uma comédia criativa, autoconsciente e com ótimo design de produção.",
        days_ago=15,
    )
    _add_review(
        db,
        movies[603],
        now,
        reviewer="Rafael Lima",
        rating=9.5,
        title="Um clássico que continua atual",
        body="Ação, filosofia e efeitos visuais que mudaram o cinema.",
        days_ago=20,
    )
    _add_review(
        db,
        movies[129],
        now,
        reviewer="Clara Nunes",
        rating=10.0,
        title="Uma obra inesquecível",
        body="Delicado, mágico e visualmente encantador em todos os detalhes.",
        days_ago=3,
    )


def _seed_library(
    db: DbSession,
    user: User,
    movies: dict[int, Movie],
    now: datetime,
) -> None:
    for tmdb_id in (346698, 129, 238):
        movie = movies[tmdb_id]
        exists = db.query(WatchlistItem).filter_by(user_id=user.id, movie_id=movie.id).first()
        if exists is None:
            db.add(WatchlistItem(user_id=user.id, movie_id=movie.id, created_at=now))

    for offset, tmdb_id in enumerate((693134, 496243, 157336)):
        movie = movies[tmdb_id]
        exists = db.query(WatchedMovie).filter_by(user_id=user.id, movie_id=movie.id).first()
        if exists is None:
            watched_at = now - timedelta(days=offset * 4 + 1)
            db.add(
                WatchedMovie(
                    user_id=user.id,
                    movie_id=movie.id,
                    watched_at=watched_at,
                    created_at=watched_at,
                )
            )


def seed_demo_data(db: DbSession) -> dict[str, int]:
    """Create or refresh demo records without producing duplicates."""
    now = datetime.now(timezone.utc)
    users = _upsert_demo_users(db, now)
    genres = _upsert_genres(db)
    movies = _upsert_movies(db, genres, now)
    _seed_reviews(db, users, movies, now)
    _seed_library(db, users["user"], movies, now)
    db.commit()
    return {
        "users": len(users),
        "movies": len(movies),
        "reviews": 7,
    }
