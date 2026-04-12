const SUPABASE_URL = "https://zmomnbtqxttlgpxdvmzr.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_doB-Z-J7ingNc--jiPHSyQ__0HY95qI";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);

const loginSection = document.getElementById("loginSection");
const dashboardSection = document.getElementById("dashboardSection");
const loginForm = document.getElementById("loginForm");
const loginMessage = document.getElementById("loginMessage");
const loginButton = document.getElementById("loginButton");
const logoutButton = document.getElementById("logoutButton");

const giftForm = document.getElementById("giftForm");
const giftFormMessage = document.getElementById("giftFormMessage");
const giftSubmitButton = document.getElementById("giftSubmitButton");
const giftUsaCotas = document.getElementById("giftUsaCotas");
const giftQuantidadeWrapper = document.getElementById("giftQuantidadeWrapper");
const giftQuantidadeTotal = document.getElementById("giftQuantidadeTotal");

const confirmacoesTableBody = document.getElementById("confirmacoesTableBody");
const presentesTableBody = document.getElementById("presentesTableBody");
const reservasTableBody = document.getElementById("reservasTableBody");

const totalConfirmacoes = document.getElementById("totalConfirmacoes");
const totalPresentesSim = document.getElementById("totalPresentesSim");
const totalPresentesNao = document.getElementById("totalPresentesNao");
const totalAcompanhantes = document.getElementById("totalAcompanhantes");
const totalPresentesReservados = document.getElementById("totalPresentesReservados");

async function checkSession() {
  const { data, error } = await supabaseClient.auth.getSession();

  if (error) {
    console.error("Erro ao verificar sessão:", error);
    showLogin();
    return;
  }

  if (data.session) {
    showDashboard();
    await loadDashboardData();
  } else {
    showLogin();
  }
}

function showLogin() {
  loginSection.classList.remove("hidden");
  dashboardSection.classList.add("hidden");
}

function showDashboard() {
  loginSection.classList.add("hidden");
  dashboardSection.classList.remove("hidden");
}

function updateGiftQuantityVisibility() {
  if (!giftUsaCotas || !giftQuantidadeWrapper || !giftQuantidadeTotal) return;

  if (giftUsaCotas.checked) {
    giftQuantidadeWrapper.style.display = "block";
    giftQuantidadeTotal.value = giftQuantidadeTotal.value || "1";
    giftQuantidadeTotal.min = "1";
  } else {
    giftQuantidadeWrapper.style.display = "none";
    giftQuantidadeTotal.value = "1";
  }
}

if (giftUsaCotas) {
  giftUsaCotas.addEventListener("change", updateGiftQuantityVisibility);
  updateGiftQuantityVisibility();
}

if (loginForm) {
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("adminEmail").value.trim();
    const password = document.getElementById("adminPassword").value.trim();

    if (!email || !password) {
      loginMessage.textContent = "Preencha e-mail e senha.";
      loginMessage.style.color = "#800000";
      return;
    }

    loginButton.disabled = true;
    loginButton.textContent = "Entrando...";
    loginMessage.textContent = "";

    try {
      const { error } = await supabaseClient.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      loginMessage.textContent = "Login realizado com sucesso.";
      loginMessage.style.color = "#355b46";

      showDashboard();
      await loadDashboardData();
    } catch (error) {
      console.error("Erro no login:", error);
      loginMessage.textContent = "Não foi possível entrar. Verifique e-mail e senha.";
      loginMessage.style.color = "#800000";
    } finally {
      loginButton.disabled = false;
      loginButton.textContent = "Entrar";
    }
  });
}

if (logoutButton) {
  logoutButton.addEventListener("click", async () => {
    await supabaseClient.auth.signOut();
    showLogin();
  });
}

if (giftForm) {
  giftForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const nome = document.getElementById("giftNome").value.trim();
    const valor = document.getElementById("giftValor").value.trim();
    const descricao = document.getElementById("giftDescricao").value.trim();
    const usaCotas = !!giftUsaCotas.checked;
    const quantidadeTotal = usaCotas ? Number(giftQuantidadeTotal.value) : 1;

    if (!nome) {
      giftFormMessage.textContent = "Informe o nome do presente.";
      giftFormMessage.style.color = "#800000";
      return;
    }

    if (usaCotas && (!quantidadeTotal || Number.isNaN(quantidadeTotal) || quantidadeTotal < 1)) {
      giftFormMessage.textContent = "Informe uma quantidade total válida para as cotas.";
      giftFormMessage.style.color = "#800000";
      return;
    }

    giftSubmitButton.disabled = true;
    giftSubmitButton.textContent = "Cadastrando...";
    giftFormMessage.textContent = "";

    try {
      const { error } = await supabaseClient.from("presentes").insert([
        {
          nome,
          valor: valor || null,
          descricao: descricao || null,
          usa_cotas: usaCotas,
          quantidade_total: quantidadeTotal,
          quantidade_reservada: 0,
          status: "disponivel",
        },
      ]);

      if (error) throw error;

      giftFormMessage.textContent = "Presente cadastrado com sucesso.";
      giftFormMessage.style.color = "#355b46";

      giftForm.reset();
      updateGiftQuantityVisibility();
      await loadPresentes();
    } catch (error) {
      console.error("Erro ao cadastrar presente:", error);
      giftFormMessage.textContent = "Não foi possível cadastrar o presente.";
      giftFormMessage.style.color = "#800000";
    } finally {
      giftSubmitButton.disabled = false;
      giftSubmitButton.textContent = "Cadastrar presente";
    }
  });
}

async function loadDashboardData() {
  await Promise.all([loadConfirmacoes(), loadPresentes(), loadReservas()]);
}

async function loadConfirmacoes() {
  try {
    const { data, error } = await supabaseClient
      .from("confirmacoes")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    renderConfirmacoes(data || []);
    updateConfirmacoesStats(data || []);
  } catch (error) {
    console.error("Erro ao carregar confirmações:", error);
    confirmacoesTableBody.innerHTML = `
      <tr>
        <td colspan="6">Não foi possível carregar as confirmações.</td>
      </tr>
    `;
  }
}

async function loadPresentes() {
  try {
    const { data, error } = await supabaseClient
      .from("presentes")
      .select("*")
      .order("id", { ascending: true });

    if (error) throw error;

    renderPresentes(data || []);
    updatePresentesStats(data || []);
  } catch (error) {
    console.error("Erro ao carregar presentes:", error);
    presentesTableBody.innerHTML = `
      <tr>
        <td colspan="6">Não foi possível carregar os presentes.</td>
      </tr>
    `;
  }
}

async function loadReservas() {
  try {
    const { data, error } = await supabaseClient
      .from("reservas_presentes")
      .select(`
        id,
        reservado_por,
        created_at,
        presentes (
          nome
        )
      `)
      .order("created_at", { ascending: false });

    if (error) throw error;

    renderReservas(data || []);
  } catch (error) {
    console.error("Erro ao carregar reservas:", error);
    reservasTableBody.innerHTML = `
      <tr>
        <td colspan="3">Não foi possível carregar as reservas.</td>
      </tr>
    `;
  }
}

function renderConfirmacoes(confirmacoes) {
  if (!confirmacoes.length) {
    confirmacoesTableBody.innerHTML = `
      <tr>
        <td colspan="6">Nenhuma confirmação encontrada.</td>
      </tr>
    `;
    return;
  }

  confirmacoesTableBody.innerHTML = confirmacoes
    .map((item) => {
      const confirmou = item.presenca === "Sim, estarei presente";

      return `
        <tr>
          <td>${escapeHtml(item.nome || "")}</td>
          <td>${escapeHtml(item.telefone || "-")}</td>
          <td>${item.acompanhantes ?? 0}</td>
          <td>
            <span class="status-badge ${confirmou ? "status-confirmado" : "status-nao"}">
              ${escapeHtml(item.presenca || "-")}
            </span>
          </td>
          <td>${escapeHtml(item.observacoes || "-")}</td>
          <td>${formatDate(item.created_at)}</td>
        </tr>
      `;
    })
    .join("");
}

function renderPresentes(presentes) {
  if (!presentes.length) {
    presentesTableBody.innerHTML = `
      <tr>
        <td colspan="6">Nenhum presente encontrado.</td>
      </tr>
    `;
    return;
  }

  presentesTableBody.innerHTML = presentes
    .map((item) => {
      const total = Number(item.quantidade_total || 0);
      const reservadas = Number(item.quantidade_reservada || 0);
      const disponiveis = Math.max(total - reservadas, 0);
      const tipo = item.usa_cotas ? "Com cotas" : "Único";

      return `
        <tr>
          <td>${escapeHtml(item.nome || "")}</td>
          <td>${escapeHtml(item.valor || "-")}</td>
          <td>${tipo}</td>
          <td>${total}</td>
          <td>${reservadas}</td>
          <td>${disponiveis}</td>
        </tr>
      `;
    })
    .join("");
}

function renderReservas(reservas) {
  if (!reservas.length) {
    reservasTableBody.innerHTML = `
      <tr>
        <td colspan="3">Nenhuma reserva encontrada.</td>
      </tr>
    `;
    return;
  }

  reservasTableBody.innerHTML = reservas
    .map((item) => {
      const nomePresente = item.presentes?.nome || "-";

      return `
        <tr>
          <td>${escapeHtml(nomePresente)}</td>
          <td>${escapeHtml(item.reservado_por || "-")}</td>
          <td>${formatDate(item.created_at)}</td>
        </tr>
      `;
    })
    .join("");
}

function updateConfirmacoesStats(confirmacoes) {
  const confirmados = confirmacoes.filter(
    (item) => item.presenca === "Sim, estarei presente"
  ).length;

  const naoConfirmados = confirmacoes.filter(
    (item) => item.presenca === "Não poderei comparecer"
  ).length;

  const acompanhantes = confirmacoes.reduce(
    (acc, item) => acc + Number(item.acompanhantes || 0),
    0
  );

  totalConfirmacoes.textContent = confirmacoes.length;
  totalPresentesSim.textContent = confirmados;
  totalPresentesNao.textContent = naoConfirmados;
  totalAcompanhantes.textContent = acompanhantes;
}

function updatePresentesStats(presentes) {
  const reservados = presentes.reduce(
    (acc, item) => acc + Number(item.quantidade_reservada || 0),
    0
  );

  totalPresentesReservados.textContent = reservados;
}

function formatDate(value) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleString("pt-BR");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

checkSession();