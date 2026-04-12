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

if (rsvpForm) {
  rsvpForm.addEventListener("submit", function (event) {
    event.preventDefault();

    const formData = {
      nome: document.getElementById("nome").value.trim(),
      telefone: document.getElementById("telefone").value.trim(),
      acompanhantes: document.getElementById("acompanhantes").value.trim(),
      presenca: document.getElementById("presenca").value,
      observacoes: document.getElementById("observacoes").value.trim(),
    };

    console.log("Dados do RSVP:", formData);

    if (formMessage) {
      formMessage.textContent =
        "Confirmação registrada localmente. Na próxima etapa vamos enviar isso para o banco de dados.";
    }

    rsvpForm.reset();
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
        pixFeedback.textContent = "Não foi possível copiar automaticamente. Copie a chave manualmente.";
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