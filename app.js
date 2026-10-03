/* =========================================================
   VANTARA SNOOKER ACADEMY
   SUPABASE + LIVE TABLE MANAGEMENT
========================================================= */

/* =========================================================
   SUPABASE CONFIG
========================================================= */

const SUPABASE_URL =
  "https://crdwfhrbfxfydklpjroo.supabase.co";

/*
  Publishable key only.
  Never put a Supabase secret/service_role key in browser code.
*/

const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_c0HV4psTPpzaEta9W4iJmA_FBsO3tT4";

const db = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);

/* =========================================================
   CONFIG
========================================================= */

const TOTAL_TABLES = 12;

const TABLE_RATES = {
  1: 200,
  2: 180,
  3: 160,
  4: 160,
  5: 100,
  6: 200,
  7: 180,
  8: 160,
  9: 160,
  10: 100,
  11: 70,
  12: 70
};

const GAME_TYPES = [
  "Snooker",
  "Shuffle",
  "Cricket",
  "RD",
  "LS",
  "Pool",
  "Other"
];

const EXTRA_PLAYER_CHARGE = 20;

/* =========================================================
   STATE
========================================================= */

let activeGames = [];
let selectedTable = null;
let selectedGame = "Snooker";
let selectedPayment = "Cash";
let playerList = [""];

/* =========================================================
   DOM
========================================================= */

const floorGrid = document.getElementById("floorGrid");
const availableCount = document.getElementById("availableCount");
const playingCount = document.getElementById("playingCount");
const gamesCount = document.getElementById("gamesCount");
const collection = document.getElementById("collection");
const modalBackdrop = document.getElementById("modalBackdrop");
const modal = document.getElementById("modal");
const toast = document.getElementById("toast");
const historyBtn = document.getElementById("historyBtn");
const connectionStatus = document.getElementById("connectionStatus");
const clock = document.getElementById("clock");

/* =========================================================
   INITIALIZATION
========================================================= */

document.addEventListener("DOMContentLoaded", async () => {
  startClock();
  setupEvents();
  renderTables();
  await loadActiveGames();
  subscribeToRealtime();
});

/* =========================================================
   EVENTS
========================================================= */

function setupEvents() {
  historyBtn.addEventListener("click", openHistoryModal);

  modalBackdrop.addEventListener("click", (event) => {
    if (event.target === modalBackdrop) {
      closeModal();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeModal();
    }
  });
}

/* =========================================================
   CLOCK
========================================================= */

function startClock() {
  function updateClock() {
    const now = new Date();
    clock.textContent = now.toLocaleTimeString("en-IN", {
      hour12: false
    });
  }

  updateClock();
  setInterval(updateClock, 1000);
}

/* =========================================================
   CONNECTION
========================================================= */

function setConnection(online, text) {
  connectionStatus.classList.remove("online", "offline");

  if (online) {
    connectionStatus.classList.add("online");
    connectionStatus.innerHTML =
      "<span></span> " + (text || "Connected");
  } else {
    connectionStatus.classList.add("offline");
    connectionStatus.innerHTML =
      "<span></span> " + (text || "Offline");
  }
}

/* =========================================================
   LOAD ACTIVE GAMES
========================================================= */

async function loadActiveGames() {
  try {
    const { data, error } = await db
      .from("active_games")
      .select("*")
      .order("table_number", { ascending: true });

    if (error) throw error;

    activeGames = data || [];

    setConnection(true, "Connected");
    renderTables();
    updateStats();
  } catch (error) {
    console.error("Active games error:", error);
    setConnection(false, "Database error");
    showToast("Could not load table data");
  }
}

/* =========================================================
   REALTIME
========================================================= */

function subscribeToRealtime() {
  db
    .channel("vantara-active-games")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "active_games"
      },
      async () => {
        await loadActiveGames();
      }
    )
    .subscribe((status) => {
      if (status === "SUBSCRIBED") {
        setConnection(true, "Live");
      }
    });
}

/* =========================================================
   TABLE HELPERS
========================================================= */

function getActiveGame(tableNumber) {
  return activeGames.find(
    game =>
      Number(game.table_number) === Number(tableNumber)
  );
}

function getTableRate(tableNumber) {
  return TABLE_RATES[Number(tableNumber)] || 0;
}

/* =========================================================
   RENDER TABLES
========================================================= */

function renderTables() {
  floorGrid.innerHTML = "";

  for (
    let tableNumber = 1;
    tableNumber <= TOTAL_TABLES;
    tableNumber++
  ) {
    const activeGame = getActiveGame(tableNumber);

    if (activeGame) {
      floorGrid.appendChild(createPlayingTable(activeGame));
    } else {
      floorGrid.appendChild(createAvailableTable(tableNumber));
    }
  }
}

/* =========================================================
   AVAILABLE TABLE
========================================================= */

function createAvailableTable(tableNumber) {
  const card = document.createElement("div");
  card.className = "table-card";

  const rate = getTableRate(tableNumber);

  card.innerHTML = `
    <div class="table-felt">
      <span class="pocket p1"></span>
      <span class="pocket p2"></span>
      <span class="pocket p3"></span>
      <span class="pocket p4"></span>
      <span class="pocket p5"></span>
      <span class="pocket p6"></span>
    </div>

    <div class="table-info">
      <div class="table-header">
        <div class="table-number">Table ${tableNumber}</div>

        <div class="table-status">
          <span class="status-dot"></span>
          Available
        </div>
      </div>

      <div class="table-bottom">
        <div class="available-text">Tap to start</div>
        <div class="price">₹${rate}/hr</div>
      </div>
    </div>
  `;

  card.addEventListener("click", () => {
    openStartGameModal(tableNumber);
  });

  return card;
}

/* =========================================================
   PLAYING TABLE
========================================================= */

function createPlayingTable(game) {
  const card = document.createElement("div");
  card.className = "table-card playing";

  const players = normalizePlayers(game.players);
  const firstPlayer = players[0] || "Player";
  const elapsed = getElapsedTime(game.started_at);
  const gameName = game.game || "Snooker";

  card.innerHTML = `
    <div class="table-felt">
      <span class="pocket p1"></span>
      <span class="pocket p2"></span>
      <span class="pocket p3"></span>
      <span class="pocket p4"></span>
      <span class="pocket p5"></span>
      <span class="pocket p6"></span>
    </div>

    <div class="playing-overlay">
      <div class="table-header">
        <div class="table-number">
          Table ${game.table_number}
        </div>

        <div class="table-status">
          <span class="status-dot"></span>
          Playing
        </div>
      </div>

      <div class="playing-player">
        <div class="player-mini-label">PLAYER</div>
        <div class="player-mini-name">
          ${escapeHTML(firstPlayer)}
        </div>
      </div>

      <div class="playing-meta">
        <div class="game-mini">
          ${escapeHTML(gameName)}
        </div>

        <div
          class="timer"
          data-start="${escapeAttribute(game.started_at)}"
        >
          ${elapsed}
        </div>
      </div>
    </div>
  `;

  card.addEventListener("click", () => {
    openEndGameModal(game);
  });

  return card;
}

/* =========================================================
   TIMER REFRESH
========================================================= */

setInterval(() => {
  document.querySelectorAll(".timer[data-start]").forEach(timer => {
    timer.textContent = getElapsedTime(timer.dataset.start);
  });
}, 1000);

/* =========================================================
   START GAME MODAL
========================================================= */

function openStartGameModal(tableNumber) {
  selectedTable = tableNumber;
  selectedGame = "Snooker";
  selectedPayment = "Cash";
  playerList = ["", ""];

  renderStartModal();
  openModal();
}

/* =========================================================
   RENDER START MODAL
========================================================= */

function renderStartModal() {
  const rate = getTableRate(selectedTable);

  modal.innerHTML = `
    <h2>Start Game</h2>

    <div class="modal-sub">
      Table ${selectedTable} · ₹${rate}/hour
    </div>

    <label class="form-label">Game</label>

    <div class="game-options">
      ${GAME_TYPES.map(
        game => `
          <button
            type="button"
            class="game-option ${
              game === selectedGame ? "selected" : ""
            }"
            data-game="${escapeAttribute(game)}"
          >
            ${escapeHTML(game)}
          </button>
        `
      ).join("")}
    </div>

    <label class="form-label">Players</label>

    <div id="playersContainer">
      ${playerList.map(
        (player, index) => `
          <div class="player-row">
            <input
              class="input player-input"
              type="text"
              placeholder="Player ${index + 1}"
              value="${escapeAttribute(player)}"
              data-index="${index}"
            >

            ${
              index > 1
                ? `
                  <button
                    type="button"
                    class="remove-player"
                    data-index="${index}"
                  >
                    ×
                  </button>
                `
                : ""
            }
          </div>
        `
      ).join("")}
    </div>

    <button type="button" class="add-btn" id="addPlayerBtn">
      + Add Player
    </button>

    <div class="bill">
      <div class="bill-line">
        <span>Table rate</span>
        <b>₹${rate}/hr</b>
      </div>

      <div class="bill-line">
        <span>Players</span>
        <b id="playerCountPreview">${playerList.length}</b>
      </div>

      <div class="bill-line">
        <span>Extra player charge</span>
        <b id="extraPlayerPreview">
          ₹${Math.max(0, playerList.length - 2) * EXTRA_PLAYER_CHARGE}
        </b>
      </div>
    </div>

    <div class="modal-actions">
      <button type="button" class="btn btn-secondary" id="cancelStart">
        Cancel
      </button>

      <button type="button" class="btn btn-primary" id="startGameBtn">
        Start Game
      </button>
    </div>
  `;

  setupStartModalEvents();
}

/* =========================================================
   START MODAL EVENTS
========================================================= */

function setupStartModalEvents() {
  document.querySelectorAll(".game-option").forEach(button => {
    button.addEventListener("click", () => {
      selectedGame = button.dataset.game;

      document.querySelectorAll(".game-option").forEach(item => {
        item.classList.remove("selected");
      });

      button.classList.add("selected");
    });
  });

  document.querySelectorAll(".player-input").forEach(input => {
    input.addEventListener("input", () => {
      playerList[Number(input.dataset.index)] = input.value;
      updatePlayerPreview();
    });
  });

  document.querySelectorAll(".remove-player").forEach(button => {
    button.addEventListener("click", () => {
      const index = Number(button.dataset.index);
      playerList.splice(index, 1);
      renderStartModal();
    });
  });

  document.getElementById("addPlayerBtn").addEventListener("click", () => {
    playerList.push("");
    renderStartModal();
  });

  document.getElementById("cancelStart").addEventListener(
    "click",
    closeModal
  );

  document.getElementById("startGameBtn").addEventListener(
    "click",
    startGame
  );
}

/* =========================================================
   PLAYER PREVIEW
========================================================= */

function updatePlayerPreview() {
  const count = playerList.length;

  const extra =
    Math.max(0, count - 2) * EXTRA_PLAYER_CHARGE;

  const countElement =
    document.getElementById("playerCountPreview");

  const extraElement =
    document.getElementById("extraPlayerPreview");

  if (countElement) countElement.textContent = count;
  if (extraElement) extraElement.textContent = `₹${extra}`;
}

/* =========================================================
   START GAME
========================================================= */

async function startGame() {
  const inputs = document.querySelectorAll(".player-input");

  inputs.forEach(input => {
    playerList[Number(input.dataset.index)] =
      input.value.trim();
  });

  const players = normalizePlayers(playerList);

  if (!players[0]) {
    showToast("Enter Player 1 name");
    return;
  }

  if (players.length === 0) {
    showToast("Add at least one player");
    return;
  }

  const button = document.getElementById("startGameBtn");

  button.disabled = true;
  button.textContent = "Starting...";

  try {
    const { error } = await db
      .from("active_games")
      .insert({
        table_number: selectedTable,
        game: selectedGame,
        players,
        started_at: new Date().toISOString()
      });

    if (error) throw error;

    closeModal();

    showToast(`Table ${selectedTable} started`);
    await loadActiveGames();
  } catch (error) {
    console.error("Start game error:", error);

    button.disabled = false;
    button.textContent = "Start Game";

    if (error.code === "23505") {
      showToast("This table is already playing");
    } else {
      showToast(error.message || "Could not start game");
    }
  }
}

/* =========================================================
   END GAME MODAL
========================================================= */

function openEndGameModal(game) {
  selectedPayment = "Cash";
  renderEndModal(game);
  openModal();
}

/* =========================================================
   RENDER END MODAL
========================================================= */

function renderEndModal(game) {
  const players = normalizePlayers(game.players);

  const duration = getDurationMinutes(game.started_at);

  const calculated = calculateAmount(
    game.table_number,
    duration,
    players.length
  );

  modal.innerHTML = `
    <h2>Finish Game</h2>

    <div class="modal-sub">
      Table ${game.table_number} · ${escapeHTML(game.game || "Snooker")}
    </div>

    <div class="bill">
      <div class="bill-line">
        <span>Players</span>
        <b>${players.length}</b>
      </div>

      <div class="bill-line">
        <span>Duration</span>
        <b>${formatDuration(duration)}</b>
      </div>

      <div class="bill-line">
        <span>Table rate</span>
        <b>₹${getTableRate(game.table_number)}/hr</b>
      </div>

      <div class="bill-line">
        <span>Extra player charge</span>
        <b>
          ₹${
            Math.max(0, players.length - 2) *
            EXTRA_PLAYER_CHARGE
          }
        </b>
      </div>

      <div class="bill-line bill-total">
        <span>Calculated amount</span>
        <b>₹${calculated}</b>
      </div>
    </div>

    <label class="form-label">Final Amount</label>

    <div class="amount-input-wrap">
      <span class="amount-symbol">₹</span>
      <input
        id="finalAmount"
        class="input amount-input"
        type="number"
        min="0"
        step="1"
        value="${calculated}"
      >
    </div>

    <label class="form-label">Payment</label>

    <div class="payment-options">
      <button
        type="button"
        class="pay-option selected"
        data-payment="Cash"
      >
        Cash
      </button>

      <button
        type="button"
        class="pay-option"
        data-payment="Online"
      >
        Online
      </button>
    </div>

    <div class="modal-actions">
      <button type="button" class="btn btn-secondary" id="cancelEnd">
        Cancel
      </button>

      <button type="button" class="btn btn-primary" id="finishGameBtn">
        Complete Game
      </button>
    </div>
  `;

  setupEndModalEvents(game, calculated);
}

/* =========================================================
   END MODAL EVENTS
========================================================= */

function setupEndModalEvents(game, calculated) {
  document.querySelectorAll(".pay-option").forEach(button => {
    button.addEventListener("click", () => {
      selectedPayment = button.dataset.payment;

      document.querySelectorAll(".pay-option").forEach(item => {
        item.classList.remove("selected");
      });

      button.classList.add("selected");
    });
  });

  document.getElementById("cancelEnd").addEventListener(
    "click",
    closeModal
  );

  document.getElementById("finishGameBtn").addEventListener(
    "click",
    () => finishGame(game, calculated)
  );
}

/* =========================================================
   FINISH GAME
========================================================= */

async function finishGame(game, calculated) {
  const amountInput = document.getElementById("finalAmount");

  const finalAmount = Number(amountInput.value);

  if (!Number.isFinite(finalAmount) || finalAmount < 0) {
    showToast("Enter a valid final amount");
    return;
  }

  const button = document.getElementById("finishGameBtn");

  button.disabled = true;
  button.textContent = "Saving...";

  try {
    const now = new Date();

    const players = normalizePlayers(game.players);

    const startDate = new Date(game.started_at);

    const gameDate = formatDateForDB(startDate);
    const startTime = startDate.toISOString();
    const endTime = now.toISOString();

    const { error: historyError } = await db
      .from("game_history")
      .insert({
        game_date: gameDate,
        start_time: startTime,
        end_time: endTime,
        table_number: game.table_number,
        player: players[0] || "",
        players,
        player_count: players.length,
        loser: "",
        game: game.game || "Snooker",
        calculated_amount: calculated,
        amount: finalAmount,
        payment: selectedPayment
      });

    if (historyError) throw historyError;

    const { error: deleteError } = await db
      .from("active_games")
      .delete()
      .eq("id", game.id);

    if (deleteError) throw deleteError;

    closeModal();

    showToast(`Game completed · ₹${finalAmount}`);

    await loadActiveGames();
  } catch (error) {
    console.error("Finish game error:", error);

    button.disabled = false;
    button.textContent = "Complete Game";

    showToast(error.message || "Could not complete game");
  }
}

/* =========================================================
   AMOUNT CALCULATION
========================================================= */

function calculateAmount(tableNumber, durationMinutes, playerCount) {
  const rate = getTableRate(tableNumber);

  const billableHours = Math.max(1, durationMinutes / 60);

  const baseAmount = rate * billableHours;

  const extraPlayers = Math.max(0, playerCount - 2);

  const extraCharge =
    extraPlayers * EXTRA_PLAYER_CHARGE;

  return Math.round(baseAmount + extraCharge);
}

/* =========================================================
   HISTORY MODAL
========================================================= */

async function openHistoryModal() {
  modal.innerHTML = `
    <h2>Game History</h2>

    <div class="modal-sub">
      Vantara Snooker Academy
    </div>

    <div class="date-selector">
      <input
        type="date"
        id="historyDate"
        class="input"
        value="${getTodayDate()}"
      >

      <button class="btn btn-primary" id="loadHistoryBtn">
        Load
      </button>
    </div>

    <div id="historyContent" class="empty">
      Loading history...
    </div>
  `;

  openModal();

  document.getElementById("loadHistoryBtn").addEventListener(
    "click",
    () => {
      const date =
        document.getElementById("historyDate").value;

      loadHistory(date);
    }
  );

  await loadHistory(getTodayDate());
}

/* =========================================================
   LOAD HISTORY
========================================================= */

async function loadHistory(date) {
  const content =
    document.getElementById("historyContent");

  if (!content) return;

  content.innerHTML =
    `<div class="empty">Loading...</div>`;

  try {
    const { data, error } = await db
      .from("game_history")
      .select("*")
      .eq("game_date", date)
      .order("created_at", { ascending: false });

    if (error) throw error;

    renderHistory(data || [], content, date);
  } catch (error) {
    console.error("History error:", error);

    content.innerHTML =
      `<div class="empty">Could not load history.</div>`;
  }
}

/* =========================================================
   RENDER HISTORY
========================================================= */

function renderHistory(records, container, date) {
  const total = records.reduce(
    (sum, record) =>
      sum + Number(record.amount || 0),
    0
  );

  const games = records.length;

  const cash = records
    .filter(
      r =>
        String(r.payment).toLowerCase() === "cash"
    )
    .reduce(
      (sum, r) => sum + Number(r.amount || 0),
      0
    );

  const online = records
    .filter(
      r =>
        String(r.payment).toLowerCase() === "online"
    )
    .reduce(
      (sum, r) => sum + Number(r.amount || 0),
      0
    );

  if (records.length === 0) {
    container.innerHTML = `
      <div class="history-summary">
        <div class="stat-card">
          <span>Games</span>
          <strong>0</strong>
        </div>
        <div class="stat-card">
          <span>Collection</span>
          <strong>₹0</strong>
        </div>
        <div class="stat-card">
          <span>Cash</span>
          <strong>₹0</strong>
        </div>
        <div class="stat-card">
          <span>Online</span>
          <strong>₹0</strong>
        </div>
      </div>

      <div class="empty">
        No games found for ${escapeHTML(date)}.
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="history-summary">
      <div class="stat-card">
        <span>Games</span>
        <strong>${games}</strong>
      </div>

      <div class="stat-card">
        <span>Collection</span>
        <strong>₹${total}</strong>
      </div>

      <div class="stat-card">
        <span>Cash</span>
        <strong>₹${cash}</strong>
      </div>

      <div class="stat-card">
        <span>Online</span>
        <strong>₹${online}</strong>
      </div>
    </div>

    <div class="history-wrap">
      <table class="history-table">
        <thead>
          <tr>
            <th>Time</th>
            <th>Table</th>
            <th>Game</th>
            <th>Players</th>
            <th>Duration</th>
            <th>Amount</th>
            <th>Payment</th>
          </tr>
        </thead>

        <tbody>
          ${records.map(record => {
            const players = normalizePlayers(record.players);
            const duration = calculateRecordDuration(record);

            return `
              <tr>
                <td>${formatTimeDisplay(record.start_time)}</td>
                <td>Table ${escapeHTML(record.table_number)}</td>
                <td>${escapeHTML(record.game || "")}</td>
                <td>${escapeHTML(players.join(", "))}</td>
                <td>${duration}</td>
                <td>₹${Number(record.amount || 0)}</td>
                <td>${escapeHTML(record.payment || "")}</td>
              </tr>
            `;
          }).join("")}
        </tbody>
      </table>
    </div>

    <div class="report-actions">
      <button class="btn btn-secondary" id="closeHistoryBtn">
        Close
      </button>

      <button class="btn btn-primary" id="exportHistoryBtn">
        Export CSV
      </button>
    </div>
  `;

  document.getElementById("closeHistoryBtn").addEventListener(
    "click",
    closeModal
  );

  document.getElementById("exportHistoryBtn").addEventListener(
    "click",
    () => exportCSV(records, date)
  );
}

/* =========================================================
   RECORD DURATION
========================================================= */

function calculateRecordDuration(record) {
  if (!record.start_time || !record.end_time) {
    return "-";
  }

  const start = parseTimeToMinutes(record.start_time);
  const end = parseTimeToMinutes(record.end_time);

  if (start === null || end === null) {
    return "-";
  }

  let difference = end - start;

  if (difference < 0) {
    difference += 24 * 60;
  }

  return formatDuration(difference);
}

/* =========================================================
   STATS
========================================================= */

async function updateStats() {
  const playing = activeGames.length;
  const available = TOTAL_TABLES - playing;

  availableCount.textContent = available;
  playingCount.textContent = playing;

  try {
    const today = getTodayDate();

    const { data, error } = await db
      .from("game_history")
      .select("amount")
      .eq("game_date", today);

    if (error) throw error;

    const total = (data || []).reduce(
      (sum, row) =>
        sum + Number(row.amount || 0),
      0
    );

    gamesCount.textContent = data?.length || 0;
    collection.textContent = `₹${total}`;
  } catch (error) {
    console.error("Stats error:", error);

    gamesCount.textContent = "0";
    collection.textContent = "₹0";
  }
}

/* =========================================================
   MODAL
========================================================= */

function openModal() {
  modalBackdrop.classList.add("open");
}

function closeModal() {
  modalBackdrop.classList.remove("open");
}

/* =========================================================
   TOAST
========================================================= */

let toastTimer = null;

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(toastTimer);

  toastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 3000);
}

/* =========================================================
   TIME HELPERS
========================================================= */

function getElapsedTime(startedAt) {
  const minutes = getDurationMinutes(startedAt);
  return formatDuration(minutes);
}

function getDurationMinutes(startedAt) {
  const start = new Date(startedAt);
  const now = new Date();

  const milliseconds =
    now.getTime() - start.getTime();

  return Math.max(
    0,
    Math.floor(milliseconds / 60000)
  );
}

function formatDuration(minutes) {
  minutes = Math.max(
    0,
    Math.floor(Number(minutes) || 0)
  );

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours > 0) {
    return `${hours}h ${String(mins).padStart(2, "0")}m`;
  }

  return `${mins}m`;
}

/* =========================================================
   DATE / TIME
========================================================= */

function getTodayDate() {
  return formatDateForDB(new Date());
}

function formatDateForDB(date) {
  const year = date.getFullYear();

  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatTimeForDB(date) {
  return [
    String(date.getHours()).padStart(2, "0"),
    String(date.getMinutes()).padStart(2, "0"),
    String(date.getSeconds()).padStart(2, "0")
  ].join(":");
}

function formatTimeDisplay(value) {
  if (!value) return "-";

  const parts = String(value).split(":");

  if (parts.length < 2) return value;

  const hours = Number(parts[0]);
  const minutes = parts[1];

  const suffix = hours >= 12 ? "PM" : "AM";
  const displayHour = hours % 12 || 12;

  return `${displayHour}:${minutes} ${suffix}`;
}

function parseTimeToMinutes(value) {
  if (!value) return null;

  const parts = String(value).split(":");

  if (parts.length < 2) return null;

  const hours = Number(parts[0]);
  const minutes = Number(parts[1]);

  if (
    !Number.isFinite(hours) ||
    !Number.isFinite(minutes)
  ) {
    return null;
  }

  return hours * 60 + minutes;
}

/* =========================================================
   NORMALIZE PLAYERS
========================================================= */

function normalizePlayers(players) {
  if (Array.isArray(players)) {
    return players
      .map(player => String(player || "").trim())
      .filter(Boolean);
  }

  if (typeof players === "string") {
    try {
      const parsed = JSON.parse(players);

      if (Array.isArray(parsed)) {
        return normalizePlayers(parsed);
      }
    } catch {
      return players
        .split(",")
        .map(player => player.trim())
        .filter(Boolean);
    }
  }

  return [];
}

/* =========================================================
   CSV EXPORT
========================================================= */

function exportCSV(records, date) {
  const headers = [
    "Date",
    "Start Time",
    "End Time",
    "Table",
    "Game",
    "Players",
    "Player Count",
    "Amount",
    "Calculated Amount",
    "Payment"
  ];

  const rows = records.map(record => [
    date,
    record.start_time || "",
    record.end_time || "",
    record.table_number || "",
    record.game || "",
    normalizePlayers(record.players).join(" | "),
    record.player_count || "",
    record.amount || 0,
    record.calculated_amount || 0,
    record.payment || ""
  ]);

  const csv = [
    headers,
    ...rows
  ]
    .map(row =>
      row
        .map(value =>
          `"${String(value).replace(/"/g, '""')}"`
        )
        .join(",")
    )
    .join("\n");

  const blob = new Blob(
    [csv],
    { type: "text/csv;charset=utf-8;" }
  );

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `vantara-history-${date}.csv`;

  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);

  showToast("CSV exported");
}

/* =========================================================
   SECURITY / HTML HELPERS
========================================================= */

function escapeHTML(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeAttribute(value) {
  return escapeHTML(value);
}

/* =========================================================
   AUTO REFRESH STATS
========================================================= */

setInterval(() => {
  updateStats();
}, 30000);
