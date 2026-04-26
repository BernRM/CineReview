import os
import time
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import Depends, FastAPI, HTTPException, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import Column, Float, ForeignKey, Integer, String, Text, create_engine, text
from sqlalchemy.orm import Session, declarative_base, relationship, sessionmaker


DB_HOST = os.getenv("DB_HOST", "postgres")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_NAME = os.getenv("DB_NAME", "cinereview")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "postgres")

DATABASE_URL = (
    f"postgresql+psycopg2://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
)

engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class Filme(Base):
    __tablename__ = "filmes"

    id = Column(Integer, primary_key=True, index=True)
    titulo = Column(String(150), nullable=False, index=True)
    diretor = Column(String(120), nullable=False)
    genero = Column(String(80), nullable=False)
    ano = Column(Integer, nullable=False)
    sinopse = Column(Text, nullable=False)

    avaliacoes = relationship(
        "Avaliacao",
        back_populates="filme",
        cascade="all, delete-orphan",
    )


class Avaliacao(Base):
    __tablename__ = "avaliacoes"

    id = Column(Integer, primary_key=True, index=True)
    filme_id = Column(Integer, ForeignKey("filmes.id", ondelete="CASCADE"), nullable=False)
    nome_avaliador = Column(String(120), nullable=False)
    nota = Column(Float, nullable=False)
    comentario = Column(Text, nullable=False)

    filme = relationship("Filme", back_populates="avaliacoes")


class AvaliacaoBase(BaseModel):
    filme_id: int
    nome_avaliador: str = Field(min_length=1, max_length=120)
    nota: float = Field(ge=0, le=10)
    comentario: str = Field(min_length=1)


class AvaliacaoCreate(AvaliacaoBase):
    pass


class AvaliacaoUpdate(BaseModel):
    filme_id: Optional[int] = None
    nome_avaliador: Optional[str] = Field(default=None, min_length=1, max_length=120)
    nota: Optional[float] = Field(default=None, ge=0, le=10)
    comentario: Optional[str] = Field(default=None, min_length=1)


class AvaliacaoRead(AvaliacaoBase):
    id: int

    model_config = ConfigDict(from_attributes=True)


class FilmeBase(BaseModel):
    titulo: str = Field(min_length=1, max_length=150)
    diretor: str = Field(min_length=1, max_length=120)
    genero: str = Field(min_length=1, max_length=80)
    ano: int = Field(ge=1888, le=2100)
    sinopse: str = Field(min_length=1)


class FilmeCreate(FilmeBase):
    pass


class FilmeUpdate(BaseModel):
    titulo: Optional[str] = Field(default=None, min_length=1, max_length=150)
    diretor: Optional[str] = Field(default=None, min_length=1, max_length=120)
    genero: Optional[str] = Field(default=None, min_length=1, max_length=80)
    ano: Optional[int] = Field(default=None, ge=1888, le=2100)
    sinopse: Optional[str] = Field(default=None, min_length=1)


class FilmeRead(FilmeBase):
    id: int
    avaliacoes: list[AvaliacaoRead] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def criar_tabelas_com_retry():
    for tentativa in range(1, 11):
        try:
            with engine.connect() as connection:
                connection.execute(text("SELECT 1"))
            Base.metadata.create_all(bind=engine)
            return
        except Exception:
            if tentativa == 10:
                raise
            time.sleep(2)


@asynccontextmanager
async def lifespan(app: FastAPI):
    criar_tabelas_com_retry()
    yield


app = FastAPI(
    title="CineReview API",
    description="API CRUD de filmes e avaliacoes para a atividade de Redes.",
    version="1.0.0",
    docs_url="/api/docs",
    openapi_url="/api/openapi.json",
    lifespan=lifespan,
)


def buscar_filme_ou_404(db: Session, filme_id: int) -> Filme:
    filme = db.get(Filme, filme_id)
    if filme is None:
        raise HTTPException(status_code=404, detail="Filme nao encontrado.")
    return filme


def buscar_avaliacao_ou_404(db: Session, avaliacao_id: int) -> Avaliacao:
    avaliacao = db.get(Avaliacao, avaliacao_id)
    if avaliacao is None:
        raise HTTPException(status_code=404, detail="Avaliacao nao encontrada.")
    return avaliacao


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.post("/api/filmes", response_model=FilmeRead, status_code=status.HTTP_201_CREATED)
def criar_filme(filme: FilmeCreate, db: Session = Depends(get_db)):
    novo_filme = Filme(**filme.model_dump())
    db.add(novo_filme)
    db.commit()
    db.refresh(novo_filme)
    return novo_filme


@app.get("/api/filmes", response_model=list[FilmeRead])
def listar_filmes(db: Session = Depends(get_db)):
    return db.query(Filme).order_by(Filme.id).all()


@app.get("/api/filmes/{filme_id}", response_model=FilmeRead)
def obter_filme(filme_id: int, db: Session = Depends(get_db)):
    return buscar_filme_ou_404(db, filme_id)


@app.put("/api/filmes/{filme_id}", response_model=FilmeRead)
def atualizar_filme(filme_id: int, dados: FilmeUpdate, db: Session = Depends(get_db)):
    filme = buscar_filme_ou_404(db, filme_id)
    for campo, valor in dados.model_dump(exclude_unset=True).items():
        setattr(filme, campo, valor)
    db.commit()
    db.refresh(filme)
    return filme


@app.delete("/api/filmes/{filme_id}", status_code=status.HTTP_204_NO_CONTENT)
def remover_filme(filme_id: int, db: Session = Depends(get_db)):
    filme = buscar_filme_ou_404(db, filme_id)
    db.delete(filme)
    db.commit()
    return None


@app.post(
    "/api/avaliacoes",
    response_model=AvaliacaoRead,
    status_code=status.HTTP_201_CREATED,
)
def criar_avaliacao(avaliacao: AvaliacaoCreate, db: Session = Depends(get_db)):
    buscar_filme_ou_404(db, avaliacao.filme_id)
    nova_avaliacao = Avaliacao(**avaliacao.model_dump())
    db.add(nova_avaliacao)
    db.commit()
    db.refresh(nova_avaliacao)
    return nova_avaliacao


@app.get("/api/avaliacoes", response_model=list[AvaliacaoRead])
def listar_avaliacoes(filme_id: Optional[int] = None, db: Session = Depends(get_db)):
    consulta = db.query(Avaliacao)
    if filme_id is not None:
        buscar_filme_ou_404(db, filme_id)
        consulta = consulta.filter(Avaliacao.filme_id == filme_id)
    return consulta.order_by(Avaliacao.id).all()


@app.get("/api/filmes/{filme_id}/avaliacoes", response_model=list[AvaliacaoRead])
def listar_avaliacoes_do_filme(filme_id: int, db: Session = Depends(get_db)):
    buscar_filme_ou_404(db, filme_id)
    return (
        db.query(Avaliacao)
        .filter(Avaliacao.filme_id == filme_id)
        .order_by(Avaliacao.id)
        .all()
    )


@app.get("/api/avaliacoes/{avaliacao_id}", response_model=AvaliacaoRead)
def obter_avaliacao(avaliacao_id: int, db: Session = Depends(get_db)):
    return buscar_avaliacao_ou_404(db, avaliacao_id)


@app.put("/api/avaliacoes/{avaliacao_id}", response_model=AvaliacaoRead)
def atualizar_avaliacao(
    avaliacao_id: int,
    dados: AvaliacaoUpdate,
    db: Session = Depends(get_db),
):
    avaliacao = buscar_avaliacao_ou_404(db, avaliacao_id)
    dados_atualizacao = dados.model_dump(exclude_unset=True)

    if "filme_id" in dados_atualizacao:
        buscar_filme_ou_404(db, dados_atualizacao["filme_id"])

    for campo, valor in dados_atualizacao.items():
        setattr(avaliacao, campo, valor)

    db.commit()
    db.refresh(avaliacao)
    return avaliacao


@app.delete("/api/avaliacoes/{avaliacao_id}", status_code=status.HTTP_204_NO_CONTENT)
def remover_avaliacao(avaliacao_id: int, db: Session = Depends(get_db)):
    avaliacao = buscar_avaliacao_ou_404(db, avaliacao_id)
    db.delete(avaliacao)
    db.commit()
    return None
