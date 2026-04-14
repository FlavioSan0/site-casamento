const SUPABASE_URL = "https://zmomnbtqxttlgpxdvmzr.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_doB-Z-J7ingNc--jiPHSyQ__0HY95qI";

let supabaseClient = null;

if (!window.supabase) {
  console.error("Supabase JS não foi carregado. Verifique o script CDN no index.html.");
} else {
  try {
    supabaseClient = window.supabase.createClient(
      SUPABASE_URL,
      SUPABASE_PUBLISHABLE_KEY
    );
  } catch (error) {
    console.error("Erro ao criar cliente Supabase:", error);
  }
}

const weddingDate = new Date("2026-08-15T17:30:00");

function updateCountdown() {
  const now = new Date();
  const difference = weddingDate - now;

  const daysEl = document.getElementById("days");
  const hoursEl = document.getElementById("hours");
  const minutesEl = document.getElementById("minutes");
  const secondsEl = document.getElementById("seconds");

  if (!daysEl || !hoursEl || !minutesEl || !secondsEl) return;

  if (difference <= 0) {
    daysEl.textContent = "00";
    hoursEl.textContent = "00";
    minutesEl.textContent = "00";
    secondsEl.textContent = "00";
    return;
  }

  const days = Math.floor(difference / (1000 * 60 * 60 * 24));
  const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((difference / (1000 * 60)) % 60);
  const seconds = Math.floor((difference / 1000) % 60);

  daysEl.textContent = String(days).padStart(2, "0");
  hoursEl.textContent = String(hours).padStart(2, "0");
  minutesEl.textContent = String(minutes).padStart(2, "0");
  secondsEl.textContent = String(seconds).padStart(2, "0");
}

updateCountdown();
setInterval(updateCountdown, 1000);

const acompanhantesInput = document.getElementById("acompanhantes");
const acompanhantesNomesWrapper = document.getElementById("acompanhantesNomesWrapper");
const acompanhantesNomesFields = document.getElementById("acompanhantesNomesFields");

function renderAcompanhantesFields() {
  if (!acompanhantesInput || !acompanhantesNomesWrapper || !acompanhantesNomesFields) return;

  const quantidade = Number(acompanhantesInput.value || 0);

  if (!quantidade || quantidade <= 0) {
    acompanhantesNomesWrapper.classList.add("hidden");
    acompanhantesNomesFields.innerHTML = "";
    return;
  }

  acompanhantesNomesWrapper.classList.remove("hidden");

  acompanhantesNomesFields.innerHTML = Array.from({ length: quantidade }, (_, index) => {
    const number = index + 1;
    return `
      <div class="form-group">
        <label for="acompanhante_nome_${number}">Nome do acompanhante ${number}</label>
        <input
          type="text"
          id="acompanhante_nome_${number}"
          class="acompanhante-nome-input"
          placeholder="Digite o nome completo"
        />
      </div>
    `;
  }).join("");
}

if (acompanhantesInput) {
  acompanhantesInput.addEventListener("input", renderAcompanhantesFields);
  acompanhantesInput.addEventListener("change", renderAcompanhantesFields);
}

const rsvpForm = document.getElementById("rsvpForm");
const formMessage = document.getElementById("formMessage");
const submitRsvpButton = document.getElementById("submitRsvpButton");

if (rsvpForm) {
  rsvpForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    if (!supabaseClient) {
      if (formMessage) {
        formMessage.textContent =
          "Não foi possível conectar ao banco de dados no momento.";
        formMessage.style.color = "#800000";
      }
      return;
    }

    const nome = document.getElementById("nome").value.trim();
    const telefone = document.getElementById("telefone").value.trim();
    const acompanhantesValor = document.getElementById("acompanhantes").value.trim();
    const presenca = document.getElementById("presenca").value;
    const observacoes = document.getElementById("observacoes").value.trim();

    const acompanhantes = acompanhantesValor === "" ? 0 : Number(acompanhantesValor);

    if (!nome || !presenca) {
      if (formMessage) {
        formMessage.textContent = "Preencha os campos obrigatórios para continuar.";
        formMessage.style.color = "#800000";
      }
      return;
    }

    if (Number.isNaN(acompanhantes) || acompanhantes < 0) {
      if (formMessage) {
        formMessage.textContent = "Informe uma quantidade válida de acompanhantes.";
        formMessage.style.color = "#800000";
      }
      return;
    }

    const acompanhantesNomes = Array.from(
      document.querySelectorAll(".acompanhante-nome-input")
    )
      .map((input) => input.value.trim())
      .filter(Boolean);

    if (acompanhantes > 0 && acompanhantesNomes.length !== acompanhantes) {
      if (formMessage) {
        formMessage.textContent =
          "Preencha o nome de todos os acompanhantes para continuar.";
        formMessage.style.color = "#800000";
      }
      return;
    }

    if (submitRsvpButton) {
      submitRsvpButton.disabled = true;
      submitRsvpButton.textContent = "Enviando...";
    }

    if (formMessage) {
      formMessage.textContent = "";
    }

    const payload = {
      nome,
      telefone: telefone || null,
      acompanhantes,
      nomes_acompanhantes: acompanhantesNomes.length ? acompanhantesNomes : null,
      presenca,
      observacoes: observacoes || null,
    };

    try {
      const { error } = await supabaseClient
        .from("confirmacoes")
        .insert([payload]);

      if (error) {
        throw error;
      }

      if (formMessage) {
        formMessage.textContent = "Confirmação enviada com sucesso. Obrigado!";
        formMessage.style.color = "#355b46";
      }

      rsvpForm.reset();
      renderAcompanhantesFields();
    } catch (error) {
      console.error("Erro ao enviar confirmação:", error);

      if (formMessage) {
        formMessage.textContent =
          "Não foi possível enviar sua confirmação agora. Tente novamente em instantes.";
        formMessage.style.color = "#800000";
      }
    } finally {
      if (submitRsvpButton) {
        submitRsvpButton.disabled = false;
        submitRsvpButton.textContent = "Enviar confirmação";
      }
    }
  });
}

const giftGrid = document.getElementById("giftGrid");

async function loadGifts() {
  if (!giftGrid) return;

  if (!supabaseClient) {
    giftGrid.innerHTML = '<p class="gift-empty">Não foi possível carregar os presentes no momento.</p>';
    return;
  }

  giftGrid.innerHTML = '<p class="gift-loading">Carregando presentes...</p>';

  try {
    const { data, error } = await supabaseClient
      .from("presentes")
      .select("*")
      .order("id", { ascending: true });

    if (error) {
      throw error;
    }

    if (!data || data.length === 0) {
      giftGrid.innerHTML = '<p class="gift-empty">Nenhum presente cadastrado no momento.</p>';
      return;
    }

    giftGrid.innerHTML = data.map(createGiftCard).join("");
    bindGiftButtons();
  } catch (error) {
    console.error("Erro ao carregar presentes:", error);
    giftGrid.innerHTML = '<p class="gift-empty">Não foi possível carregar os presentes agora.</p>';
  }
}

function createGiftCard(gift) {
  const usaCotas = !!gift.usa_cotas;
  const quantidadeTotal = Number(gift.quantidade_total || 0);
  const quantidadeReservada = Number(gift.quantidade_reservada || 0);
  const quantidadeDisponivel = Math.max(quantidadeTotal - quantidadeReservada, 0);
  const esgotado = usaCotas ? quantidadeDisponivel <= 0 : gift.status === "reservado";

  return `
    <div class="gift-card" data-gift-id="${gift.id}" data-uses-cotas="${usaCotas}">
      ${
        gift.imagem_url
          ? `
            <div class="gift-image-wrapper">
              <img
                src="${escapeHtml(gift.imagem_url)}"
                alt="${escapeHtml(gift.nome || "Presente")}"
                class="gift-image"
              />
            </div>
          `
          : ""
      }

      <div class="gift-top">
        <div>
          <h4>${escapeHtml(gift.nome)}</h4>
          <p>${escapeHtml(gift.valor || "")}</p>
        </div>
        <span class="gift-status ${esgotado ? "reserved" : "available"}">
          ${esgotado ? "Esgotado" : "Disponível"}
        </span>
      </div>

      <p class="gift-description">
        ${escapeHtml(
          gift.descricao ||
            "Um presente especial para nos ajudar a montar nossa nova casa com amor e carinho."
        )}
      </p>

      ${
        usaCotas
          ? `
            <p class="gift-description">
              <strong>Cotas disponíveis:</strong> ${quantidadeDisponivel} de ${quantidadeTotal}
            </p>
          `
          : ""
      }

      ${
        esgotado
          ? `
            <button class="btn btn-disabled full-button" disabled>Indisponível</button>
          `
          : `
            <div class="gift-reserver">
              <input
                type="text"
                placeholder="Seu nome para reservar"
                class="gift-name-input"
              />
              <button class="btn btn-primary reserve-gift-btn" data-id="${gift.id}" type="button">
                ${usaCotas ? "Reservar 1 cota" : "Reservar presente"}
              </button>
            </div>
            <p class="gift-feedback" id="gift-feedback-${gift.id}"></p>
          `
      }
    </div>
  `;
}

function bindGiftButtons() {
  const reserveButtons = document.querySelectorAll(".reserve-gift-btn");

  reserveButtons.forEach((button) => {
    button.addEventListener("click", async function () {
      const giftId = Number(button.dataset.id);
      const card = button.closest(".gift-card");
      const input = card?.querySelector(".gift-name-input");
      const feedback = document.getElementById(`gift-feedback-${giftId}`);
      const usaCotas = card?.dataset?.usesCotas === "true";

      const reservadoPor = input?.value.trim() || "";

      if (!reservadoPor) {
        if (feedback) {
          feedback.textContent = "Informe seu nome para reservar o presente.";
          feedback.classList.add("error");
        }
        return;
      }

      button.disabled = true;
      button.textContent = "Reservando...";

      if (feedback) {
        feedback.textContent = "";
        feedback.classList.remove("error");
      }

      try {
        const { error } = await supabaseClient.rpc("reservar_presente", {
          p_presente_id: giftId,
          p_reservado_por: reservadoPor,
        });

        if (error) {
          throw error;
        }

        await loadGifts();
      } catch (error) {
        console.error("Erro ao reservar presente:", error);

        if (feedback) {
          feedback.textContent =
            error?.message || "Não foi possível reservar agora. Tente novamente.";
          feedback.classList.add("error");
        }

        button.disabled = false;
        button.textContent = usaCotas ? "Reservar 1 cota" : "Reservar presente";
      }
    });
  });
}

loadGifts();

const copyPixButton = document.getElementById("copyPixButton");
const pixKey = document.getElementById("pixKey");
const pixFeedback = document.getElementById("pixFeedback");

if (copyPixButton && pixKey) {
  copyPixButton.addEventListener("click", async function () {
    try {
      await navigator.clipboard.writeText(pixKey.textContent.trim());

      if (pixFeedback) {
        pixFeedback.textContent = "Chave PIX copiada com sucesso.";
      }
    } catch (error) {
      if (pixFeedback) {
        pixFeedback.textContent =
          "Não foi possível copiar automaticamente. Copie a chave manualmente.";
      }
      console.error("Erro ao copiar chave PIX:", error);
    }
  });
}

const menuToggle = document.getElementById("menuToggle");
const navLinks = document.getElementById("navLinks");

if (menuToggle && navLinks) {
  menuToggle.addEventListener("click", function () {
    navLinks.classList.toggle("active");
    const expanded = navLinks.classList.contains("active");
    menuToggle.setAttribute("aria-expanded", expanded ? "true" : "false");
  });

  navLinks.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", function () {
      navLinks.classList.remove("active");
      menuToggle.setAttribute("aria-expanded", "false");
    });
  });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}