const API = "/api";

const state = {
  filmes: [],
  mensagemTimer: null,
};

const el = {
  status: document.querySelector("#api-status"),
  mensagem: document.querySelector("#mensagem"),
  listaFilmes: document.querySelector("#lista-filmes"),
  recarregar: document.querySelector("#recarregar"),
  busca: document.querySelector("#busca"),
  statFilmes: document.querySelector("#stat-filmes"),
  statAvaliacoes: document.querySelector("#stat-avaliacoes"),
  statMedia: document.querySelector("#stat-media"),
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

function mostrarMensagem(texto, tipo = "info") {
  window.clearTimeout(state.mensagemTimer);
  el.mensagem.textContent = texto;
  el.mensagem.classList.toggle("hidden", !texto);
  el.mensagem.classList.toggle("error", tipo === true || tipo === "error");
  el.mensagem.classList.toggle("success", tipo === "success");

  if (texto && tipo === "success") {
    state.mensagemTimer = window.setTimeout(() => mostrarMensagem(""), 3600);
  }
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

function totalAvaliacoes() {
  return state.filmes.reduce(
    (total, filme) => total + (filme.avaliacoes || []).length,
    0,
  );
}

function mediaGeral() {
  const avaliacoes = state.filmes.flatMap((filme) => filme.avaliacoes || []);
  if (!avaliacoes.length) {
    return "-";
  }
  const soma = avaliacoes.reduce((total, item) => total + Number(item.nota), 0);
  return (soma / avaliacoes.length).toFixed(1);
}

function atualizarResumo() {
  el.statFilmes.textContent = state.filmes.length;
  el.statAvaliacoes.textContent = totalAvaliacoes();
  el.statMedia.textContent = mediaGeral();
}

function normalizar(texto) {
  return String(texto)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function filmesFiltrados() {
  const termo = normalizar(el.busca.value.trim());
  if (!termo) {
    return state.filmes;
  }

  return state.filmes.filter((filme) => {
    const conteudo = normalizar(
      `${filme.titulo} ${filme.diretor} ${filme.genero} ${filme.ano}`,
    );
    return conteudo.includes(termo);
  });
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
  const filmes = filmesFiltrados();

  if (!state.filmes.length) {
    el.listaFilmes.innerHTML = `
      <div class="empty-state">
        <strong>Nenhum filme cadastrado</strong>
        <p class="empty">O catalogo aparecera aqui quando a API retornar registros.</p>
      </div>
    `;
    return;
  }

  if (!filmes.length) {
    el.listaFilmes.innerHTML = `
      <div class="empty-state">
        <strong>Nenhum resultado encontrado</strong>
        <p class="empty">Revise o termo pesquisado ou atualize a listagem.</p>
      </div>
    `;
    return;
  }

  el.listaFilmes.innerHTML = filmes
    .map((filme) => {
      const avaliacoes = filme.avaliacoes || [];
      const reviewsHtml = avaliacoes.length
        ? avaliacoes
            .map(
              (avaliacao) => `
                <div class="review-row">
                  <div class="review-heading">
                    <span>${escapar(avaliacao.nome_avaliador)}</span>
                    <span class="review-score">${Number(avaliacao.nota).toFixed(1)}/10</span>
                  </div>
                  <p class="review-text">${escapar(avaliacao.comentario)}</p>
                  <div class="actions">
                    <button class="button secondary" type="button" data-action="edit-avaliacao" data-id="${avaliacao.id}">Editar</button>
                    <button class="button danger" type="button" data-action="delete-avaliacao" data-id="${avaliacao.id}">Excluir</button>
                  </div>
                </div>
              `,
            )
            .join("")
        : '<p class="empty">Sem avaliacoes.</p>';

      return `
        <article class="movie-card">
          <div class="movie-poster">
            <div class="poster-copy">
              <span class="genre-badge">${escapar(filme.genero)}</span>
              <h3>${escapar(filme.titulo)}</h3>
            </div>
            <div class="score">${mediaAvaliacoes(avaliacoes)}</div>
          </div>
          <div class="movie-body">
            <div class="meta">
              <span>${escapar(filme.diretor)}</span>
              <span>${filme.ano}</span>
              <span>${avaliacoes.length} avaliacoes</span>
            </div>
            <p class="sinopse">${escapar(filme.sinopse)}</p>
            <div class="actions">
              <button class="button secondary" type="button" data-action="edit-filme" data-id="${filme.id}">Editar</button>
              <button class="button danger" type="button" data-action="delete-filme" data-id="${filme.id}">Excluir</button>
              <button class="button primary" type="button" data-action="new-avaliacao" data-id="${filme.id}">Avaliar</button>
            </div>
            <div class="reviews">${reviewsHtml}</div>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderCarregando() {
  el.listaFilmes.innerHTML = `
    <div class="empty-state loading-state">
      <strong>Carregando acervo</strong>
      <p class="empty">Buscando filmes e avaliacoes na API.</p>
    </div>
  `;
}

function definirBotaoCarregando(button, carregando, textoCarregando = "Salvando...") {
  if (!button) {
    return;
  }

  if (carregando) {
    button.dataset.originalText = button.textContent;
    button.textContent = textoCarregando;
    button.disabled = true;
    return;
  }

  button.textContent = button.dataset.originalText || button.textContent;
  button.disabled = false;
  delete button.dataset.originalText;
}

async function carregarDados({ mostrarCarregando = true } = {}) {
  if (mostrarCarregando) {
    renderCarregando();
  }

  try {
    state.filmes = await request("/filmes");
    atualizarResumo();
    renderSelectFilmes();
    renderFilmes();
    atualizarStatus(true);
    mostrarMensagem("");
  } catch (error) {
    atualizarStatus(false);
    mostrarMensagem(error.message, "error");
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
  const botao = event.submitter;
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
    definirBotaoCarregando(botao, true);
    await request(caminho, {
      method: metodo,
      body: JSON.stringify(payload),
    });
    limparFilmeForm();
    await carregarDados();
    mostrarMensagem(id ? "Filme atualizado com sucesso." : "Filme cadastrado com sucesso.", "success");
  } catch (error) {
    mostrarMensagem(error.message, "error");
  } finally {
    definirBotaoCarregando(botao, false);
  }
});

el.avaliacaoForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const botao = event.submitter;
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
    definirBotaoCarregando(botao, true);
    await request(caminho, {
      method: metodo,
      body: JSON.stringify(payload),
    });
    limparAvaliacaoForm();
    await carregarDados();
    mostrarMensagem(
      id ? "Avaliacao atualizada com sucesso." : "Avaliacao cadastrada com sucesso.",
      "success",
    );
  } catch (error) {
    mostrarMensagem(error.message, "error");
  } finally {
    definirBotaoCarregando(botao, false);
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
    try {
      definirBotaoCarregando(button, true, "Excluindo...");
      await request(`/filmes/${id}`, { method: "DELETE" });
      await carregarDados();
      mostrarMensagem("Filme excluido com sucesso.", "success");
    } catch (error) {
      mostrarMensagem(error.message, "error");
    } finally {
      definirBotaoCarregando(button, false);
    }
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
    try {
      definirBotaoCarregando(button, true, "Excluindo...");
      await request(`/avaliacoes/${id}`, { method: "DELETE" });
      await carregarDados();
      mostrarMensagem("Avaliacao excluida com sucesso.", "success");
    } catch (error) {
      mostrarMensagem(error.message, "error");
    } finally {
      definirBotaoCarregando(button, false);
    }
  }
});

el.recarregar.addEventListener("click", carregarDados);
el.busca.addEventListener("input", renderFilmes);
el.cancelarFilme.addEventListener("click", limparFilmeForm);
el.cancelarAvaliacao.addEventListener("click", limparAvaliacaoForm);

carregarDados();
