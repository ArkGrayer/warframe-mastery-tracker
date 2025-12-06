const API_URL = "https://api.warframestat.us/items";
const IMAGE_BASE_URL = "https://cdn.warframestat.us/img/";

// === EXCEÇÕES E FILTROS ===
const EXCLUDED_NAMES = [
  "Excalibur Prime",
  "Skana Prime",
  "Lato Prime",
  "Railjack",
  "Plexus",
  "Venari",
  "Venari Prime",
];

const CATEGORY_MAP = {
  Warframes: "Warframes",
  Primary: "Primary",
  Secondary: "Secondary",
  Melee: "Melee",
  Archwing: "Archwing",
  "Arch-Gun": "Archwing",
  "Arch-Melee": "Archwing",
  Necramech: "Archwing",
  "K-Drive": "Archwing",
  Sentinels: "Sentinels",
  SentinelWeapons: "Sentinels",
  MOA: "Sentinels",
  Hound: "Sentinels",
  Pets: "Pets",
  Amps: "Amps",
};

const SUB_CATEGORIES = {
  Archwing: [
    { id: "all", label: "Todos" },
    { id: "Archwing", label: "Asas" },
    { id: "Necramech", label: "Necramechs" },
    { id: "K-Drive", label: "K-Drive" },
    { id: "Arch-Gun", label: "Arch-Gun" },
    { id: "Arch-Melee", label: "Arch-Melee" },
  ],
  Sentinels: [
    { id: "all", label: "Todos" },
    { id: "Sentinels", label: "Sentinelas" },
    { id: "MOA", label: "MOAs" },
    { id: "Hound", label: "Hounds" },
    { id: "SentinelWeapons", label: "Armas de Robô" },
  ],
  Pets: [
    { id: "all", label: "Todos" },
    { id: "Kubrow", label: "Kubrows" },
    { id: "Kavat", label: "Kavats" },
    { id: "Vulpaphyla", label: "Vulpaphylas" },
    { id: "Predasite", label: "Predasites" },
  ],
  Amps: [
    { id: "all", label: "Todos" },
    { id: "Prism", label: "Prismas" },
    { id: "Amp", label: "Amps Únicas" },
  ],
};

// Estado Global
let allItems = [];
let allGlyphs = [];
let userProfile = {
  nickname: "Tenno",
  glyph: "https://cdn.warframestat.us/img/0.png",
  acquired: [],
  mastered: [],
};
let currentCategory = "Warframes";
let currentSubFilter = "all";

document.addEventListener("DOMContentLoaded", () => {
  loadUserProfile();
  fetchItemsAndGlyphs();
  setupEventListeners();
  setupModalLogic();
  setupSaveSystem();

  if (userProfile.nickname !== "Tenno") {
    updateProfileUI();
  }
});

// === 1. FETCH ===
async function fetchItemsAndGlyphs() {
  const container = document.getElementById("items-container");
  try {
    const response = await fetch(API_URL);
    const data = await response.json();

    allItems = data.filter((item) => {
      if (item.category === "Glyphs") {
        allGlyphs.push(item);
        return false;
      }
      if (!item.masterable) return false;
      if (EXCLUDED_NAMES.includes(item.name)) return false;
      if (item.productCategory === "CrewSuits") return false;
      normalizeItemData(item);
      if (!CATEGORY_MAP[item.category]) return false;
      return true;
    });

    allItems.sort((a, b) => a.name.localeCompare(b.name));
    allGlyphs.sort((a, b) => a.name.localeCompare(b.name));

    renderItems("Warframes");
    updateMasteryDisplay();
    populateGlyphSelection();
  } catch (error) {
    container.innerHTML = `<p style="color:red">Erro crítico: ${error.message}</p>`;
  }
}

function normalizeItemData(item) {
  if (item.productCategory === "MechSuits") item.category = "Necramech";
  else if (item.productCategory === "SentinelWeapons")
    item.category = "SentinelWeapons";
  else if (item.name.includes("Moa") && !item.name.includes("Prisma"))
    item.category = "MOA";
  else if (item.name.includes("Hound")) item.category = "Hound";
  else if (item.category === "Pets") {
    if (item.name.includes("Kubrow")) item.subType = "Kubrow";
    else if (item.name.includes("Kavat")) item.subType = "Kavat";
    else if (item.name.includes("Vulpaphyla")) item.subType = "Vulpaphyla";
    else if (item.name.includes("Predasite")) item.subType = "Predasite";
  } else if (
    item.category === "Amp" ||
    item.productCategory === "OperatorAmps"
  ) {
    item.category = "Amps";
    if (item.name.includes("Prism")) item.subType = "Prism";
    else item.subType = "Amp";
  }
}

// === 2. RENDERIZAÇÃO ===
function renderItems(category, searchTerm = "") {
  currentCategory = category;
  const container = document.getElementById("items-container");
  container.innerHTML = "";
  const hideMastered = document.getElementById("hide-mastered").checked;
  updateSubTabs(category);

  const itemsToShow = allItems.filter((item) => {
    if (searchTerm.length > 0)
      return item.name.toLowerCase().includes(searchTerm.toLowerCase());
    if (CATEGORY_MAP[item.category] !== category) return false;
    if (currentSubFilter !== "all") {
      if (category === "Pets" || category === "Amps")
        return item.subType === currentSubFilter;
      return item.category === currentSubFilter;
    }
    return true;
  });

  if (itemsToShow.length === 0) {
    container.innerHTML =
      "<p style='grid-column: 1/-1; text-align: center; color: #777;'>Nenhum item encontrado.</p>";
    return;
  }

  itemsToShow.forEach((item) => {
    const isMastered = userProfile.mastered.includes(item.uniqueName);
    if (hideMastered && isMastered) return;
    createItemCard(item, container);
  });
}

function updateSubTabs(category) {
  const subTabsContainer = document.getElementById("sub-tabs");
  subTabsContainer.innerHTML = "";
  if (SUB_CATEGORIES[category]) {
    subTabsContainer.style.display = "flex";
    SUB_CATEGORIES[category].forEach((sub) => {
      const btn = document.createElement("button");
      btn.className = `sub-tab-btn ${
        currentSubFilter === sub.id ? "active" : ""
      }`;
      btn.innerText = sub.label;
      btn.onclick = () => {
        currentSubFilter = sub.id;
        document.getElementById("global-search").value = "";
        renderItems(category);
        document
          .querySelectorAll(".sub-tab-btn")
          .forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
      };
      subTabsContainer.appendChild(btn);
    });
  } else {
    subTabsContainer.style.display = "none";
    currentSubFilter = "all";
  }
}

function createItemCard(item, container) {
  const isAcquired = userProfile.acquired.includes(item.uniqueName);
  const isMastered = userProfile.mastered.includes(item.uniqueName);
  let xpValue = item.totalExperience;
  if (!xpValue) {
    const highTier = [
      "Warframes",
      "Archwing",
      "Necramech",
      "K-Drive",
      "Pets",
      "Sentinels",
      "MOA",
      "Hound",
    ];
    xpValue = highTier.includes(item.category) ? 6000 : 3000;
  }

  const card = document.createElement("div");
  card.className = `item-card ${isMastered ? "mastered" : ""} ${
    isAcquired ? "acquired" : ""
  }`;
  const imageUrl = item.imageName
    ? `${IMAGE_BASE_URL}${item.imageName}`
    : "https://via.placeholder.com/150";

  card.innerHTML = `
        <img src="${imageUrl}" class="item-image" loading="lazy">
        <div class="item-name">${item.name}</div>
        <div class="item-xp">+${xpValue.toLocaleString()} XP</div>
        <div class="checkbox-container">
            <label><input type="checkbox" class="cb-acquired" ${
              isAcquired ? "checked" : ""
            }> Adquirido</label>
            <label><input type="checkbox" class="cb-mastered" ${
              isMastered ? "checked" : ""
            }> Masterizado</label>
        </div>
    `;

  const cbAcquired = card.querySelector(".cb-acquired");
  const cbMastered = card.querySelector(".cb-mastered");

  cbAcquired.addEventListener("change", (e) => {
    toggleItem(item.uniqueName, "acquired", e.target.checked);
    if (e.target.checked) card.classList.add("acquired");
    else card.classList.remove("acquired");
  });

  cbMastered.addEventListener("change", (e) => {
    const checked = e.target.checked;
    toggleItem(item.uniqueName, "mastered", checked);
    if (checked) {
      cbAcquired.checked = true;
      toggleItem(item.uniqueName, "acquired", true);
      card.classList.add("mastered");
      card.classList.add("acquired");
    } else {
      card.classList.remove("mastered");
    }
    updateMasteryDisplay();
  });
  container.appendChild(card);
}

// === 3. MODAL E PERFIL ===
function setupModalLogic() {
  const modal = document.getElementById("profile-modal");

  // Verifica se já existe perfil salvo
  if (
    !localStorage.getItem("wf_user_profile") ||
    userProfile.nickname === "Tenno"
  ) {
    modal.style.display = "flex";
  }

  // Busca de Glifos
  document.getElementById("glyph-search").addEventListener("input", (e) => {
    populateGlyphSelection(e.target.value);
  });

  // BOTÃO 1: CRIAR PERFIL (Salvar Novo)
  document.getElementById("save-profile-btn").addEventListener("click", () => {
    const nickInput = document.getElementById("username-input");
    const nick = nickInput.value.trim();

    if (nick) {
      userProfile.nickname = nick;
      saveUserProfile();
      updateProfileUI();
      modal.style.display = "none";
    } else {
      alert("Por favor, digite um Nickname.");
    }
  });

  // BOTÃO 2: CARREGAR BACKUP (Load Inicial)
  const btnLoadInitial = document.getElementById("load-profile-btn");
  const fileInputInitial = document.getElementById("file-import-initial");

  btnLoadInitial.addEventListener("click", () => {
    fileInputInitial.click();
  });

  fileInputInitial.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const loadedData = JSON.parse(event.target.result);

        // Validação
        if (!loadedData.nickname || !Array.isArray(loadedData.mastered)) {
          throw new Error("Arquivo inválido.");
        }

        // Aplica os dados
        userProfile = loadedData;
        saveUserProfile();
        updateProfileUI();
        updateMasteryDisplay();

        // Renderiza a aba atual para atualizar os checks visuais
        const activeTab =
          document.querySelector(".tab-btn.active").dataset.category;
        renderItems(activeTab);

        alert(
          `Backup carregado com sucesso! Bem-vindo de volta, ${userProfile.nickname}.`
        );
        modal.style.display = "none";
      } catch (err) {
        alert(
          "Erro ao ler o arquivo. Certifique-se de que é um JSON de backup válido."
        );
        console.error(err);
      }
    };
    reader.readAsText(file);
    fileInputInitial.value = ""; // Limpa para permitir re-seleção
  });
}

function populateGlyphSelection(search = "") {
  const grid = document.getElementById("glyph-grid");
  if (!grid) return;
  grid.innerHTML = "";

  let filtered = allGlyphs.filter((g) =>
    g.name.toLowerCase().includes(search.toLowerCase())
  );

  filtered.slice(0, 300).forEach((glyph) => {
    const img = document.createElement("img");
    img.src = `${IMAGE_BASE_URL}${glyph.imageName}`;
    img.className = "glyph-option";
    if (userProfile.glyph === img.src) img.classList.add("selected");

    img.onclick = () => {
      document
        .querySelectorAll(".glyph-option")
        .forEach((i) => i.classList.remove("selected"));
      img.classList.add("selected");
      userProfile.glyph = img.src;
    };
    grid.appendChild(img);
  });
}

function updateProfileUI() {
  document.getElementById("user-nickname-display").innerText =
    userProfile.nickname;
  const userImg = document.getElementById("user-glyph-img");
  if (userImg) userImg.src = userProfile.glyph;
}

// === 4. AUXILIARES ===
function toggleItem(id, type, isActive) {
  if (isActive) {
    if (!userProfile[type].includes(id)) userProfile[type].push(id);
  } else {
    userProfile[type] = userProfile[type].filter((x) => x !== id);
  }
  saveUserProfile();
}

function saveUserProfile() {
  localStorage.setItem("wf_user_profile", JSON.stringify(userProfile));
}

function loadUserProfile() {
  const data = localStorage.getItem("wf_user_profile");
  if (data) userProfile = { ...userProfile, ...JSON.parse(data) };
}

function getMasteryRankInfo(totalXP) {
  let rank = Math.floor(Math.sqrt(totalXP / 2500));
  if (rank > 33) rank = 33; // Trava no limite atual do jogo (LR3/4)

  const xpForNextRank = 2500 * Math.pow(rank + 1, 2);
  const titles = [
    "Iniciado",
    "Novato",
    "Discípulo",
    "Buscador",
    "Caçador",
    "Águia",
    "Tigre",
    "Dragão",
    "Sábio",
    "Mestre",
  ];
  let titleIndex = Math.floor(rank / 3);
  if (titleIndex >= titles.length) titleIndex = titles.length - 1;
  let baseTitle = titles[titleIndex];

  const tier = rank % 3;
  let suffix = tier === 1 ? "Prateado" : tier === 2 ? "Dourado" : "";

  if (rank === 0) baseTitle = "Não Ranqueado";
  if (rank > 30) {
    baseTitle = `Lendário ${rank - 30}`;
    suffix = "";
  }

  return {
    rank: rank,
    title: `${baseTitle} ${suffix}`.trim(),
    nextRankXP: xpForNextRank - totalXP,
    progressPct:
      ((totalXP - 2500 * Math.pow(rank, 2)) /
        (xpForNextRank - 2500 * Math.pow(rank, 2))) *
      100,
  };
}

// === 5. INTELIGÊNCIA DE ÍCONES (NOVO) ===
function getRankImageFile(rank) {
  if (rank === 0) return ""; // Não tem imagem pra Rank 0 ou usa placeholder

  // Do Rank 31 pra cima (Lendários)
  if (rank >= 31) {
    return `Rank${rank}.webp`; // Ex: Rank31.webp
  }

  // Do Rank 1 ao 30
  // Lista de nomes base na ordem correta
  // Indice 0 é vazio pq a conta começa do 1 matematicamente no array
  const baseNames = [
    "", // Padding
    "Initiate", // 1-3
    "Novice", // 4-6
    "Disciple", // 7-9
    "Seeker", // 10-12
    "Hunter", // 13-15
    "Eagle", // 16-18
    "Tiger", // 19-21
    "Dragon", // 22-24
    "Sage", // 25-27
    "Master", // 28-30
  ];

  const groupIndex = Math.ceil(rank / 3);
  const baseName = baseNames[groupIndex];

  const tier = rank % 3;
  let prefix = "";

  // tier 1 = Bronze (Sem prefixo) -> ex: "Initiate.webp"
  // tier 2 = Prata -> ex: "SilverInitiate.webp"
  // tier 0 = Ouro -> ex: "GoldInitiate.webp"

  if (tier === 2) prefix = "Silver";
  if (tier === 0) prefix = "Gold";

  return `${prefix}${baseName}.webp`;
}

function updateMasteryDisplay() {
  let totalXp = 0;
  userProfile.mastered.forEach((id) => {
    const item = allItems.find((i) => i.uniqueName === id);
    if (item) {
      let xp = item.totalExperience;
      if (!xp) {
        const highTier = [
          "Warframes",
          "Archwing",
          "Necramech",
          "K-Drive",
          "Pets",
          "Sentinels",
          "MOA",
          "Hound",
        ];
        xp = highTier.includes(item.category) ? 6000 : 3000;
      }
      totalXp += xp;
    }
  });

  const info = getMasteryRankInfo(totalXp);

  document.getElementById("mr-number").innerText = info.rank;
  document.getElementById("mr-title").innerText = info.title.toUpperCase();
  document.getElementById("current-xp").innerText =
    totalXp.toLocaleString("pt-BR");
  document.getElementById("mastery-progress-bar").style.width = `${Math.max(
    0,
    info.progressPct
  )}%`;

  const nextRank = getMasteryRankInfo(2500 * Math.pow(info.rank + 1, 2));
  document.getElementById(
    "next-rank-info"
  ).innerText = `PRÓXIMO: ${nextRank.title.toUpperCase()} EM ${info.nextRankXP.toLocaleString(
    "pt-BR"
  )}`;

  // === IMAGEM LOCAL DO RANK ===
  const iconImg = document.getElementById("mr-icon");
  const fileName = getRankImageFile(info.rank);

  if (fileName) {
    iconImg.src = `img/ranks/${fileName}`; // Caminho da pasta local
    iconImg.style.display = "block";
  } else {
    iconImg.style.display = "none"; // Esconde se for rank 0
  }
}

function setupEventListeners() {
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document
        .querySelectorAll(".tab-btn")
        .forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      currentSubFilter = "all";
      document.getElementById("global-search").value = "";
      renderItems(btn.dataset.category);
    });
  });

  document.getElementById("global-search").addEventListener("input", (e) => {
    renderItems(currentCategory, e.target.value);
  });

  document.getElementById("hide-mastered").addEventListener("change", () => {
    renderItems(
      currentCategory,
      document.getElementById("global-search").value
    );
  });
}

// === SISTEMA DE SAVE/LOAD (JSON) ===
function setupSaveSystem() {
  const fab = document.getElementById("save-fab");
  const modal = document.getElementById("save-modal");
  const btnExport = document.getElementById("btn-export");
  const btnImportTrigger = document.getElementById("btn-import-trigger");
  const fileInput = document.getElementById("file-import");
  const btnClose = document.getElementById("close-save-modal");

  // Abrir Modal
  fab.addEventListener("click", () => {
    modal.style.display = "flex";
  });

  // Fechar Modal
  btnClose.addEventListener("click", () => {
    modal.style.display = "none";
  });

  // Fechar clicando fora
  window.addEventListener("click", (e) => {
    if (e.target === modal) modal.style.display = "none";
  });

  // 1. EXPORTAR (Salvar Backup)
  btnExport.addEventListener("click", () => {
    const dataStr = JSON.stringify(userProfile, null, 2); // Formata bonitinho
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    // Nome do arquivo: WarframeTracker_NomeDoUsuario_Data.json
    const date = new Date().toISOString().split("T")[0];
    a.download = `WF_Tracker_${userProfile.nickname}_${date}.json`;
    a.click();

    URL.revokeObjectURL(url);
    alert("Backup baixado com sucesso! Guarde este arquivo.");
    modal.style.display = "none";
  });

  // 2. IMPORTAR
  btnImportTrigger.addEventListener("click", () => {
    fileInput.click();
  });

  // 3. IMPORTAR
  fileInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const loadedData = JSON.parse(event.target.result);

        // Validação básica para ver se é um save do nosso site
        if (!loadedData.nickname || !Array.isArray(loadedData.mastered)) {
          throw new Error("Formato de arquivo inválido.");
        }

        // Atualiza o perfil
        userProfile = loadedData;
        saveUserProfile(); // Salva no LocalStorage

        // Atualiza a tela
        updateProfileUI();
        updateMasteryDisplay();

        // Recarrega a lista de itens para mostrar os checks corretos
        const activeTab =
          document.querySelector(".tab-btn.active").dataset.category;
        renderItems(activeTab);

        alert(
          `Bem-vindo de volta, ${userProfile.nickname}! Progresso carregado.`
        );
        modal.style.display = "none";
      } catch (err) {
        alert(
          "Erro ao carregar arquivo: O formato está incorreto ou corrompido."
        );
        console.error(err);
      }
    };
    reader.readAsText(file);
    // Limpa o input para permitir carregar o mesmo arquivo de novo se errar
    fileInput.value = "";
  });
}
