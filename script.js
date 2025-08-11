// ===== CONSTANTES E VARIÁVEIS =====
const API_KEY = "dd423acc844a7bfa709306420de5da6a";
const API_URL = `https://api.themoviedb.org/3/movie/top_rated?api_key=${API_KEY}&language=pt-BR&page=1`;
const API_GENRES = `https://api.themoviedb.org/3/genre/movie/list?api_key=${API_KEY}&language=pt-BR`;

let genresMap = {};
let filmesComVotos = [];
const filmesStorageKey = "filmesComVotos";


// ===== FUNÇÕES AUXILIARES =====

// Cria a div para exibir totais, caso não exista
function criarDivTotais() {
  let totaisDiv = document.getElementById("totais-gerais");
  if (!totaisDiv) {
    totaisDiv = document.createElement("div");
    totaisDiv.id = "totais-gerais";
    const h1 = document.querySelector("h1");
    if (h1 && h1.parentNode) {
      h1.parentNode.insertBefore(totaisDiv, h1.nextSibling);
    } else {
      document.body.insertBefore(totaisDiv, document.body.firstChild);
    }
  }
}

// Salva dados no localStorage
function salvarNoStorage() {
  localStorage.setItem(filmesStorageKey, JSON.stringify(filmesComVotos));
}

// Carrega dados do localStorage
function carregarDoStorage() {
  const data = localStorage.getItem(filmesStorageKey);
  return data ? JSON.parse(data) : [];
}


// ===== FUNÇÕES DE INTERAÇÃO COM A API =====

// Carrega gêneros da API e preenche o mapa
async function carregarGeneros() {
  const resposta = await fetch(API_GENRES);
  const dados = await resposta.json();
  genresMap = dados.genres.reduce((map, genero) => {
    map[genero.id] = genero.name;
    return map;
  }, {});
}

// Carrega filmes da API e mescla com storage
async function carregarFilmes() {
  await carregarGeneros();

  const resposta = await fetch(API_URL);
  const dados = await resposta.json();
  const filmesAPI = dados.results.slice(0, 5);

  const filmesStorage = carregarDoStorage();

  const filmesMap = new Map();

  filmesAPI.forEach(filme => {
    const filmeSalvo = filmesStorage.find(f => f.id === filme.id);
    filmesMap.set(filme.id, {
      ...filme,
      gostei: filmeSalvo ? filmeSalvo.gostei : 0,
      naoGostei: filmeSalvo ? filmeSalvo.naoGostei : 0
    });
  });

  filmesStorage.forEach(filmeStorage => {
    if (!filmesMap.has(filmeStorage.id)) {
      filmesMap.set(filmeStorage.id, filmeStorage);
    }
  });

  filmesComVotos = Array.from(filmesMap.values());

  salvarNoStorage();
  renderizarFilmes();

  console.log("Filmes carregados e mesclados:", filmesComVotos);
}


// ===== FUNÇÕES DE INTERAÇÃO COM A INTERFACE =====

// Atualiza os totais "Gostei" e "Não Gostei"
function atualizarTotais() {
  const totalGostei = filmesComVotos.reduce((acc, f) => acc + f.gostei, 0);
  const totalNaoGostei = filmesComVotos.reduce((acc, f) => acc + f.naoGostei, 0);

  const totaisDiv = document.getElementById("totais-gerais");
  if (!totaisDiv) {
    console.error("Div totais-gerais não encontrada");
    return;
  }
  totaisDiv.innerHTML = `
    <p><strong>Filmes que gostei 👍:</strong> ${totalGostei}</p>
    <p><strong>Filmes que não gostei 👎:</strong> ${totalNaoGostei}</p>
  `;
}

// Renderiza a lista de filmes na página
function renderizarFilmes() {
  const container = document.getElementById("filmes-container");
  container.innerHTML = "";

  filmesComVotos.forEach((filme) => {
    const generos = filme.genres
      ? filme.genres.join(", ")
      : filme.genre_ids.map(id => genresMap[id]).join(", ") || "Não informado";

    const nota = filme.vote_average ? filme.vote_average.toFixed(1) : "N/A";
    const votos = filme.vote_count || 0;

    const div = document.createElement("div");
    div.classList.add("filme");

    div.innerHTML = `
      <h2>${filme.title}</h2>
      <img src="https://image.tmdb.org/t/p/w500${filme.poster_path}" alt="${filme.title}"
          onerror="this.onerror=null;this.src='https://via.placeholder.com/200x300?text=Sem+Imagem';" />
      <p><strong>Gêneros:</strong> ${generos}</p>
      <p><strong>Avaliação:</strong> ${nota} / 10 (${votos} votos)</p>
      <p>${filme.overview || "Sem descrição disponível"}</p>
      <p><strong>Votos:</strong> Gostei (${filme.gostei}) | Não Gostei (${filme.naoGostei})</p>
      <button data-id="${filme.id}" data-tipo="gostei">Gostei 👍</button>
      <button data-id="${filme.id}" data-tipo="naoGostei">Não Gostei 👎</button>
      <button data-id="${filme.id}" class="btn-excluir">Excluir ❌</button>
    `;

    div.querySelectorAll("button[data-tipo]").forEach((btn) => {
      btn.addEventListener("click", votar);
    });

    div.querySelector(".btn-excluir").addEventListener("click", excluirFilme);

    container.appendChild(div);
  });

  atualizarTotais();
}


// ===== EVENT HANDLERS =====

// Incrementa os votos e atualiza a interface
function votar(event) {
  const id = Number(event.target.dataset.id);
  const tipo = event.target.dataset.tipo;

  filmesComVotos = filmesComVotos.map((filme) => {
    if (filme.id === id) {
      if (tipo === "gostei") filme.gostei++;
      else if (tipo === "naoGostei") filme.naoGostei++;
    }
    return filme;
  });

  salvarNoStorage();
  renderizarFilmes();
}

// Remove um filme da lista
function excluirFilme(event) {
  const id = Number(event.target.dataset.id);

  if (confirm("Tem certeza que deseja excluir este filme?")) {
    filmesComVotos = filmesComVotos.filter(filme => filme.id !== id);
    salvarNoStorage();
    renderizarFilmes();
  }
}

// Cadastra um novo filme manualmente pelo formulário
function cadastrarFilme(event) {
  event.preventDefault();

  const titulo = document.getElementById("input-titulo").value.trim();
  const generoStr = document.getElementById("input-genero").value.trim();
  const imagem = document.getElementById("input-imagem").value.trim();
  const descricao = document.getElementById("input-descricao").value.trim();

  if (!titulo || !generoStr || !imagem) {
    alert("Por favor, preencha todos os campos obrigatórios.");
    return;
  }

  const generos = generoStr.split(",").map(g => g.trim()).filter(g => g.length > 0);
  const novoId = Date.now() * -1;

  const novoFilme = {
    id: novoId,
    title: titulo,
    genre_ids: [],
    genres: generos,
    poster_path: imagem,
    overview: descricao || "Sem descrição disponível",
    vote_average: null,
    vote_count: 0,
    gostei: 0,
    naoGostei: 0
  };

  filmesComVotos.push(novoFilme);
  salvarNoStorage();
  renderizarFilmes();

  event.target.reset();
}


// ===== INICIALIZAÇÃO =====

document.addEventListener("DOMContentLoaded", () => {
  criarDivTotais();
  carregarFilmes();
  document.getElementById("form-cadastro").addEventListener("submit", cadastrarFilme);
});
