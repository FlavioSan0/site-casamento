const SUPABASE_URL = "https://zmomnbtqxttlgpxdvmzr.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_doB-Z-J7ingNc--jiPHSyQ__0HY95qI";

const supabaseClient =
  window.supabase && SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY)
    : null;

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

    if (submitRsvpButton) {
      submitRsvpButton.disabled = true;
      submitRsvpButton.textContent = "Enviando...";
    }

    if (formMessage) {
      formMessage.textContent = "";
    }

    try {
      const { error } = await supabaseClient.from("confirmacoes").insert([
        {
          nome,
          telefone: telefone || null,
          acompanhantes,
          presenca,
          observacoes: observacoes || null,
        },
      ]);

      if (error) {
        throw error;
      }

      if (formMessage) {
        formMessage.textContent = "Confirmação enviada com sucesso. Obrigado!";
        formMessage.style.color = "#355b46";
      }

      rsvpForm.reset();
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