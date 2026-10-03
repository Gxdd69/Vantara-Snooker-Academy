/* =========================================================
   VANTARA SNOOKER ACADEMY
   SUPABASE + LIVE TABLE MANAGEMENT
   AUTHENTICATION + UNPAID + CONTINUE GAME
   ========================================================= */

/* =========================================================
   SUPABASE CONFIG
   ========================================================= */

const SUPABASE_URL =
  "https://crdwfhrbfxfydklpjroo.supabase.co";

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
let playerList = ["", ""];

let appInitialized = false;
let realtimeChannel = null;

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
const connectionStatus =
  document.getElementById("connectionStatus");
const clock = document.getElementById("clock");

/* =========================================================
   INITIALIZATION
   ========================================================= */

document.addEventListener("DOMContentLoaded", async () => {
  startClock();
  setupEvents();
  addUnpaidDashboardButton();

  const {
    data: { session },
    error
  } = await db.auth.getSession();

  if (error) {
    console.error("Session error:", error);
    showLoginModal();
    return;
  }

  if (!session) {
    showLoginModal();
    return;
  }

  await initializeApp();
  setupAuthListener();
});

/* =========================================================
   APP INITIALIZATION
   ========================================================= */

async function initializeApp() {
  if (appInitialized) return;

  appInitialized = true;

  renderTables();
  await loadActiveGames();
  subscribeToRealtime();
}

/* =========================================================
   AUTH STATE LISTENER
   ========================================================= */

function setupAuthListener() {
  db.auth.onAuthStateChange(async (event, session) => {
    console.log("Auth event:", event);

    if (event === "SIGNED_IN" && session) {
      await initializeApp();

      if (modalBackdrop.classList.contains("open")) {
        modal.dataset.loginRequired = "false";
        modalBackdrop.classList.remove("open");
      }

      renderTables();
      await loadActiveGames();

      showToast("Login successful");
    }

    if (event === "SIGNED_OUT") {
      lockApplication();
    }
  });
}

/* =========================================================
   APPLICATION LOCK
   ========================================================= */

function lockApplication() {
  appInitialized = false;
  activeGames = [];

  if (realtimeChannel) {
    db.removeChannel(realtimeChannel);
    realtimeChannel = null;
  }

  floorGrid.innerHTML = "";

  availableCount.textContent = "0";
  playingCount.textContent = "0";
  gamesCount.textContent = "0";
  collection.textContent = "₹0";

  setConnection(false, "Login required");

  showLoginModal();
}

/* =========================================================
   EVENTS
   ========================================================= */

function setupEvents() {
  historyBtn.addEventListener(
    "click",
    requireLoginForHistory
  );

  modalBackdrop.addEventListener(
    "click",
    event => {
      if (event.target !== modalBackdrop) return;

      if (
        modal.dataset.loginRequired === "true"
      ) {
        return;
      }

      closeModal();
    }
  );

  document.addEventListener(
    "keydown",
    event => {
      if (event.key !== "Escape") return;

      if (
        modal.dataset.loginRequired === "true"
      ) {
        return;
      }

      closeModal();
    }
  );
}

/* =========================================================
   UNPAID DASHBOARD BUTTON
   ========================================================= */

function addUnpaidDashboardButton() {
  const topActions =
    document.querySelector(".top-actions");

  if (!topActions) return;

  if (
    document.getElementById("unpaidBtn")
  ) {
    return;
  }

  const button =
    document.createElement("button");

  button.id = "unpaidBtn";
  button.className = "history-btn";
  button.textContent = "Unpaid";
  button.addEventListener(
    "click",
    requireLoginForUnpaid
  );

  topActions.insertBefore(
    button,
    historyBtn
  );
}

/* =========================================================
   CLOCK
   ========================================================= */

function startClock() {
  function updateClock() {
    const now = new Date();

    clock.textContent =
      now.toLocaleTimeString(
        "en-IN",
        {
          hour12: false,
          timeZone: "Asia/Kolkata"
        }
      );
  }

  updateClock();

  setInterval(
    updateClock,
    1000
  );
}

/* =========================================================
   CONNECTION
   ========================================================= */

function setConnection(
  online,
  text
) {
  connectionStatus.classList.remove(
    "online",
    "offline"
  );

  if (online) {
    connectionStatus.classList.add(
      "online"
    );

    connectionStatus.innerHTML =
      "<span></span> " +
      (text || "Connected");
  } else {
    connectionStatus.classList.add(
      "offline"
    );

    connectionStatus.innerHTML =
      "<span></span> " +
      (text || "Offline");
  }
}

/* =========================================================
   LOAD ACTIVE GAMES
   ========================================================= */

async function loadActiveGames() {
  try {
    const {
      data,
      error
    } = await db
      .from("active_games")
      .select("*")
      .order(
        "table_number",
        {
          ascending: true
        }
      );

    if (error) throw error;

    activeGames = data || [];

    setConnection(
      true,
      "Connected"
    );

    renderTables();
    updateStats();

  } catch (error) {
    console.error(
      "Active games error:",
      error
    );

    setConnection(
      false,
      "Database error"
    );

    showToast(
      "Could not load table data"
    );
  }
}

/* =========================================================
   REALTIME
   ========================================================= */

function subscribeToRealtime() {
  if (realtimeChannel) {
    db.removeChannel(
      realtimeChannel
    );
  }

  realtimeChannel =
    db
      .channel(
        "vantara-active-games"
      )
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
      .subscribe(
        status => {
          if (
            status ===
            "SUBSCRIBED"
          ) {
            setConnection(
              true,
              "Live"
            );
          }
        }
      );
}

/* =========================================================
   TABLE HELPERS
   ========================================================= */

function getActiveGame(
  tableNumber
) {
  return activeGames.find(
    game =>
      Number(
        game.table_number
      ) ===
      Number(tableNumber)
  );
}

function getTableRate(
  tableNumber
) {
  return (
    TABLE_RATES[
      Number(tableNumber)
    ] || 0
  );
}

function getGameRate(game) {
  const custom =
    Number(
      game?.custom_rate
    );

  if (
    Number.isFinite(custom) &&
    custom >= 0
  ) {
    return custom;
  }

  return getTableRate(
    game?.table_number
  );
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
    const activeGame =
      getActiveGame(
        tableNumber
      );

    if (activeGame) {
      floorGrid.appendChild(
        createPlayingTable(
          activeGame
        )
      );
    } else {
      floorGrid.appendChild(
        createAvailableTable(
          tableNumber
        )
      );
    }
  }
}

/* =========================================================
   AVAILABLE TABLE
   ========================================================= */

function createAvailableTable(
  tableNumber
) {
  const card =
    document.createElement(
      "div"
    );

  card.className =
    "table-card";

  const rate =
    getTableRate(
      tableNumber
    );

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

        <div class="table-number">
          Table ${tableNumber}
        </div>

        <div class="table-status">
          <span class="status-dot"></span>
          Available
        </div>

      </div>

      <div class="table-bottom">

        <div class="available-text">
          Tap to start
        </div>

        <div class="price">
          ₹${rate}/hr
        </div>

      </div>
    </div>
  `;

  card.addEventListener(
    "click",
    () =>
      openStartGameModal(
        tableNumber
      )
  );

  return card;
}

/* =========================================================
   PLAYING TABLE
   ========================================================= */

function createPlayingTable(
  game
) {
  const card =
    document.createElement(
      "div"
    );

  card.className =
    "table-card playing";

  const players =
    normalizePlayers(
      game.players
    );

  const firstPlayer =
    players[0] ||
    "Player";

  const elapsed =
    getElapsedTime(
      game.started_at
    );

  const gameName =
    game.game ||
    "Snooker";

  const rate =
    getGameRate(game);

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

        <div class="player-mini-label">
          PLAYER
        </div>

        <div class="player-mini-name">
          ${escapeHTML(firstPlayer)}
        </div>

      </div>

      <div class="playing-meta">

        <div>
          <div class="game-mini">
            ${escapeHTML(gameName)}
          </div>

          <div class="game-mini">
            ₹${rate}/hr
          </div>
        </div>

        <div
          class="timer"
          data-start="${escapeAttribute(
            game.started_at
          )}"
        >
          ${elapsed}
        </div>

      </div>

    </div>
  `;

  card.addEventListener(
    "click",
    () =>
      openEndGameModal(game)
  );

  return card;
}

/* =========================================================
   TIMER REFRESH
   ========================================================= */

setInterval(() => {
  document
    .querySelectorAll(
      ".timer[data-start]"
    )
    .forEach(timer => {
      timer.textContent =
        getElapsedTime(
          timer.dataset.start
        );
    });
}, 1000);

/* =========================================================
   START GAME MODAL
   ========================================================= */

function openStartGameModal(
  tableNumber
) {
  selectedTable =
    tableNumber;

  selectedGame =
    "Snooker";

  selectedPayment =
    "Cash";

  playerList = [
    "",
    ""
  ];

  renderStartModal();
  openModal();
}

/* =========================================================
   RENDER START MODAL
   ========================================================= */

function renderStartModal() {
  const rate =
    getTableRate(
      selectedTable
    );

  modal.dataset.loginRequired =
    "false";

  modal.innerHTML = `
    <h2>Start Game</h2>

    <div class="modal-sub">
      Table ${selectedTable}
    </div>

    <label class="form-label">
      Game
    </label>

    <div class="game-options">

      ${GAME_TYPES.map(
        game => `
          <button
            type="button"
            class="game-option ${
              game === selectedGame
                ? "selected"
                : ""
            }"
            data-game="${escapeAttribute(
              game
            )}"
          >
            ${escapeHTML(game)}
          </button>
        `
      ).join("")}

    </div>

    <label class="form-label">
      Table Price / Hour
    </label>

    <div class="amount-input-wrap">

      <span class="amount-symbol">
        ₹
      </span>

      <input
        id="customRate"
        class="input amount-input"
        type="number"
        min="0"
        step="1"
        value="${rate}"
      >

    </div>

    <label class="form-label">
      Players
    </label>

    <div id="playersContainer">

      ${playerList.map(
        (
          player,
          index
        ) => `
          <div class="player-row">

            <input
              class="input player-input"
              type="text"
              placeholder="Player ${
                index + 1
              }"
              value="${escapeAttribute(
                player
              )}"
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

    <button
      type="button"
      class="add-btn"
      id="addPlayerBtn"
    >
      + Add Player
    </button>

    <div class="bill">

      <div class="bill-line">
        <span>Table rate</span>
        <b id="ratePreview">
          ₹${rate}/hr
        </b>
      </div>

      <div class="bill-line">
        <span>Players</span>
        <b id="playerCountPreview">
          ${playerList.length}
        </b>
      </div>

      <div class="bill-line">
        <span>Extra player charge</span>
        <b id="extraPlayerPreview">
          ₹${
            Math.max(
              0,
              playerList.length - 2
            ) *
            EXTRA_PLAYER_CHARGE
          }
        </b>
      </div>

    </div>

    <div class="modal-actions">

      <button
        type="button"
        class="btn btn-secondary"
        id="cancelStart"
      >
        Cancel
      </button>

      <button
        type="button"
        class="btn btn-primary"
        id="startGameBtn"
      >
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
  document
    .querySelectorAll(
      ".game-option"
    )
    .forEach(button => {
      button.addEventListener(
        "click",
        () => {
          selectedGame =
            button.dataset.game;

          document
            .querySelectorAll(
              ".game-option"
            )
            .forEach(item =>
              item.classList.remove(
                "selected"
              )
            );

          button.classList.add(
            "selected"
          );
        }
      );
    });

  document
    .querySelectorAll(
      ".player-input"
    )
    .forEach(input => {
      input.addEventListener(
        "input",
        () => {
          playerList[
            Number(
              input.dataset.index
            )
          ] =
            input.value;

          updatePlayerPreview();
        }
      );
    });

  document
    .getElementById(
      "customRate"
    )
    .addEventListener(
      "input",
      updateRatePreview
    );

  document
    .querySelectorAll(
      ".remove-player"
    )
    .forEach(button => {
      button.addEventListener(
        "click",
        () => {
          const index =
            Number(
              button.dataset.index
            );

          playerList.splice(
            index,
            1
          );

          renderStartModal();
        }
      );
    });

  document
    .getElementById(
      "addPlayerBtn"
    )
    .addEventListener(
      "click",
      () => {
        playerList.push("");
        renderStartModal();
      }
    );

  document
    .getElementById(
      "cancelStart"
    )
    .addEventListener(
      "click",
      closeModal
    );

  document
    .getElementById(
      "startGameBtn"
    )
    .addEventListener(
      "click",
      startGame
    );
}

/* =========================================================
   RATE PREVIEW
   ========================================================= */

function updateRatePreview() {
  const input =
    document.getElementById(
      "customRate"
    );

  const preview =
    document.getElementById(
      "ratePreview"
    );

  if (!input || !preview) {
    return;
  }

  const value =
    Number(input.value);

  preview.textContent =
    `₹${
      Number.isFinite(value)
        ? value
        : 0
    }/hr`;
}

/* =========================================================
   PLAYER PREVIEW
   ========================================================= */

function updatePlayerPreview() {
  const count =
    playerList.length;

  const extra =
    Math.max(
      0,
      count - 2
    ) *
    EXTRA_PLAYER_CHARGE;

  const countElement =
    document.getElementById(
      "playerCountPreview"
    );

  const extraElement =
    document.getElementById(
      "extraPlayerPreview"
    );

  if (countElement) {
    countElement.textContent =
      count;
  }

  if (extraElement) {
    extraElement.textContent =
      `₹${extra}`;
  }
}

/* =========================================================
   START GAME
   ========================================================= */

async function startGame() {
  const {
    data: { session }
  } =
    await db.auth.getSession();

  if (!session) {
    showLoginModal();
    return;
  }

  const inputs =
    document.querySelectorAll(
      ".player-input"
    );

  inputs.forEach(input => {
    playerList[
      Number(
        input.dataset.index
      )
    ] =
      input.value.trim();
  });

  const players =
    normalizePlayers(
      playerList
    );

  if (!players[0]) {
    showToast(
      "Enter Player 1 name"
    );
    return;
  }

  const rateInput =
    document.getElementById(
      "customRate"
    );

  const customRate =
    Number(
      rateInput?.value
    );

  if (
    !Number.isFinite(
      customRate
    ) ||
    customRate < 0
  ) {
    showToast(
      "Enter a valid table price"
    );
    return;
  }

  const button =
    document.getElementById(
      "startGameBtn"
    );

  button.disabled =
    true;

  button.textContent =
    "Starting...";

  try {
    const {
      error
    } =
      await db
        .from(
          "active_games"
        )
        .insert({
          table_number:
            selectedTable,
          game:
            selectedGame,
          players,
          custom_rate:
            customRate,
          started_at:
            new Date().toISOString()
        });

    if (error) {
      throw error;
    }

    closeModal();

    showToast(
      `Table ${selectedTable} started`
    );

    await loadActiveGames();

  } catch (error) {
    console.error(
      "Start game error:",
      error
    );

    button.disabled =
      false;

    button.textContent =
      "Start Game";

    if (
      error.code ===
      "23505"
    ) {
      showToast(
        "This table is already playing"
      );
    } else {
      showToast(
        error.message ||
        "Could not start game"
      );
    }
  }
}

/* =========================================================
   END GAME MODAL
   ========================================================= */

function openEndGameModal(
  game
) {
  selectedPayment =
    "Cash";

  renderEndModal(game);
  openModal();
}

/* =========================================================
   RENDER END MODAL
   ========================================================= */

function renderEndModal(
  game
) {
  const players =
    normalizePlayers(
      game.players
    );

  const duration =
    getDurationMinutes(
      game.started_at
    );

  const calculated =
    calculateAmount(
      game.table_number,
      duration,
      players.length,
      game.custom_rate
    );

  modal.dataset.loginRequired =
    "false";

  modal.innerHTML = `
    <h2>Finish Game</h2>

    <div class="modal-sub">
      Table ${
        game.table_number
      } ·
      ${escapeHTML(
        game.game ||
        "Snooker"
      )}
    </div>

    <div class="bill">

      <div class="bill-line">
        <span>Players</span>
        <b>${players.length}</b>
      </div>

      <div class="bill-line">
        <span>Duration</span>
        <b>
          ${formatDuration(
            duration
          )}
        </b>
      </div>

      <div class="bill-line">
        <span>Table rate</span>
        <b>
          ₹${getGameRate(
            game
          )}/hr
        </b>
      </div>

      <div class="bill-line">
        <span>Extra player charge</span>
        <b>
          ₹${
            Math.max(
              0,
              players.length - 2
            ) *
            EXTRA_PLAYER_CHARGE
          }
        </b>
      </div>

    </div>

    <label class="form-label">
      Who Lost?
    </label>

    <div
      id="loserOptions"
      class="game-options"
    >

      ${players.map(
        player => `
          <button
            type="button"
            class="game-option loser-option"
            data-loser="${escapeAttribute(
              player
            )}"
          >
            ${escapeHTML(
              player
            )}
          </button>
        `
      ).join("")}

    </div>

    <div
      id="loserNotice"
      style="
        display:none;
        margin-top:12px;
        padding:12px 14px;
        border:1px solid rgba(227,109,109,.35);
        border-radius:10px;
        background:rgba(227,109,109,.08);
        color:#f08b8b;
        font-size:12px;
        font-weight:600;
      "
    >
      LOSER WILL PAY THE BILL
    </div>

    <label class="form-label">
      Final Amount
    </label>

    <div class="amount-input-wrap">

      <span class="amount-symbol">
        ₹
      </span>

      <input
        id="finalAmount"
        class="input amount-input"
        type="number"
        min="0"
        step="1"
        value="${calculated}"
      >

    </div>

    <label class="form-label">
      Payment
    </label>

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

      <button
        type="button"
        class="pay-option"
        data-payment="Unpaid"
      >
        Not Paid
      </button>

    </div>

    <div class="modal-actions">

      <button
        type="button"
        class="btn btn-secondary"
        id="cancelEnd"
      >
        Cancel
      </button>

      <button
        type="button"
        class="btn btn-secondary"
        id="continueGameBtn"
      >
        Continue
      </button>

      <button
        type="button"
        class="btn btn-primary"
        id="finishGameBtn"
      >
        Complete Game
      </button>

    </div>
  `;

  setupEndModalEvents(
    game
  );
}

/* =========================================================
   END MODAL EVENTS
   ========================================================= */

function setupEndModalEvents(
  game
) {
  document
    .querySelectorAll(
      ".pay-option"
    )
    .forEach(button => {
      button.addEventListener(
        "click",
        () => {
          selectedPayment =
            button.dataset.payment;

          document
            .querySelectorAll(
              ".pay-option"
            )
            .forEach(item =>
              item.classList.remove(
                "selected"
              )
            );

          button.classList.add(
            "selected"
          );
        }
      );
    });

  document
    .querySelectorAll(
      ".loser-option"
    )
    .forEach(button => {
      button.addEventListener(
        "click",
        () => {
          document
            .querySelectorAll(
              ".loser-option"
            )
            .forEach(item =>
              item.classList.remove(
                "selected"
              )
            );

          button.classList.add(
            "selected"
          );

          const notice =
            document.getElementById(
              "loserNotice"
            );

          if (notice) {
            notice.style.display =
              "block";

            notice.textContent =
              `${button.dataset.loser} WILL PAY THE BILL`;
          }
        }
      );
    });

  document
    .getElementById(
      "cancelEnd"
    )
    .addEventListener(
      "click",
      closeModal
    );

  document
    .getElementById(
      "continueGameBtn"
    )
    .addEventListener(
      "click",
      () =>
        continueGame(
          game
        )
    );

  document
    .getElementById(
      "finishGameBtn"
    )
    .addEventListener(
      "click",
      () =>
        finishGame(
          game
        )
    );
}

/* =========================================================
   CONTINUE GAME
   ========================================================= */

async function continueGame(
  game
) {
  const {
    data: { session }
  } =
    await db.auth.getSession();

  if (!session) {
    showLoginModal();
    return;
  }

  const currentPlayers =
    normalizePlayers(
      game.players
    );

  const currentRate =
    getGameRate(game);

  modal.innerHTML = `
    <h2>Continue Game</h2>

    <div class="modal-sub">
      Table ${
        game.table_number
      } ·
      ${escapeHTML(
        game.game ||
        "Snooker"
      )}
    </div>

    <label class="form-label">
      Table Price / Hour
    </label>

    <div class="amount-input-wrap">

      <span class="amount-symbol">
        ₹
      </span>

      <input
        id="continueRate"
        class="input amount-input"
        type="number"
        min="0"
        step="1"
        value="${currentRate}"
      >

    </div>

    <label class="form-label">
      Players
    </label>

    <div id="continuePlayers">

      ${currentPlayers.map(
        (
          player,
          index
        ) => `
          <div class="player-row">

            <input
              class="input continue-player-input"
              type="text"
              value="${escapeAttribute(
                player
              )}"
              data-index="${index}"
              placeholder="Player ${
                index + 1
              }"
            >

            <button
              type="button"
              class="remove-player continue-remove"
              data-index="${index}"
            >
              ×
            </button>

          </div>
        `
      ).join("")}

    </div>

    <button
      type="button"
      class="add-btn"
      id="continueAddPlayer"
    >
      + Add Player
    </button>

    <div class="bill">

      <div class="bill-line">
        <span>Current players</span>
        <b>
          ${currentPlayers.length}
        </b>
      </div>

      <div class="bill-line">
        <span>Extra player charge</span>
        <b>
          ₹${
            Math.max(
              0,
              currentPlayers.length - 2
            ) *
            EXTRA_PLAYER_CHARGE
          }
        </b>
      </div>

    </div>

    <div class="modal-actions">

      <button
        type="button"
        class="btn btn-secondary"
        id="cancelContinue"
      >
        Back
      </button>

      <button
        type="button"
        class="btn btn-primary"
        id="saveContinue"
      >
        Continue Playing
      </button>

    </div>
  `;

  let continuePlayers =
    [...currentPlayers];

  document
    .querySelectorAll(
      ".continue-player-input"
    )
    .forEach(input => {
      input.addEventListener(
        "input",
        () => {
          continuePlayers[
            Number(
              input.dataset.index
            )
          ] =
            input.value;
        }
      );
    });

  document
    .querySelectorAll(
      ".continue-remove"
    )
    .forEach(button => {
      button.addEventListener(
        "click",
        () => {
          const index =
            Number(
              button.dataset.index
            );

          continuePlayers.splice(
            index,
            1
          );

          if (
            continuePlayers.length ===
            0
          ) {
            continuePlayers.push(
              ""
            );
          }

          renderContinueModal(
            game,
            continuePlayers
          );
        }
      );
    });

  document
    .getElementById(
      "continueAddPlayer"
    )
    .addEventListener(
      "click",
      () => {
        continuePlayers.push(
          ""
        );

        renderContinueModal(
          game,
          continuePlayers
        );
      }
    );

  document
    .getElementById(
      "cancelContinue"
    )
    .addEventListener(
      "click",
      () =>
        renderEndModal(
          game
        )
    );

  document
    .getElementById(
      "saveContinue"
    )
    .addEventListener(
      "click",
      async () => {
        const rate =
          Number(
            document
              .getElementById(
                "continueRate"
              )
              .value
          );

        const inputs =
          document.querySelectorAll(
            ".continue-player-input"
          );

        inputs.forEach(
          input => {
            continuePlayers[
              Number(
                input.dataset.index
              )
            ] =
              input.value.trim();
          }
        );

        const players =
          normalizePlayers(
            continuePlayers
          );

        if (
          players.length ===
          0
        ) {
          showToast(
            "Add at least one player"
          );
          return;
        }

        if (
          !Number.isFinite(
            rate
          ) ||
          rate < 0
        ) {
          showToast(
            "Enter a valid price"
          );
          return;
        }

        const button =
          document.getElementById(
            "saveContinue"
          );

        button.disabled =
          true;

        button.textContent =
          "Saving...";

        try {
          const {
            error
          } =
            await db
              .from(
                "active_games"
              )
              .update({
                players,
                custom_rate:
                  rate
              })
              .eq(
                "id",
                game.id
              );

          if (error) {
            throw error;
          }

          closeModal();

          showToast(
            "Game updated · Continuing"
          );

          await loadActiveGames();

        } catch (error) {
          console.error(
            "Continue game error:",
            error
          );

          button.disabled =
            false;

          button.textContent =
            "Continue Playing";

          showToast(
            error.message ||
            "Could not update game"
          );
        }
      }
    );
}

/* =========================================================
   CONTINUE MODAL RENDER
   ========================================================= */

function renderContinueModal(
  game,
  players
) {
  modal.innerHTML = `
    <h2>Continue Game</h2>

    <div class="modal-sub">
      Table ${
        game.table_number
      } ·
      ${escapeHTML(
        game.game ||
        "Snooker"
      )}
    </div>

    <label class="form-label">
      Table Price / Hour
    </label>

    <div class="amount-input-wrap">

      <span class="amount-symbol">
        ₹
      </span>

      <input
        id="continueRate"
        class="input amount-input"
        type="number"
        min="0"
        step="1"
        value="${getGameRate(
          game
        )}"
      >

    </div>

    <label class="form-label">
      Players
    </label>

    <div id="continuePlayers">

      ${players.map(
        (
          player,
          index
        ) => `
          <div class="player-row">

            <input
              class="input continue-player-input"
              type="text"
              value="${escapeAttribute(
                player
              )}"
              data-index="${index}"
              placeholder="Player ${
                index + 1
              }"
            >

            <button
              type="button"
              class="remove-player continue-remove"
              data-index="${index}"
            >
              ×
            </button>

          </div>
        `
      ).join("")}

    </div>

    <button
      type="button"
      class="add-btn"
      id="continueAddPlayer"
    >
      + Add Player
    </button>

    <div class="bill">

      <div class="bill-line">
        <span>Players</span>
        <b>
          ${players.length}
        </b>
      </div>

      <div class="bill-line">
        <span>Extra player charge</span>
        <b>
          ₹${
            Math.max(
              0,
              players.length - 2
            ) *
            EXTRA_PLAYER_CHARGE
          }
        </b>
      </div>

    </div>

    <div class="modal-actions">

      <button
        type="button"
        class="btn btn-secondary"
        id="cancelContinue"
      >
        Back
      </button>

      <button
        type="button"
        class="btn btn-primary"
        id="saveContinue"
      >
        Continue Playing
      </button>

    </div>
  `;

  let workingPlayers =
    [...players];

  document
    .querySelectorAll(
      ".continue-player-input"
    )
    .forEach(input => {
      input.addEventListener(
        "input",
        () => {
          workingPlayers[
            Number(
              input.dataset.index
            )
          ] =
            input.value;
        }
      );
    });

  document
    .querySelectorAll(
      ".continue-remove"
    )
    .forEach(button => {
      button.addEventListener(
        "click",
        () => {
          const index =
            Number(
              button.dataset.index
            );

          workingPlayers.splice(
            index,
            1
          );

          if (
            workingPlayers.length ===
            0
          ) {
            workingPlayers.push(
              ""
            );
          }

          renderContinueModal(
            game,
            workingPlayers
          );
        }
      );
    });

  document
    .getElementById(
      "continueAddPlayer"
    )
    .addEventListener(
      "click",
      () => {
        workingPlayers.push(
          ""
        );

        renderContinueModal(
          game,
          workingPlayers
        );
      }
    );

  document
    .getElementById(
      "cancelContinue"
    )
    .addEventListener(
      "click",
      () =>
        renderEndModal(
          game
        )
    );

  document
    .getElementById(
      "saveContinue"
    )
    .addEventListener(
      "click",
      async () => {
        const rate =
          Number(
            document
              .getElementById(
                "continueRate"
              )
              .value
          );

        const inputs =
          document.querySelectorAll(
            ".continue-player-input"
          );

        inputs.forEach(
          input => {
            workingPlayers[
              Number(
                input.dataset.index
              )
            ] =
              input.value.trim();
          }
        );

        const finalPlayers =
          normalizePlayers(
            workingPlayers
          );

        if (
          finalPlayers.length ===
          0
        ) {
          showToast(
            "Add at least one player"
          );
          return;
        }

        if (
          !Number.isFinite(
            rate
          ) ||
          rate < 0
        ) {
          showToast(
            "Enter a valid price"
          );
          return;
        }

        const button =
          document.getElementById(
            "saveContinue"
          );

        button.disabled =
          true;

        button.textContent =
          "Saving...";

        try {
          const {
            error
          } =
            await db
              .from(
                "active_games"
              )
              .update({
                players:
                  finalPlayers,
                custom_rate:
                  rate
              })
              .eq(
                "id",
                game.id
              );

          if (error) {
            throw error;
          }

          closeModal();

          showToast(
            "Game updated · Continuing"
          );

          await loadActiveGames();

        } catch (error) {
          console.error(
            "Continue error:",
            error
          );

          button.disabled =
            false;

          button.textContent =
            "Continue Playing";

          showToast(
            error.message ||
            "Could not update game"
          );
        }
      }
    );
}

/* =========================================================
   CALCULATE AMOUNT
   ========================================================= */

function calculateAmount(
  tableNumber,
  durationMinutes,
  playerCount,
  customRate
) {
  const rate =
    Number.isFinite(
      Number(customRate)
    ) &&
    Number(customRate) >= 0
      ? Number(customRate)
      : getTableRate(
          tableNumber
        );

  const billableHours =
    Math.max(
      1,
      durationMinutes / 60
    );

  const baseAmount =
    rate *
    billableHours;

  const extraPlayers =
    Math.max(
      0,
      playerCount - 2
    );

  const extraCharge =
    extraPlayers *
    EXTRA_PLAYER_CHARGE;

  return Math.round(
    baseAmount +
    extraCharge
  );
}

/* =========================================================
   FINISH GAME
   ========================================================= */

async function finishGame(
  game
) {
  const {
    data: { session }
  } =
    await db.auth.getSession();

  if (!session) {
    showLoginModal();
    return;
  }

  const amountInput =
    document.getElementById(
      "finalAmount"
    );

  const finalAmount =
    Number(
      amountInput?.value
    );

  if (
    !Number.isFinite(
      finalAmount
    ) ||
    finalAmount < 0
  ) {
    showToast(
      "Enter a valid final amount"
    );
    return;
  }

  const loserButton =
    document.querySelector(
      ".loser-option.selected"
    );

  const loser =
    loserButton
      ? loserButton.dataset
          .loser
      : "";

  if (!loser) {
    showToast(
      "Select who lost"
    );
    return;
  }

  const button =
    document.getElementById(
      "finishGameBtn"
    );

  button.disabled =
    true;

  button.textContent =
    "Saving...";

  try {
    const now =
      new Date();

    const players =
      normalizePlayers(
        game.players
      );

    const startDate =
      new Date(
        game.started_at
      );

    const duration =
      getDurationMinutes(
        game.started_at
      );

    const calculated =
      calculateAmount(
        game.table_number,
        duration,
        players.length,
        game.custom_rate
      );

    const gameDate =
      formatDateForDB(
        startDate
      );

    const startTime =
      startDate.toISOString();

    const endTime =
      now.toISOString();

    const {
      error: historyError
    } =
      await db
        .from(
          "game_history"
        )
        .insert({
          game_date:
            gameDate,
          start_time:
            startTime,
          end_time:
            endTime,
          table_number:
            game.table_number,
          player:
            players[0] ||
            "",
          players,
          player_count:
            players.length,
          loser,
          game:
            game.game ||
            "Snooker",
          calculated_amount:
            calculated,
          amount:
            finalAmount,
          payment:
            selectedPayment
        });

    if (historyError) {
      throw historyError;
    }

    const {
      error: deleteError
    } =
      await db
        .from(
          "active_games"
        )
        .delete()
        .eq(
          "id",
          game.id
        );

    if (deleteError) {
      throw deleteError;
    }

    closeModal();

    if (
      selectedPayment ===
      "Unpaid"
    ) {
      showToast(
        `Unpaid game saved · ${loser} owes ₹${finalAmount}`
      );
    } else {
      showToast(
        `Game completed · ₹${finalAmount}`
      );
    }

    await loadActiveGames();

  } catch (error) {
    console.error(
      "Finish game error:",
      error
    );

    button.disabled =
      false;

    button.textContent =
      "Complete Game";

    showToast(
      error.message ||
      "Could not complete game"
    );
  }
}

/* =========================================================
   LOGIN PROTECTION
   ========================================================= */

async function requireLoginForHistory() {
  const {
    data: { session }
  } =
    await db.auth.getSession();

  if (!session) {
    showLoginModal();
    return;
  }

  openHistoryModal();
}

async function requireLoginForUnpaid() {
  const {
    data: { session }
  } =
    await db.auth.getSession();

  if (!session) {
    showLoginModal();
    return;
  }

  openUnpaidModal();
}

/* =========================================================
   LOGIN MODAL
   ========================================================= */

function showLoginModal() {
  modal.dataset.loginRequired =
    "true";

  modal.innerHTML = `
    <h2>Staff Login</h2>

    <div class="modal-sub">
      Login required to access
      Vantara Snooker Academy
    </div>

    <label class="form-label">
      Email
    </label>

    <input
      id="loginEmail"
      class="input"
      type="email"
      placeholder="Enter email"
      autocomplete="email"
    >

    <label class="form-label">
      Password
    </label>

    <input
      id="loginPassword"
      class="input"
      type="password"
      placeholder="Enter password"
      autocomplete="current-password"
    >

    <div class="modal-actions">

      <button
        type="button"
        class="btn btn-primary"
        id="loginBtn"
      >
        Login
      </button>

    </div>
  `;

  openModal();

  const emailInput =
    document.getElementById(
      "loginEmail"
    );

  const passwordInput =
    document.getElementById(
      "loginPassword"
    );

  const loginButton =
    document.getElementById(
      "loginBtn"
    );

  loginButton.addEventListener(
    "click",
    loginUser
  );

  passwordInput.addEventListener(
    "keydown",
    event => {
      if (
        event.key ===
        "Enter"
      ) {
        loginUser();
      }
    }
  );

  emailInput.focus();
}

/* =========================================================
   LOGIN USER
   ========================================================= */

async function loginUser() {
  const email =
    document
      .getElementById(
        "loginEmail"
      )
      .value
      .trim();

  const password =
    document
      .getElementById(
        "loginPassword"
      )
      .value;

  if (
    !email ||
    !password
  ) {
    showToast(
      "Enter email and password"
    );
    return;
  }

  const button =
    document.getElementById(
      "loginBtn"
    );

  button.disabled =
    true;

  button.textContent =
    "Logging in...";

  try {
    const {
      data,
      error
    } =
      await db.auth
        .signInWithPassword({
          email,
          password
        });

    if (error) {
      throw error;
    }

    if (!data.session) {
      throw new Error(
        "Login succeeded but no session was created"
      );
    }

    await initializeApp();

    modal.dataset.loginRequired =
      "false";

    closeModal();

    renderTables();
    await loadActiveGames();

    showToast(
      "Login successful"
    );

  } catch (error) {
    console.error(
      "Login error:",
      error
    );

    button.disabled =
      false;

    button.textContent =
      "Login";

    showToast(
      error.message ||
      "Login failed"
    );
  }
}

/* =========================================================
   HISTORY MODAL
   ========================================================= */

async function openHistoryModal() {
  modal.dataset.loginRequired =
    "false";

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

      <button
        class="btn btn-primary"
        id="loadHistoryBtn"
      >
        Load
      </button>

    </div>

    <label class="form-label">
      Search Anything
    </label>

    <input
      id="historySearch"
      class="input"
      type="text"
      placeholder="Name, loser, table, game, payment, amount..."
    >

    <div
      id="historyContent"
      class="empty"
    >
      Loading history...
    </div>
  `;

  openModal();

  document
    .getElementById(
      "loadHistoryBtn"
    )
    .addEventListener(
      "click",
      () => {
        const date =
          document
            .getElementById(
              "historyDate"
            )
            .value;

        loadHistory(date);
      }
    );

  document
    .getElementById(
      "historySearch"
    )
    .addEventListener(
      "input",
      () => {
        filterHistoryDisplay();
      }
    );

  await loadHistory(
    getTodayDate()
  );
}

/* =========================================================
   LOAD HISTORY
   ========================================================= */

let currentHistoryRecords =
  [];

let currentHistoryDate =
  "";

async function loadHistory(
  date
) {
  const content =
    document.getElementById(
      "historyContent"
    );

  if (!content) return;

  content.innerHTML =
    `
      <div class="empty">
        Loading...
      </div>
    `;

  try {
    const {
      data,
      error
    } =
      await db
        .from(
          "game_history"
        )
        .select("*")
        .eq(
          "game_date",
          date
        )
        .order(
          "created_at",
          {
            ascending: false
          }
        );

    if (error) {
      throw error;
    }

    currentHistoryRecords =
      data || [];

    currentHistoryDate =
      date;

    renderHistory(
      currentHistoryRecords,
      content,
      date
    );

  } catch (error) {
    console.error(
      "History error:",
      error
    );

    content.innerHTML =
      `
        <div class="empty">
          Could not load history.
        </div>
      `;
  }
}

/* =========================================================
   FILTER HISTORY
   ========================================================= */

function filterHistoryDisplay() {
  const search =
    document
      .getElementById(
        "historySearch"
      )
      ?.value
      .trim()
      .toLowerCase();

  if (!search) {
    const content =
      document.getElementById(
        "historyContent"
      );

    renderHistory(
      currentHistoryRecords,
      content,
      currentHistoryDate
    );

    return;
  }

  const filtered =
    currentHistoryRecords.filter(
      record => {
        const searchable =
          [
            record.game_date,
            record.start_time,
            record.end_time,
            record.table_number,
            record.game,
            record.player,
            record.loser,
            record.payment,
            record.amount,
            record.calculated_amount,
            record.player_count,
            normalizePlayers(
              record.players
            ).join(" ")
          ]
            .join(" ")
            .toLowerCase();

        return searchable.includes(
          search
        );
      }
    );

  const content =
    document.getElementById(
      "historyContent"
    );

  renderHistory(
    filtered,
    content,
    currentHistoryDate
  );
}

/* =========================================================
   RENDER HISTORY
   ========================================================= */

function renderHistory(
  records,
  container,
  date
) {
  const total =
    records.reduce(
      (
        sum,
        record
      ) =>
        sum +
        Number(
          record.amount ||
          0
        ),
      0
    );

  const games =
    records.length;

  const cash =
    records
      .filter(
        record =>
          String(
            record.payment
          ).toLowerCase() ===
          "cash"
      )
      .reduce(
        (
          sum,
          record
        ) =>
          sum +
          Number(
            record.amount ||
            0
          ),
        0
      );

  const online =
    records
      .filter(
        record =>
          String(
            record.payment
          ).toLowerCase() ===
          "online"
      )
      .reduce(
        (
          sum,
          record
        ) =>
          sum +
          Number(
            record.amount ||
            0
          ),
        0
      );

  const unpaid =
    records
      .filter(
        record =>
          String(
            record.payment
          ).toLowerCase() ===
          "unpaid"
      )
      .reduce(
        (
          sum,
          record
        ) =>
          sum +
          Number(
            record.amount ||
            0
          ),
        0
      );

  if (
    records.length ===
    0
  ) {
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
          <span>Unpaid</span>
          <strong>₹0</strong>
        </div>

        <div class="stat-card">
          <span>Online</span>
          <strong>₹0</strong>
        </div>

      </div>

      <div class="empty">
        No games found for
        ${escapeHTML(
          date
        )}.
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
        <strong>₹${cash + online}</strong>
      </div>

      <div class="stat-card">
        <span>Unpaid</span>
        <strong>₹${unpaid}</strong>
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
            <th>Loser</th>
            <th>Duration</th>
            <th>Amount</th>
            <th>Payment</th>
          </tr>
        </thead>

        <tbody>

          ${records.map(
            record => {
              const players =
                normalizePlayers(
                  record.players
                );

              const duration =
                calculateRecordDuration(
                  record
                );

              const isUnpaid =
                String(
                  record.payment
                ).toLowerCase() ===
                "unpaid";

              return `
                <tr>

                  <td>
                    ${formatTimeDisplay(
                      record.start_time
                    )}
                  </td>

                  <td>
                    Table
                    ${escapeHTML(
                      record.table_number
                    )}
                  </td>

                  <td>
                    ${escapeHTML(
                      record.game ||
                      ""
                    )}
                  </td>

                  <td>
                    ${escapeHTML(
                      players.join(
                        ", "
                      )
                    )}
                  </td>

                  <td>
                    <strong
                      style="
                        color:${
                          record.loser
                            ? "#e36d6d"
                            : "inherit"
                        };
                      "
                    >
                      ${escapeHTML(
                        record.loser ||
                        "-"
                      )}
                    </strong>
                  </td>

                  <td>
                    ${duration}
                  </td>

                  <td>
                    ₹${Number(
                      record.amount ||
                      0
                    )}
                  </td>

                  <td>
                    ${
                      isUnpaid
                        ? `
                          <button
                            type="button"
                            class="pay-option"
                            style="
                              color:#e36d6d;
                              border-color:#e36d6d;
                            "
                            data-record-id="${
                              record.id
                            }"
                            onclick="markGamePaid('${escapeAttribute(
                              record.id
                            )}')"
                          >
                            UNPAID · MARK PAID
                          </button>
                        `
                        : escapeHTML(
                            record.payment ||
                            ""
                          )
                    }
                  </td>

                </tr>
              `;
            }
          ).join("")}

        </tbody>

      </table>

    </div>

    <div class="report-actions">

      <button
        class="btn btn-secondary"
        id="closeHistoryBtn"
      >
        Close
      </button>

      <button
        class="btn btn-primary"
        id="exportHistoryBtn"
      >
        Export CSV
      </button>

    </div>
  `;

  document
    .getElementById(
      "closeHistoryBtn"
    )
    .addEventListener(
      "click",
      closeModal
    );

  document
    .getElementById(
      "exportHistoryBtn"
    )
    .addEventListener(
      "click",
      () =>
        exportCSV(
          records,
          date
        )
    );
}

/* =========================================================
   UNPAID MODAL
   ========================================================= */

async function openUnpaidModal() {
  modal.dataset.loginRequired =
    "false";

  modal.innerHTML = `
    <h2>Unpaid Games</h2>

    <div class="modal-sub">
      Games that are still waiting for payment
    </div>

    <label class="form-label">
      Search Anything
    </label>

    <input
      id="unpaidSearch"
      class="input"
      type="text"
      placeholder="Loser, player, game, table, amount..."
    >

    <div
      id="unpaidContent"
      class="empty"
    >
      Loading unpaid games...
    </div>
  `;

  openModal();

  document
    .getElementById(
      "unpaidSearch"
    )
    .addEventListener(
      "input",
      () => {
        filterUnpaidGames();
      }
    );

  await loadUnpaidGames();
}

/* =========================================================
   LOAD UNPAID
   ========================================================= */

let unpaidRecords =
  [];

async function loadUnpaidGames() {
  const content =
    document.getElementById(
      "unpaidContent"
    );

  if (!content) return;

  content.innerHTML =
    `
      <div class="empty">
        Loading...
      </div>
    `;

  try {
    const {
      data,
      error
    } =
      await db
        .from(
          "game_history"
        )
        .select("*")
        .eq(
          "payment",
          "Unpaid"
        )
        .order(
          "created_at",
          {
            ascending: false
          }
        );

    if (error) {
      throw error;
    }

    unpaidRecords =
      data || [];

    renderUnpaidGames(
      unpaidRecords
    );

  } catch (error) {
    console.error(
      "Unpaid games error:",
      error
    );

    content.innerHTML =
      `
        <div class="empty">
          Could not load unpaid games.
        </div>
      `;
  }
}

/* =========================================================
   FILTER UNPAID
   ========================================================= */

function filterUnpaidGames() {
  const search =
    document
      .getElementById(
        "unpaidSearch"
      )
      ?.value
      .trim()
      .toLowerCase();

  if (!search) {
    renderUnpaidGames(
      unpaidRecords
    );
    return;
  }

  const filtered =
    unpaidRecords.filter(
      record => {
        const searchable =
          [
            record.game_date,
            record.start_time,
            record.end_time,
            record.table_number,
            record.game,
            record.player,
            record.loser,
            record.payment,
            record.amount,
            record.calculated_amount,
            record.player_count,
            normalizePlayers(
              record.players
            ).join(" ")
          ]
            .join(" ")
            .toLowerCase();

        return searchable.includes(
          search
        );
      }
    );

  renderUnpaidGames(
    filtered
  );
}

/* =========================================================
   RENDER UNPAID
   ========================================================= */

function renderUnpaidGames(
  records
) {
  const content =
    document.getElementById(
      "unpaidContent"
    );

  if (!content) return;

  const total =
    records.reduce(
      (
        sum,
        record
      ) =>
        sum +
        Number(
          record.amount ||
          0
        ),
      0
    );

  if (
    records.length ===
    0
  ) {
    content.innerHTML = `
      <div class="history-summary">

        <div class="stat-card">
          <span>UNPAID GAMES</span>
          <strong>0</strong>
        </div>

        <div class="stat-card">
          <span>OUTSTANDING</span>
          <strong>₹0</strong>
        </div>

      </div>

      <div class="empty">
        No unpaid games found.
      </div>

      <div class="report-actions">
        <button
          class="btn btn-secondary"
          id="closeUnpaidBtn"
        >
          Close
        </button>
      </div>
    `;

    document
      .getElementById(
        "closeUnpaidBtn"
      )
      .addEventListener(
        "click",
        closeModal
      );

    return;
  }

  content.innerHTML = `
    <div class="history-summary">

      <div class="stat-card">
        <span>UNPAID GAMES</span>
        <strong>
          ${records.length}
        </strong>
      </div>

      <div class="stat-card">
        <span>OUTSTANDING</span>
        <strong>
          ₹${total}
        </strong>
      </div>

    </div>

    <div class="history-wrap">

      <table class="history-table">

        <thead>
          <tr>
            <th>Date</th>
            <th>Table</th>
            <th>Game</th>
            <th>Players</th>
            <th>Loser / Payer</th>
            <th>Amount</th>
            <th>Status</th>
          </tr>
        </thead>

        <tbody>

          ${records.map(
            record => `
              <tr>

                <td>
                  ${escapeHTML(
                    record.game_date ||
                    ""
                  )}
                </td>

                <td>
                  Table
                  ${escapeHTML(
                    record.table_number
                  )}
                </td>

                <td>
                  ${escapeHTML(
                    record.game ||
                    ""
                  )}
                </td>

                <td>
                  ${escapeHTML(
                    normalizePlayers(
                      record.players
                    ).join(
                      ", "
                    )
                  )}
                </td>

                <td>
                  <strong
                    style="
                      color:#e36d6d;
                    "
                  >
                    ${escapeHTML(
                      record.loser ||
                      record.player ||
                      "-"
                    )}
                  </strong>
                </td>

                <td>
                  ₹${Number(
                    record.amount ||
                    0
                  )}
                </td>

                <td>
                  <button
                    type="button"
                    class="pay-option"
                    style="
                      color:#e36d6d;
                      border-color:#e36d6d;
                    "
                    onclick="markGamePaid('${escapeAttribute(
                      record.id
                    )}')"
                  >
                    MARK PAID
                  </button>
                </td>

              </tr>
            `
          ).join("")}

        </tbody>

      </table>

    </div>

    <div class="report-actions">

      <button
        class="btn btn-secondary"
        id="closeUnpaidBtn"
      >
        Close
      </button>

    </div>
  `;

  document
    .getElementById(
      "closeUnpaidBtn"
    )
    .addEventListener(
      "click",
      closeModal
    );
}

/* =========================================================
   MARK GAME PAID
   ========================================================= */

async function markGamePaid(
  recordId
) {
  if (!recordId) {
    return;
  }

  const {
    data: { session }
  } =
    await db.auth.getSession();

  if (!session) {
    showLoginModal();
    return;
  }

  const paidType =
    window.prompt(
      "Enter payment method: Cash or Online",
      "Cash"
    );

  if (!paidType) {
    return;
  }

  const normalized =
    paidType
      .trim()
      .toLowerCase();

  let payment = "";

  if (
    normalized ===
    "cash"
  ) {
    payment = "Cash";
  } else if (
    normalized ===
    "online"
  ) {
    payment = "Online";
  } else {
    showToast(
      "Use Cash or Online"
    );
    return;
  }

  try {
    const {
      error
    } =
      await db
        .from(
          "game_history"
        )
        .update({
          payment
        })
        .eq(
          "id",
          recordId
        );

    if (error) {
      throw error;
    }

    showToast(
      "Payment marked as paid"
    );

    await loadUnpaidGames();

    if (
      document.getElementById(
        "historyContent"
      )
    ) {
      await loadHistory(
        currentHistoryDate
      );
    }

    await updateStats();

  } catch (error) {
    console.error(
      "Mark paid error:",
      error
    );

    showToast(
      error.message ||
      "Could not update payment"
    );
  }
}

/* =========================================================
   RECORD DURATION
   ========================================================= */

function calculateRecordDuration(
  record
) {
  if (
    !record.start_time ||
    !record.end_time
  ) {
    return "-";
  }

  const start =
    new Date(
      record.start_time
    );

  const end =
    new Date(
      record.end_time
    );

  if (
    Number.isNaN(
      start.getTime()
    ) ||
    Number.isNaN(
      end.getTime()
    )
  ) {
    return "-";
  }

  let difference =
    Math.floor(
      (
        end.getTime() -
        start.getTime()
      ) /
      60000
    );

  if (
    difference < 0
  ) {
    difference +=
      24 * 60;
  }

  return formatDuration(
    difference
  );
}

/* =========================================================
   STATS
   ========================================================= */

async function updateStats() {
  const playing =
    activeGames.length;

  const available =
    TOTAL_TABLES -
    playing;

  availableCount.textContent =
    available;

  playingCount.textContent =
    playing;

  try {
    const today =
      getTodayDate();

    const {
      data,
      error
    } =
      await db
        .from(
          "game_history"
        )
        .select(
          "amount,payment"
        )
        .eq(
          "game_date",
          today
        );

    if (error) {
      throw error;
    }

    const paidRecords =
      (
        data || []
      ).filter(
        row =>
          String(
            row.payment
          ).toLowerCase() !==
          "unpaid"
      );

    const total =
      paidRecords.reduce(
        (
          sum,
          row
        ) =>
          sum +
          Number(
            row.amount ||
            0
          ),
        0
      );

    gamesCount.textContent =
      data?.length ||
      0;

    collection.textContent =
      `₹${total}`;

  } catch (error) {
    console.error(
      "Stats error:",
      error
    );

    gamesCount.textContent =
      "0";

    collection.textContent =
      "₹0";
  }
}

/* =========================================================
   MODAL
   ========================================================= */

function openModal() {
  modalBackdrop.classList.add(
    "open"
  );
}

function closeModal() {
  if (
    modal.dataset.loginRequired ===
    "true"
  ) {
    return;
  }

  modalBackdrop.classList.remove(
    "open"
  );
}

/* =========================================================
   TOAST
   ========================================================= */

let toastTimer =
  null;

function showToast(
  message
) {
  toast.textContent =
    message;

  toast.classList.add(
    "show"
  );

  clearTimeout(
    toastTimer
  );

  toastTimer =
    setTimeout(
      () => {
        toast.classList.remove(
          "show"
        );
      },
      3000
    );
}

/* =========================================================
   TIME HELPERS
   ========================================================= */

function getElapsedTime(
  startedAt
) {
  const minutes =
    getDurationMinutes(
      startedAt
    );

  return formatDuration(
    minutes
  );
}

function getDurationMinutes(
  startedAt
) {
  const start =
    new Date(
      startedAt
    );

  const now =
    new Date();

  const milliseconds =
    now.getTime() -
    start.getTime();

  return Math.max(
    0,
    Math.floor(
      milliseconds /
      60000
    )
  );
}

function formatDuration(
  minutes
) {
  minutes =
    Math.max(
      0,
      Math.floor(
        Number(
          minutes
        ) || 0
      )
    );

  const hours =
    Math.floor(
      minutes /
      60
    );

  const mins =
    minutes %
    60;

  if (
    hours > 0
  ) {
    return `${hours}h ${String(
      mins
    ).padStart(
      2,
      "0"
    )}m`;
  }

  return `${mins}m`;
}

/* =========================================================
   DATE / TIME
   ========================================================= */

function getTodayDate() {
  const now =
    new Date();

  const indiaDate =
    new Intl.DateTimeFormat(
      "en-CA",
      {
        timeZone:
          "Asia/Kolkata",
        year:
          "numeric",
        month:
          "2-digit",
        day:
          "2-digit"
      }
    ).format(
      now
    );

  return indiaDate;
}

function formatDateForDB(
  date
) {
  const parts =
    new Intl.DateTimeFormat(
      "en-CA",
      {
        timeZone:
          "Asia/Kolkata",
        year:
          "numeric",
        month:
          "2-digit",
        day:
          "2-digit"
      }
    ).formatToParts(
      date
    );

  const year =
    parts.find(
      p =>
        p.type ===
        "year"
    )?.value;

  const month =
    parts.find(
      p =>
        p.type ===
        "month"
    )?.value;

  const day =
    parts.find(
      p =>
        p.type ===
        "day"
    )?.value;

  return `${year}-${month}-${day}`;
}

function formatTimeForDB(
  date
) {
  return [
    String(
      date.getHours()
    ).padStart(
      2,
      "0"
    ),
    String(
      date.getMinutes()
    ).padStart(
      2,
      "0"
    ),
    String(
      date.getSeconds()
    ).padStart(
      2,
      "0"
    )
  ].join(":");
}

function formatTimeDisplay(
  value
) {
  if (!value) {
    return "-";
  }

  const date =
    new Date(
      value
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    const parts =
      String(value)
        .split(":");

    if (
      parts.length < 2
    ) {
      return value;
    }

    const hours =
      Number(
        parts[0]
      );

    const minutes =
      parts[1];

    const suffix =
      hours >= 12
        ? "PM"
        : "AM";

    const displayHour =
      hours % 12 ||
      12;

    return `${displayHour}:${minutes} ${suffix}`;
  }

  return date.toLocaleTimeString(
    "en-IN",
    {
      timeZone:
        "Asia/Kolkata",
      hour:
        "numeric",
      minute:
        "2-digit",
      hour12:
        true
    }
  );
}

function parseTimeToMinutes(
  value
) {
  if (!value) {
    return null;
  }

  const parts =
    String(value)
      .split(":");

  if (
    parts.length < 2
  ) {
    return null;
  }

  const hours =
    Number(
      parts[0]
    );

  const minutes =
    Number(
      parts[1]
    );

  if (
    !Number.isFinite(
      hours
    ) ||
    !Number.isFinite(
      minutes
    )
  ) {
    return null;
  }

  return (
    hours * 60 +
    minutes
  );
}

/* =========================================================
   NORMALIZE PLAYERS
   ========================================================= */

function normalizePlayers(
  players
) {
  if (
    Array.isArray(
      players
    )
  ) {
    return players
      .map(
        player =>
          String(
            player ||
            ""
          ).trim()
      )
      .filter(
        Boolean
      );
  }

  if (
    typeof players ===
    "string"
  ) {
    try {
      const parsed =
        JSON.parse(
          players
        );

      if (
        Array.isArray(
          parsed
        )
      ) {
        return normalizePlayers(
          parsed
        );
      }
    } catch {
      return players
        .split(",")
        .map(
          player =>
            player.trim()
        )
        .filter(
          Boolean
        );
    }
  }

  return [];
}

/* =========================================================
   CSV EXPORT
   ========================================================= */

function exportCSV(
  records,
  date
) {
  const headers = [
    "Date",
    "Start Time",
    "End Time",
    "Table",
    "Game",
    "Players",
    "Loser",
    "Player Count",
    "Amount",
    "Calculated Amount",
    "Payment"
  ];

  const rows =
    records.map(
      record => [
        date,
        record.start_time ||
          "",
        record.end_time ||
          "",
        record.table_number ||
          "",
        record.game ||
          "",
        normalizePlayers(
          record.players
        ).join(
          " | "
        ),
        record.loser ||
          "",
        record.player_count ||
          "",
        record.amount ||
          0,
        record.calculated_amount ||
          0,
        record.payment ||
          ""
      ]
    );

  const csv = [
    headers,
    ...rows
  ]
    .map(
      row =>
        row
          .map(
            value =>
              `"${String(
                value
              ).replace(
                /"/g,
                '""'
              )}"`
          )
          .join(",")
    )
    .join("\n");

  const blob =
    new Blob(
      [csv],
      {
        type:
          "text/csv;charset=utf-8;"
      }
    );

  const url =
    URL.createObjectURL(
      blob
    );

  const link =
    document.createElement(
      "a"
    );

  link.href =
    url;

  link.download =
    `vantara-history-${date}.csv`;

  document.body.appendChild(
    link
  );

  link.click();

  link.remove();

  URL.revokeObjectURL(
    url
  );

  showToast(
    "CSV exported"
  );
}

/* =========================================================
   SECURITY / HTML HELPERS
   ========================================================= */

function escapeHTML(
  value
) {
  return String(
    value ??
    ""
  )
    .replace(
      /&/g,
      "&amp;"
    )
    .replace(
      /</g,
      "&lt;"
    )
    .replace(
      />/g,
      "&gt;"
    )
    .replace(
      /"/g,
      "&quot;"
    )
    .replace(
      /'/g,
      "&#039;"
    );
}

function escapeAttribute(
  value
) {
  return escapeHTML(
    value
  );
}

/* =========================================================
   AUTO REFRESH
   ========================================================= */

setInterval(
  () => {
    if (
      !appInitialized
    ) {
      return;
    }

    updateStats();

  },
  30000
);
