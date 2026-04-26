const API = "/api";

const state = {
  filmes: [],
};

const el = {
  status: document.querySelector("#api-status"),
  mensagem: document.querySelector("#mensagem"),
  listaFilmes: document.querySelector("#lista-filmes"),
  recarregar: document.querySelector("#recarregar"),
  filmeForm: document.querySelector("#filme-form"),
  filmeFormTitle: document.querySelector("#filme-form-title"),
  cancelarFilme: document.querySelector("#cancelar-filme"),
  filmeId: document.querySelector("#filme-id"),
  titulo: document.querySelector("#titulo"),
  diretor: document.querySelector("#diretor"),
  genero: document.querySelector("#genero"),
  ano: document.querySelector("#ano"),
  sinopse: document.querySelector("#sinopse"),
  avaliacaoForm: document.querySelector("#avaliacao-form"),
  avaliacaoFormTitle: document.querySelector("#avaliacao-form-title"),
  cancelarAvaliacao: document.querySelector("#cancelar-avaliacao"),
  avaliacaoId: document.querySelector("#avaliacao-id"),
  filmeAvaliacao: document.querySelector("#filme-avaliacao"),
  nomeAvaliador: document.querySelector("#nome-avaliador"),
  nota: document.querySelector("#nota"),
  comentario: document.querySelector("#comentario"),
};

async function request(path, options = {}) {
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  if (response.status === 204) {
    return null;
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const detalhe = data?.detail || "Erro ao acessar a API.";
    throw new Error(Array.isArray(detalhe) ? detalhe[0].msg : detalhe);
  }

  return data;
}

function mostrarMensagem(texto, erro = false) {
  el.mensagem.textContent = texto;
  el.mensagem.classList.toggle("hidden", !texto);
  el.mensagem.style.background = erro ? "#fde2df" : "#fff3cd";
  el.mensagem.style.color = erro ? "#8f2d28" : "#6b5200";
}

function atualizarStatus(ok) {
  el.status.textContent = ok ? "Online" : "Offline";
  el.status.classList.toggle("ok", ok);
  el.status.classList.toggle("error", !ok);
}

function mediaAvaliacoes(avaliacoes) {
  if (!avaliacoes.length) {
    return "-";
  }
  const soma = avaliacoes.reduce((total, item) => total + Number(item.nota), 0);
  return (soma / avaliacoes.length).toFixed(1);
}

function escapar(texto) {
  return String(texto)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderSelectFilmes() {
  el.filmeAvaliacao.innerHTML = state.filmes.length
    ? state.filmes
        .map((filme) => `<option value="${filme.id}">${escapar(filme.titulo)}</option>`)
        .join("")
    : '<option value="">Cadastre um filme primeiro</option>';

  el.filmeAvaliacao.disabled = state.filmes.length === 0;
  el.avaliacaoForm.querySelector(".primary").disabled = state.filmes.length === 0;
}

function renderFilmes() {
  if (!state.filmes.length) {
    el.listaFilmes.innerHTML = '<p class="empty">Nenhum filme cadastrado.</p>';
    return;
  }

  el.listaFilmes.innerHTML = state.filmes
    .map((filme) => {
      const avaliacoes = filme.avaliacoes || [];
      const reviewsHtml = avaliacoes.length
        ? avaliacoes
            .map(
              (avaliacao) => `
                <div class="review-row">
                  <div class="review-heading">
                    <span>${escapar(avaliacao.nome_avaliador)}</span>
                    <span>${Number(avaliacao.nota).toFixed(1)}/10</span>
                  </div>
                  <p class="review-text">${escapar(avaliacao.comentario)}</p>
                  <div class="actions">
                    <button class="ghost" type="button" data-action="edit-avaliacao" data-id="${avaliacao.id}">Editar</button>
                    <button class="danger" type="button" data-action="delete-avaliacao" data-id="${avaliacao.id}">Excluir</button>
                  </div>
                </div>
              `,
            )
            .join("")
        : '<p class="empty">Sem avaliacoes.</p>';

      return `
        <article class="movie-card">
          <div class="movie-header">
            <div class="movie-title">
              <h3>${escapar(filme.titulo)}</h3>
              <p class="meta">${escapar(filme.diretor)} - ${escapar(filme.genero)} - ${filme.ano}</p>
            </div>
            <div class="score">${mediaAvaliacoes(avaliacoes)}</div>
          </div>
          <p>${escapar(filme.sinopse)}</p>
          <div class="actions">
            <button class="ghost" type="button" data-action="edit-filme" data-id="${filme.id}">Editar</button>
            <button class="danger" type="button" data-action="delete-filme" data-id="${filme.id}">Excluir</button>
            <button class="primary" type="button" data-action="new-avaliacao" data-id="${filme.id}">Avaliar</button>
          </div>
          <div class="reviews">${reviewsHtml}</div>
        </article>
      `;
    })
    .join("");
}

async function carregarDados() {
  try {
    state.filmes = await request("/filmes");
    renderSelectFilmes();
    renderFilmes();
    atualizarStatus(true);
    mostrarMensagem("");
  } catch (error) {
    atualizarStatus(false);
    mostrarMensagem(error.message, true);
  }
}

function limparFilmeForm() {
  el.filmeForm.reset();
  el.filmeId.value = "";
  el.filmeFormTitle.textContent = "Novo filme";
  el.cancelarFilme.classList.add("hidden");
}

function limparAvaliacaoForm() {
  el.avaliacaoForm.reset();
  el.avaliacaoId.value = "";
  el.avaliacaoFormTitle.textContent = "Nova avaliacao";
  el.cancelarAvaliacao.classList.add("hidden");
}

function encontrarAvaliacao(id) {
  for (const filme of state.filmes) {
    const avaliacao = (filme.avaliacoes || []).find((item) => item.id === id);
    if (avaliacao) {
      return avaliacao;
    }
  }
  return null;
}

el.filmeForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const payload = {
    titulo: el.titulo.value.trim(),
    diretor: el.diretor.value.trim(),
    genero: el.genero.value.trim(),
    ano: Number(el.ano.value),
    sinopse: el.sinopse.value.trim(),
  };

  const id = el.filmeId.value;
  const metodo = id ? "PUT" : "POST";
  const caminho = id ? `/filmes/${id}` : "/filmes";

  try {
    await request(caminho, {
      method: metodo,
      body: JSON.stringify(payload),
    });
    limparFilmeForm();
    await carregarDados();
  } catch (error) {
    mostrarMensagem(error.message, true);
  }
});

el.avaliacaoForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const payload = {
    filme_id: Number(el.filmeAvaliacao.value),
    nome_avaliador: el.nomeAvaliador.value.trim(),
    nota: Number(el.nota.value),
    comentario: el.comentario.value.trim(),
  };

  const id = el.avaliacaoId.value;
  const metodo = id ? "PUT" : "POST";
  const caminho = id ? `/avaliacoes/${id}` : "/avaliacoes";

  try {
    await request(caminho, {
      method: metodo,
      body: JSON.stringify(payload),
    });
    limparAvaliacaoForm();
    await carregarDados();
  } catch (error) {
    mostrarMensagem(error.message, true);
  }
});

el.listaFilmes.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) {
    return;
  }

  const id = Number(button.dataset.id);
  const action = button.dataset.action;

  if (action === "edit-filme") {
    const filme = state.filmes.find((item) => item.id === id);
    el.filmeId.value = filme.id;
    el.titulo.value = filme.titulo;
    el.diretor.value = filme.diretor;
    el.genero.value = filme.genero;
    el.ano.value = filme.ano;
    el.sinopse.value = filme.sinopse;
    el.filmeFormTitle.textContent = "Editar filme";
    el.cancelarFilme.classList.remove("hidden");
    el.filmeForm.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  if (action === "delete-filme" && confirm("Excluir este filme e suas avaliacoes?")) {
    await request(`/filmes/${id}`, { method: "DELETE" });
    await carregarDados();
  }

  if (action === "new-avaliacao") {
    limparAvaliacaoForm();
    el.filmeAvaliacao.value = id;
    el.avaliacaoForm.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  if (action === "edit-avaliacao") {
    const avaliacao = encontrarAvaliacao(id);
    el.avaliacaoId.value = avaliacao.id;
    el.filmeAvaliacao.value = avaliacao.filme_id;
    el.nomeAvaliador.value = avaliacao.nome_avaliador;
    el.nota.value = avaliacao.nota;
    el.comentario.value = avaliacao.comentario;
    el.avaliacaoFormTitle.textContent = "Editar avaliacao";
    el.cancelarAvaliacao.classList.remove("hidden");
    el.avaliacaoForm.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  if (action === "delete-avaliacao" && confirm("Excluir esta avaliacao?")) {
    await request(`/avaliacoes/${id}`, { method: "DELETE" });
    await carregarDados();
  }
});

el.recarregar.addEventListener("click", carregarDados);
el.cancelarFilme.addEventListener("click", limparFilmeForm);
el.cancelarAvaliacao.addEventListener("click", limparAvaliacaoForm);

carregarDados();
