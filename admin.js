const SUPABASE_URL = "https://zmomnbtqxttlgpxdvmzr.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_doB-Z-J7ingNc--jiPHSyQ__0HY95qI";
const GIFT_BUCKET = "presentes-casamento";

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
const giftCancelEditButton = document.getElementById("giftCancelEditButton");
const giftEditId = document.getElementById("giftEditId");
const giftUsaCotas = document.getElementById("giftUsaCotas");
const giftQuantidadeWrapper = document.getElementById("giftQuantidadeWrapper");
const giftQuantidadeTotal = document.getElementById("giftQuantidadeTotal");
const giftValorInput = document.getElementById("giftValor");
const giftImagemAtual = document.getElementById("giftImagemAtual");
const giftImagemFile = document.getElementById("giftImagemFile");
const giftImagePreviewWrapper = document.getElementById("giftImagePreviewWrapper");
const giftImagePreview = document.getElementById("giftImagePreview");

const giftSearchInput = document.getElementById("giftSearchInput");
const giftFilterSelect = document.getElementById("giftFilterSelect");

const confirmacoesSearchInput = document.getElementById("confirmacoesSearchInput");
const confirmacoesPresencaFilter = document.getElementById("confirmacoesPresencaFilter");
const confirmacoesAcompanhantesFilter = document.getElementById("confirmacoesAcompanhantesFilter");
const exportConfirmacoesButton = document.getElementById("exportConfirmacoesButton");

const confirmacoesTableBody = document.getElementById("confirmacoesTableBody");
const presentesManageTableBody = document.getElementById("presentesManageTableBody");
const reservasTableBody = document.getElementById("reservasTableBody");

const totalConfirmacoes = document.getElementById("totalConfirmacoes");
const totalPresentesSim = document.getElementById("totalPresentesSim");
const totalPessoasConfirmadas = document.getElementById("totalPessoasConfirmadas");
const totalPresentesNao = document.getElementById("totalPresentesNao");
const totalAcompanhantes = document.getElementById("totalAcompanhantes");
const totalPresentesReservados = document.getElementById("totalPresentesReservados");

const confirmacaoModalBackdrop = document.getElementById("confirmacaoModalBackdrop");
const closeConfirmacaoModal = document.getElementById("closeConfirmacaoModal");
const cancelConfirmacaoModal = document.getElementById("cancelConfirmacaoModal");
const editConfirmacaoForm = document.getElementById("editConfirmacaoForm");
const editConfirmacaoId = document.getElementById("editConfirmacaoId");
const editConfirmacaoNome = document.getElementById("editConfirmacaoNome");
const editConfirmacaoTelefone = document.getElementById("editConfirmacaoTelefone");
const editConfirmacaoAcompanhantes = document.getElementById("editConfirmacaoAcompanhantes");
const editConfirmacaoPresenca = document.getElementById("editConfirmacaoPresenca");
const editConfirmacaoObservacoes = document.getElementById("editConfirmacaoObservacoes");
const editAcompanhantesWrapper = document.getElementById("editAcompanhantesWrapper");
const editAcompanhantesFields = document.getElementById("editAcompanhantesFields");
const editConfirmacaoMessage = document.getElementById("editConfirmacaoMessage");
const saveConfirmacaoButton = document.getElementById("saveConfirmacaoButton");

const deleteModalBackdrop = document.getElementById("deleteModalBackdrop");
const deleteModalTag = document.getElementById("deleteModalTag");
const deleteModalTitle = document.getElementById("deleteModalTitle");
const deleteModalText = document.getElementById("deleteModalText");
const cancelDeleteButton = document.getElementById("cancelDeleteButton");
const confirmDeleteButton = document.getElementById("confirmDeleteButton");

let currentGifts = [];
let currentConfirmacoes = [];
let currentReservas = [];
let deleteAction = null;

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

function formatGiftValue(value) {
  if (!value) return "";

  const trimmed = value.trim();

  if (!trimmed) return "";

  if (/^r\$/i.test(trimmed)) {
    return trimmed.replace(/^r\$\s*/i, "R$ ");
  }

  if (/^\d+(,\d{1,2})?$/.test(trimmed) || /^\d+(\.\d{1,2})?$/.test(trimmed)) {
    return `R$ ${trimmed.replace(".", ",")}`;
  }

  return trimmed;
}

function normalizeGiftValueForSave(value) {
  if (!value) return null;
  const formatted = formatGiftValue(value);
  return formatted || null;
}

function previewGiftImageFromUrl(url) {
  if (!url) {
    giftImagePreviewWrapper.classList.add("hidden");
    giftImagePreview.removeAttribute("src");
    return;
  }

  giftImagePreviewWrapper.classList.remove("hidden");
  giftImagePreview.src = url;
}

function previewGiftImageFromFile(file) {
  if (!file) {
    if (giftImagemAtual.value) {
      previewGiftImageFromUrl(giftImagemAtual.value);
    } else {
      previewGiftImageFromUrl("");
    }
    return;
  }

  const tempUrl = URL.createObjectURL(file);
  previewGiftImageFromUrl(tempUrl);
}

function loadImageElement(file) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(img);
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Não foi possível ler a imagem enviada."));
    };

    img.src = objectUrl;
  });
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Não foi possível processar a imagem."));
        return;
      }
      resolve(blob);
    }, type, quality);
  });
}

async function compressGiftImage(file) {
  const image = await loadImageElement(file);

  const maxWidth = 1400;
  const maxHeight = 1400;

  let { width, height } = image;

  const scale = Math.min(maxWidth / width, maxHeight / height, 1);
  const targetWidth = Math.round(width * scale);
  const targetHeight = Math.round(height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Não foi possível preparar a compressão da imagem.");
  }

  ctx.drawImage(image, 0, 0, targetWidth, targetHeight);

  const blob = await canvasToBlob(canvas, "image/jpeg", 0.82);

  const originalBaseName = (file.name || "imagem")
    .replace(/\.[^.]+$/, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9-]/g, "-")
    .toLowerCase();

  const safeBaseName = originalBaseName || "imagem";

  return new File([blob], `${safeBaseName}.jpg`, { type: "image/jpeg" });
}

async function uploadGiftImage(file) {
  const compressedFile = await compressGiftImage(file);

  const safeName = compressedFile.name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9.-]/g, "-")
    .toLowerCase();

  const filePath = `${Date.now()}-${safeName}`;

  const { error: uploadError } = await supabaseClient.storage
    .from(GIFT_BUCKET)
    .upload(filePath, compressedFile, {
      cacheControl: "3600",
      upsert: false,
      contentType: "image/jpeg",
    });

  if (uploadError) throw uploadError;

  const { data } = supabaseClient.storage.from(GIFT_BUCKET).getPublicUrl(filePath);
  return data.publicUrl;
}

function resetGiftForm() {
  giftForm.reset();
  giftEditId.value = "";
  giftImagemAtual.value = "";
  giftSubmitButton.textContent = "Cadastrar presente";
  giftCancelEditButton.classList.add("hidden");
  giftFormMessage.textContent = "";
  updateGiftQuantityVisibility();
  previewGiftImageFromUrl("");
}

function fillGiftFormForEdit(gift) {
  document.getElementById("giftNome").value = gift.nome || "";
  document.getElementById("giftValor").value = gift.valor || "";
  document.getElementById("giftDescricao").value = gift.descricao || "";
  giftImagemAtual.value = gift.imagem_url || "";
  giftUsaCotas.checked = !!gift.usa_cotas;
  giftQuantidadeTotal.value = gift.quantidade_total || 1;
  giftEditId.value = gift.id;
  giftSubmitButton.textContent = "Salvar alterações";
  giftCancelEditButton.classList.remove("hidden");
  updateGiftQuantityVisibility();
  previewGiftImageFromUrl(gift.imagem_url || "");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function getAcompanhantesNames(item) {
  if (!item?.nomes_acompanhantes) return [];
  if (Array.isArray(item.nomes_acompanhantes)) return item.nomes_acompanhantes.filter(Boolean);
  return [];
}

function formatAcompanhantesNames(item) {
  const names = getAcompanhantesNames(item);
  if (!names.length) return "-";
  return names.join(", ");
}

function renderEditAcompanhantesFields(names = [], quantidade = 0) {
  if (!editAcompanhantesWrapper || !editAcompanhantesFields) return;

  const total = Number(quantidade || 0);

  if (!total || total <= 0) {
    editAcompanhantesWrapper.classList.add("hidden");
    editAcompanhantesFields.innerHTML = "";
    return;
  }

  editAcompanhantesWrapper.classList.remove("hidden");

  editAcompanhantesFields.innerHTML = Array.from({ length: total }, (_, index) => {
    const number = index + 1;
    const value = names[index] || "";

    return `
      <div class="form-group">
        <label for="edit_acompanhante_nome_${number}">Nome do acompanhante ${number}</label>
        <input
          type="text"
          id="edit_acompanhante_nome_${number}"
          class="edit-acompanhante-nome-input"
          value="${escapeHtml(value)}"
          placeholder="Digite o nome completo"
        />
      </div>
    `;
  }).join("");
}

function openConfirmacaoModal(item) {
  if (!confirmacaoModalBackdrop) return;

  const names = getAcompanhantesNames(item);

  editConfirmacaoId.value = item.id;
  editConfirmacaoNome.value = item.nome || "";
  editConfirmacaoTelefone.value = item.telefone || "";
  editConfirmacaoAcompanhantes.value = Number(item.acompanhantes || 0);
  editConfirmacaoPresenca.value = item.presenca || "";
  editConfirmacaoObservacoes.value = item.observacoes || "";
  editConfirmacaoMessage.textContent = "";

  renderEditAcompanhantesFields(names, Number(item.acompanhantes || 0));
  confirmacaoModalBackdrop.classList.remove("hidden");
}

function closeEditModal() {
  if (!confirmacaoModalBackdrop) return;
  confirmacaoModalBackdrop.classList.add("hidden");
  editConfirmacaoForm.reset();
  editConfirmacaoMessage.textContent = "";
  renderEditAcompanhantesFields([], 0);
}

function openDeleteModal(config) {
  deleteAction = config;
  deleteModalTag.textContent = config.tag || "Excluir item";
  deleteModalTitle.textContent = config.title || "Tem certeza que deseja excluir?";
  deleteModalText.textContent =
    config.text || "Essa ação removerá o item selecionado permanentemente.";
  deleteModalBackdrop.classList.remove("hidden");
}

function closeDeleteModal() {
  deleteModalBackdrop.classList.add("hidden");
  deleteAction = null;
  confirmDeleteButton.disabled = false;
  confirmDeleteButton.textContent = "Sim, excluir";
}

function applyConfirmacoesFilters() {
  const searchTerm = (confirmacoesSearchInput?.value || "").trim().toLowerCase();
  const presencaValue = confirmacoesPresencaFilter?.value || "todos";
  const acompanhantesValue = confirmacoesAcompanhantesFilter?.value || "todos";

  let filtered = [...currentConfirmacoes];

  if (searchTerm) {
    filtered = filtered.filter((item) => {
      const baseText = [
        item.nome || "",
        item.telefone || "",
        formatAcompanhantesNames(item)
      ].join(" ").toLowerCase();

      return baseText.includes(searchTerm);
    });
  }

  filtered = filtered.filter((item) => {
    const confirmou = item.presenca === "Sim, estarei presente";
    const qtdAcompanhantes = Number(item.acompanhantes || 0);

    if (presencaValue === "confirmados" && !confirmou) return false;
    if (presencaValue === "nao_confirmados" && confirmou) return false;

    if (acompanhantesValue === "com_acompanhantes" && qtdAcompanhantes <= 0) return false;
    if (acompanhantesValue === "sem_acompanhantes" && qtdAcompanhantes > 0) return false;

    return true;
  });

  renderConfirmacoes(filtered);
  return filtered;
}

function exportConfirmacoesCsv() {
  const filtered = applyConfirmacoesFilters();

  if (!filtered.length) return;

  const headers = [
    "Nome",
    "Telefone",
    "Acompanhantes",
    "Nomes dos acompanhantes",
    "Presença",
    "Observações",
    "Data"
  ];

  const rows = filtered.map((item) => [
    item.nome || "",
    item.telefone || "",
    Number(item.acompanhantes || 0),
    formatAcompanhantesNames(item),
    item.presenca || "",
    item.observacoes || "",
    formatDate(item.created_at)
  ]);

  const csvContent = [headers, ...rows]
    .map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(";"))
    .join("\n");

  const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = "confirmacoes-casamento.csv";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

if (giftValorInput) {
  giftValorInput.addEventListener("blur", () => {
    giftValorInput.value = formatGiftValue(giftValorInput.value);
  });
}

if (giftImagemFile) {
  giftImagemFile.addEventListener("change", (event) => {
    const file = event.target.files?.[0];
    previewGiftImageFromFile(file || null);
  });
}

if (giftUsaCotas) {
  giftUsaCotas.addEventListener("change", updateGiftQuantityVisibility);
  updateGiftQuantityVisibility();
}

if (giftCancelEditButton) {
  giftCancelEditButton.addEventListener("click", resetGiftForm);
}

if (giftSearchInput) {
  giftSearchInput.addEventListener("input", applyGiftFilters);
}

if (giftFilterSelect) {
  giftFilterSelect.addEventListener("change", applyGiftFilters);
}

if (confirmacoesSearchInput) {
  confirmacoesSearchInput.addEventListener("input", applyConfirmacoesFilters);
}

if (confirmacoesPresencaFilter) {
  confirmacoesPresencaFilter.addEventListener("change", applyConfirmacoesFilters);
}

if (confirmacoesAcompanhantesFilter) {
  confirmacoesAcompanhantesFilter.addEventListener("change", applyConfirmacoesFilters);
}

if (exportConfirmacoesButton) {
  exportConfirmacoesButton.addEventListener("click", exportConfirmacoesCsv);
}

if (editConfirmacaoAcompanhantes) {
  editConfirmacaoAcompanhantes.addEventListener("input", () => {
    const total = Number(editConfirmacaoAcompanhantes.value || 0);
    const currentNames = Array.from(document.querySelectorAll(".edit-acompanhante-nome-input"))
      .map((input) => input.value.trim());
    renderEditAcompanhantesFields(currentNames, total);
  });
}

if (closeConfirmacaoModal) {
  closeConfirmacaoModal.addEventListener("click", closeEditModal);
}

if (cancelConfirmacaoModal) {
  cancelConfirmacaoModal.addEventListener("click", closeEditModal);
}

if (confirmacaoModalBackdrop) {
  confirmacaoModalBackdrop.addEventListener("click", (event) => {
    if (event.target === confirmacaoModalBackdrop) closeEditModal();
  });
}

if (cancelDeleteButton) {
  cancelDeleteButton.addEventListener("click", closeDeleteModal);
}

if (confirmDeleteButton) {
  confirmDeleteButton.addEventListener("click", async () => {
    if (!deleteAction) return;

    confirmDeleteButton.disabled = true;
    confirmDeleteButton.textContent = "Excluindo...";

    try {
      await deleteAction.onConfirm();
      closeDeleteModal();
    } catch (error) {
      console.error("Erro na exclusão:", error);
      alert(error?.message || "Não foi possível concluir a exclusão.");
      confirmDeleteButton.disabled = false;
      confirmDeleteButton.textContent = "Sim, excluir";
    }
  });
}

if (deleteModalBackdrop) {
  deleteModalBackdrop.addEventListener("click", (event) => {
    if (event.target === deleteModalBackdrop) {
      closeDeleteModal();
    }
  });
}

if (editConfirmacaoForm) {
  editConfirmacaoForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const id = Number(editConfirmacaoId.value);
    const nome = editConfirmacaoNome.value.trim();
    const telefone = editConfirmacaoTelefone.value.trim();
    const acompanhantes = Number(editConfirmacaoAcompanhantes.value || 0);
    const presenca = editConfirmacaoPresenca.value;
    const observacoes = editConfirmacaoObservacoes.value.trim();

    if (!id) {
      editConfirmacaoMessage.textContent = "ID da confirmação não encontrado.";
      editConfirmacaoMessage.style.color = "#800000";
      return;
    }

    if (!nome || !presenca) {
      editConfirmacaoMessage.textContent = "Preencha os campos obrigatórios.";
      editConfirmacaoMessage.style.color = "#800000";
      return;
    }

    if (Number.isNaN(acompanhantes) || acompanhantes < 0) {
      editConfirmacaoMessage.textContent = "Informe uma quantidade válida de acompanhantes.";
      editConfirmacaoMessage.style.color = "#800000";
      return;
    }

    const acompanhantesNames = Array.from(document.querySelectorAll(".edit-acompanhante-nome-input"))
      .map((input) => input.value.trim())
      .filter(Boolean);

    if (acompanhantes > 0 && acompanhantesNames.length !== acompanhantes) {
      editConfirmacaoMessage.textContent =
        "Preencha o nome de todos os acompanhantes para continuar.";
      editConfirmacaoMessage.style.color = "#800000";
      return;
    }

    saveConfirmacaoButton.disabled = true;
    saveConfirmacaoButton.textContent = "Salvando...";
    editConfirmacaoMessage.textContent = "";

    try {
      const payload = {
        nome,
        telefone: telefone || null,
        acompanhantes,
        nomes_acompanhantes: acompanhantesNames.length ? acompanhantesNames : null,
        presenca,
        observacoes: observacoes || null,
      };

      const { data, error } = await supabaseClient
        .from("confirmacoes")
        .update(payload)
        .eq("id", id)
        .select();

      if (error) throw error;

      if (!data || data.length === 0) {
        throw new Error("Nenhum registro foi atualizado. Verifique a policy da tabela confirmacoes.");
      }

      editConfirmacaoMessage.textContent = "Confirmação atualizada com sucesso.";
      editConfirmacaoMessage.style.color = "#355b46";

      await loadConfirmacoes();

      setTimeout(() => {
        closeEditModal();
      }, 500);
    } catch (error) {
      console.error("Erro ao atualizar confirmação:", error);
      editConfirmacaoMessage.textContent =
        error?.message || "Não foi possível atualizar a confirmação.";
      editConfirmacaoMessage.style.color = "#800000";
    } finally {
      saveConfirmacaoButton.disabled = false;
      saveConfirmacaoButton.textContent = "Salvar alterações";
    }
  });
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

    const editId = giftEditId.value ? Number(giftEditId.value) : null;
    const nome = document.getElementById("giftNome").value.trim();
    const valor = normalizeGiftValueForSave(document.getElementById("giftValor").value);
    const descricao = document.getElementById("giftDescricao").value.trim();
    const usaCotas = !!giftUsaCotas.checked;
    const quantidadeTotal = usaCotas ? Number(giftQuantidadeTotal.value) : 1;
    const selectedFile = giftImagemFile?.files?.[0] || null;

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

    if (
      selectedFile &&
      !["image/png", "image/jpeg", "image/jpg", "image/webp"].includes(selectedFile.type)
    ) {
      giftFormMessage.textContent = "Envie uma imagem PNG, JPG, JPEG ou WEBP.";
      giftFormMessage.style.color = "#800000";
      return;
    }

    const existingGift = currentGifts.find((item) => Number(item.id) === Number(editId));
    const quantidadeReservadaAtual = Number(existingGift?.quantidade_reservada || 0);

    if (editId) {
      if (!usaCotas && quantidadeReservadaAtual > 1) {
        giftFormMessage.textContent =
          "Este presente já possui mais de uma reserva. Mantenha-o como presente com cotas.";
        giftFormMessage.style.color = "#800000";
        return;
      }

      if (usaCotas && quantidadeTotal < quantidadeReservadaAtual) {
        giftFormMessage.textContent =
          "A quantidade total não pode ser menor do que a quantidade já reservada.";
        giftFormMessage.style.color = "#800000";
        return;
      }
    }

    giftSubmitButton.disabled = true;
    giftSubmitButton.textContent = editId ? "Salvando..." : "Cadastrando...";
    giftFormMessage.textContent = "";

    try {
      let imagemUrl = giftImagemAtual.value || null;

      if (selectedFile) {
        giftFormMessage.textContent = "Processando e enviando imagem...";
        giftFormMessage.style.color = "#08265e";
        imagemUrl = await uploadGiftImage(selectedFile);
      }

      if (editId) {
        const quantidadeReservada = usaCotas
          ? quantidadeReservadaAtual
          : quantidadeReservadaAtual > 0
            ? 1
            : 0;

        const status = quantidadeReservada >= quantidadeTotal ? "reservado" : "disponivel";

        const { error } = await supabaseClient
          .from("presentes")
          .update({
            nome,
            valor,
            descricao: descricao || null,
            imagem_url: imagemUrl,
            usa_cotas: usaCotas,
            quantidade_total: quantidadeTotal,
            quantidade_reservada: quantidadeReservada,
            status,
          })
          .eq("id", editId);

        if (error) throw error;

        giftFormMessage.textContent = "Presente atualizado com sucesso.";
      } else {
        const { error } = await supabaseClient.from("presentes").insert([
          {
            nome,
            valor,
            descricao: descricao || null,
            imagem_url: imagemUrl,
            usa_cotas: usaCotas,
            quantidade_total: quantidadeTotal,
            quantidade_reservada: 0,
            status: "disponivel",
          },
        ]);

        if (error) throw error;

        giftFormMessage.textContent = "Presente cadastrado com sucesso.";
      }

      giftFormMessage.style.color = "#355b46";
      resetGiftForm();
      await loadPresentes();
    } catch (error) {
      console.error("Erro ao salvar presente:", error);
      giftFormMessage.textContent =
        error?.message || "Não foi possível salvar o presente.";
      giftFormMessage.style.color = "#800000";
    } finally {
      giftSubmitButton.disabled = false;
      giftSubmitButton.textContent = giftEditId.value ? "Salvar alterações" : "Cadastrar presente";
      if (!giftEditId.value) {
        giftSubmitButton.textContent = "Cadastrar presente";
      }
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

    currentConfirmacoes = data || [];
    applyConfirmacoesFilters();
    updateConfirmacoesStats(currentConfirmacoes);
  } catch (error) {
    console.error("Erro ao carregar confirmações:", error);
    confirmacoesTableBody.innerHTML = `
      <tr>
        <td colspan="8">Não foi possível carregar as confirmações.</td>
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

    currentGifts = data || [];
    applyGiftFilters();
    updatePresentesStats(currentGifts);
  } catch (error) {
    console.error("Erro ao carregar presentes:", error);
    presentesManageTableBody.innerHTML = `
      <tr>
        <td colspan="8">Não foi possível carregar os presentes.</td>
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
        presente_id,
        reservado_por,
        created_at,
        presentes (
          nome
        )
      `)
      .order("created_at", { ascending: false });

    if (error) throw error;

    currentReservas = data || [];
    renderReservas(currentReservas);
  } catch (error) {
    console.error("Erro ao carregar reservas:", error);
    reservasTableBody.innerHTML = `
      <tr>
        <td colspan="4">Não foi possível carregar as reservas.</td>
      </tr>
    `;
  }
}

function applyGiftFilters() {
  const searchTerm = (giftSearchInput?.value || "").trim().toLowerCase();
  const filterValue = giftFilterSelect?.value || "todos";

  let filtered = [...currentGifts];

  if (searchTerm) {
    filtered = filtered.filter((item) =>
      String(item.nome || "").toLowerCase().includes(searchTerm)
    );
  }

  filtered = filtered.filter((item) => {
    const total = Number(item.quantidade_total || 0);
    const reservadas = Number(item.quantidade_reservada || 0);
    const disponiveis = Math.max(total - reservadas, 0);
    const reservado = item.usa_cotas ? disponiveis <= 0 : item.status === "reservado";
    const disponivel = !reservado;

    switch (filterValue) {
      case "com_cotas":
        return !!item.usa_cotas;
      case "unico":
        return !item.usa_cotas;
      case "disponivel":
        return disponivel;
      case "reservado":
        return reservado;
      default:
        return true;
    }
  });

  renderPresentes(filtered);
}

function renderConfirmacoes(confirmacoes) {
  if (!confirmacoes.length) {
    confirmacoesTableBody.innerHTML = `
      <tr>
        <td colspan="8">Nenhuma confirmação encontrada.</td>
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
          <td>${escapeHtml(formatAcompanhantesNames(item))}</td>
          <td>
            <span class="status-badge ${confirmou ? "status-confirmado" : "status-nao"}">
              ${escapeHtml(item.presenca || "-")}
            </span>
          </td>
          <td>${escapeHtml(item.observacoes || "-")}</td>
          <td>${formatDate(item.created_at)}</td>
          <td>
            <div class="action-button-group">
              <button type="button" class="action-button edit-confirmacao-button" data-id="${item.id}">
                Editar
              </button>
              <button type="button" class="action-button action-button-danger delete-confirmacao-button" data-id="${item.id}">
                Excluir
              </button>
            </div>
          </td>
        </tr>
      `;
    })
    .join("");

  bindConfirmacaoButtons();
}

function bindConfirmacaoButtons() {
  document.querySelectorAll(".edit-confirmacao-button").forEach((button) => {
    button.addEventListener("click", () => {
      const id = Number(button.dataset.id);
      const item = currentConfirmacoes.find((confirmacao) => Number(confirmacao.id) === id);
      if (!item) return;
      openConfirmacaoModal(item);
    });
  });

  document.querySelectorAll(".delete-confirmacao-button").forEach((button) => {
    button.addEventListener("click", () => {
      const id = Number(button.dataset.id);
      const item = currentConfirmacoes.find((confirmacao) => Number(confirmacao.id) === id);
      if (!item) return;

      openDeleteModal({
        tag: "Excluir confirmação",
        title: "Tem certeza que deseja excluir?",
        text: `A confirmação de "${item.nome}" será removida permanentemente.`,
        onConfirm: async () => {
          const { error } = await supabaseClient
            .from("confirmacoes")
            .delete()
            .eq("id", item.id);

          if (error) throw error;
          await loadConfirmacoes();
        }
      });
    });
  });
}

function renderPresentes(presentes) {
  if (!presentes.length) {
    presentesManageTableBody.innerHTML = `
      <tr>
        <td colspan="8">Nenhum presente encontrado para esse filtro.</td>
      </tr>
    `;
    return;
  }

  presentesManageTableBody.innerHTML = presentes
    .map((item) => {
      const total = Number(item.quantidade_total || 0);
      const reservadas = Number(item.quantidade_reservada || 0);
      const disponiveis = Math.max(total - reservadas, 0);
      const tipo = item.usa_cotas ? "Com cotas" : "Único";
      const imagem = item.imagem_url
        ? `<img src="${escapeHtml(item.imagem_url)}" alt="${escapeHtml(item.nome || "Presente")}" class="admin-gift-thumb" />`
        : `<div class="admin-gift-thumb-placeholder">Sem foto</div>`;

      return `
        <tr>
          <td>${imagem}</td>
          <td>${escapeHtml(item.nome || "")}</td>
          <td>${escapeHtml(item.valor || "-")}</td>
          <td>${tipo}</td>
          <td>${total}</td>
          <td>${reservadas}</td>
          <td>${disponiveis}</td>
          <td>
            <div class="action-button-group">
              <button type="button" class="action-button edit-gift-button" data-id="${item.id}">
                Editar
              </button>
              <button type="button" class="action-button action-button-danger delete-gift-button" data-id="${item.id}">
                Excluir
              </button>
            </div>
          </td>
        </tr>
      `;
    })
    .join("");

  bindGiftButtonsAdmin();
}

function bindGiftButtonsAdmin() {
  document.querySelectorAll(".edit-gift-button").forEach((button) => {
    button.addEventListener("click", () => {
      const giftId = Number(button.dataset.id);
      const gift = currentGifts.find((item) => Number(item.id) === giftId);
      if (!gift) return;
      fillGiftFormForEdit(gift);
    });
  });

  document.querySelectorAll(".delete-gift-button").forEach((button) => {
    button.addEventListener("click", () => {
      const giftId = Number(button.dataset.id);
      const gift = currentGifts.find((item) => Number(item.id) === giftId);
      if (!gift) return;

      openDeleteModal({
        tag: "Excluir presente",
        title: "Deseja excluir este presente?",
        text: `O presente "${gift.nome}" será removido do painel e do site principal.`,
        onConfirm: async () => {
          const { error } = await supabaseClient
            .from("presentes")
            .delete()
            .eq("id", gift.id);

          if (error) throw error;

          await loadPresentes();
          await loadReservas();
        }
      });
    });
  });
}

function renderReservas(reservas) {
  if (!reservas.length) {
    reservasTableBody.innerHTML = `
      <tr>
        <td colspan="4">Nenhuma reserva encontrada.</td>
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
          <td>
            <div class="action-button-group">
              <button type="button" class="action-button action-button-danger delete-reserva-button" data-id="${item.id}">
                Excluir
              </button>
            </div>
          </td>
        </tr>
      `;
    })
    .join("");

  bindReservaButtons();
}

function bindReservaButtons() {
  document.querySelectorAll(".delete-reserva-button").forEach((button) => {
    button.addEventListener("click", () => {
      const reservaId = Number(button.dataset.id);
      const reserva = currentReservas.find((item) => Number(item.id) === reservaId);
      if (!reserva) return;

      const nomePresente = reserva.presentes?.nome || "este presente";

      openDeleteModal({
        tag: "Excluir reserva",
        title: "Deseja excluir esta reserva?",
        text: `A reserva feita por "${reserva.reservado_por}" para "${nomePresente}" será removida.`,
        onConfirm: async () => {
          const { error } = await supabaseClient
            .from("reservas_presentes")
            .delete()
            .eq("id", reserva.id);

          if (error) throw error;

          await loadReservas();
          await loadPresentes();
        }
      });
    });
  });
}

function updateConfirmacoesStats(confirmacoes) {
  const confirmados = confirmacoes.filter(
    (item) => item.presenca === "Sim, estarei presente"
  );

  const totalConfirmados = confirmados.length;

  const naoConfirmados = confirmacoes.filter(
    (item) => item.presenca === "Não poderei comparecer"
  ).length;

  const acompanhantes = confirmados.reduce(
    (acc, item) => acc + Number(item.acompanhantes || 0),
    0
  );

  const pessoasConfirmadas = totalConfirmados + acompanhantes;

  totalConfirmacoes.textContent = confirmacoes.length;
  totalPresentesSim.textContent = totalConfirmados;
  totalPessoasConfirmadas.textContent = pessoasConfirmadas;
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