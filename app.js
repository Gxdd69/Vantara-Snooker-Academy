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

const SESSION_PREFIX = "__VANTARA_SESSION__";

/* =========================================================
   STATE
========================================================= */

let activeGames = [];

let selectedTable = null;
let selectedGame = "Snooker";
let selectedPayment = "Cash";

let playerList = [""];

let appInitialized = false;
let realtimeChannel = null;

/* =========================================================
   DOM
========================================================= */

const floorGrid =
  document.getElementById("floorGrid");

const availableCount =
  document.getElementById("availableCount");

const playingCount =
  document.getElementById("playingCount");

const gamesCount =
  document.getElementById("gamesCount");

const collection =
  document.getElementById("collection");

const modalBackdrop =
  document.getElementById("modalBackdrop");

const modal =
  document.getElementById("modal");

const toast =
  document.getElementById("toast");

const historyBtn =
  document.getElementById("historyBtn");

const connectionStatus =
  document.getElementById("connectionStatus");

const clock =
  document.getElementById("clock");

/* =========================================================
   INITIALIZATION
========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  async () => {

    startClock();
    setupEvents();

    const {
      data: { session },
      error
    } = await db.auth.getSession();

    if (error) {
      console.error(
        "Session error:",
        error
      );

      showLoginModal();
      return;
    }

    if (!session) {
      showLoginModal();
      return;
    }

    await initializeApp();

    setupAuthListener();
  }
);

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
   AUTH LISTENER
========================================================= */

function setupAuthListener() {

  db.auth.onAuthStateChange(
    async (
      event,
      session
    ) => {

      console.log(
        "Auth event:",
        event
      );

      if (
        event ===
          "SIGNED_IN" &&
        session
      ) {

        await initializeApp();

        if (
          modalBackdrop.classList.contains(
            "open"
          )
        ) {
          modal.dataset.loginRequired =
            "false";

          closeModal();
        }

        renderTables();

        await loadActiveGames();

        showToast(
          "Login successful"
        );
      }

      if (
        event ===
        "SIGNED_OUT"
      ) {

        lockApplication();
      }
    }
  );
}

/* =========================================================
   APPLICATION LOCK
========================================================= */

function lockApplication() {

  appInitialized = false;

  activeGames = [];

  if (realtimeChannel) {

    db.removeChannel(
      realtimeChannel
    );

    realtimeChannel = null;
  }

  floorGrid.innerHTML = "";

  availableCount.textContent =
    "0";

  playingCount.textContent =
    "0";

  gamesCount.textContent =
    "0";

  collection.textContent =
    "₹0";

  setConnection(
    false,
    "Login required"
  );

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

      if (
        event.target !==
        modalBackdrop
      ) {
        return;
      }

      if (
        modal.dataset.loginRequired ===
        "true"
      ) {
        return;
      }

      closeModal();
    }
  );

  document.addEventListener(
    "keydown",
    event => {

      if (
        event.key !==
        "Escape"
      ) {
        return;
      }

      if (
        modal.dataset.loginRequired ===
        "true"
      ) {
        return;
      }

      closeModal();
    }
  );
}

/* =========================================================
   CLOCK
========================================================= */

function startClock() {

  function updateClock() {

    const now =
      new Date();

    clock.textContent =
      now.toLocaleTimeString(
        "en-IN",
        {
          hour12: false,
          timeZone:
            "Asia/Kolkata"
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
      (
        text ||
        "Connected"
      );

  } else {

    connectionStatus.classList.add(
      "offline"
    );

    connectionStatus.innerHTML =
      "<span></span> " +
      (
        text ||
        "Offline"
      );
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

    if (error) {
      throw error;
    }

    activeGames =
      data || [];

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
          table:
            "active_games"
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
      Number(
        tableNumber
      )
  );
}

function getTableRate(
  tableNumber
) {

  return (
    TABLE_RATES[
      Number(
        tableNumber
      )
    ] || 0
  );
}

/* =========================================================
   SESSION DATA
========================================================= */

function isSessionGame(
  game
) {

  if (!game) return false;

  return String(
    game.game || ""
  ).startsWith(
    SESSION_PREFIX
  );
}

function getSessionData(
  game
) {

  if (
    !isSessionGame(game)
  ) {

    return {
      currentGame:
        game?.game ||
        "Snooker",

      games: [
        {
          game:
            game?.game ||
            "Snooker",

          started_at:
            game?.started_at ||
            new Date().toISOString(),

          ended_at:
            null,

          amount:
            0
        }
      ],

      accumulatedAmount:
        0,

      originalStartedAt:
        game?.started_at ||
        new Date().toISOString()
    };
  }

  try {

    const raw =
      String(
        game.game
      ).substring(
        SESSION_PREFIX.length
      );

    const parsed =
      JSON.parse(raw);

    return {
      currentGame:
        parsed.currentGame ||
        "Snooker",

      games:
        Array.isArray(
          parsed.games
        )
          ? parsed.games
          : [],

      accumulatedAmount:
        Number(
          parsed.accumulatedAmount ||
          0
        ),

      originalStartedAt:
        parsed.originalStartedAt ||
        game.started_at
    };

  } catch (error) {

    console.error(
      "Session parse error:",
      error
    );

    return {
      currentGame:
        "Snooker",

      games: [],

      accumulatedAmount:
        0,

      originalStartedAt:
        game.started_at
    };
  }
}

function encodeSessionData(
  data
) {

  return (
    SESSION_PREFIX +
    JSON.stringify({
      currentGame:
        data.currentGame,

      games:
        data.games,

      accumulatedAmount:
        Number(
          data.accumulatedAmount ||
          0
        ),

      originalStartedAt:
        data.originalStartedAt
    })
  );
}

/* =========================================================
   RENDER TABLES
========================================================= */

function renderTables() {

  floorGrid.innerHTML = "";

  for (
    let tableNumber = 1;
    tableNumber <=
    TOTAL_TABLES;
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
    () => {

      openStartGameModal(
        tableNumber
      );
    }
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

  const session =
    getSessionData(game);

  const elapsed =
    getElapsedTime(
      session.originalStartedAt ||
      game.started_at
    );

  const gameName =
    session.currentGame ||
    game.game ||
    "Snooker";

  const gameCount =
    Math.max(
      1,
      session.games.length
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
          ${escapeHTML(
            firstPlayer
          )}
        </div>

      </div>

      <div class="playing-meta">

        <div class="game-mini">

          ${escapeHTML(
            gameName
          )}

          ${
            gameCount > 1
              ? ` · ${gameCount} games`
              : ""
          }

        </div>

        <div
          class="timer"
          data-start="${escapeAttribute(
            session.originalStartedAt ||
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
    () => {

      openEndGameModal(
        game
      );
    }
  );

  return card;
}

/* =========================================================
   TIMER REFRESH
========================================================= */

setInterval(
  () => {

    document
      .querySelectorAll(
        ".timer[data-start]"
      )
      .forEach(
        timer => {

          timer.textContent =
            getElapsedTime(
              timer.dataset.start
            );
        }
      );

  },
  1000
);

/* =========================================================
   START GAME
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
   START MODAL
========================================================= */

function renderStartModal() {

  const rate =
    getTableRate(
      selectedTable
    );

  modal.dataset.loginRequired =
    "false";

  modal.innerHTML = `

    <h2>
      Start Game
    </h2>

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
              game ===
              selectedGame
                ? "selected"
                : ""
            }"
            data-game="${escapeAttribute(
              game
            )}"
          >

            ${escapeHTML(
              game
            )}

          </button>
        `
      ).join("")}

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

    <label class="form-label">
      Table Price / Hour
    </label>

    <div class="amount-input-wrap">

      <span class="amount-symbol">
        ₹
      </span>

      <input
        id="startPrice"
        class="input amount-input"
        type="number"
        min="0"
        step="1"
        value="${rate}"
      >

    </div>

    <div class="bill">

      <div class="bill-line">

        <span>
          Table rate
        </span>

        <b id="startRatePreview">
          ₹${rate}/hr
        </b>

      </div>

      <div class="bill-line">

        <span>
          Players
        </span>

        <b id="playerCountPreview">
          ${playerList.length}
        </b>

      </div>

      <div class="bill-line">

        <span>
          Extra player charge
        </span>

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
    .forEach(
      button => {

        button.addEventListener(
          "click",
          () => {

            selectedGame =
              button.dataset.game;

            document
              .querySelectorAll(
                ".game-option"
              )
              .forEach(
                item =>
                  item.classList.remove(
                    "selected"
                  )
              );

            button.classList.add(
              "selected"
            );
          }
        );
      }
    );

  document
    .querySelectorAll(
      ".player-input"
    )
    .forEach(
      input => {

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
      }
    );

  document
    .querySelectorAll(
      ".remove-player"
    )
    .forEach(
      button => {

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
      }
    );

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

  const priceInput =
    document.getElementById(
      "startPrice"
    );

  if (priceInput) {

    priceInput.addEventListener(
      "input",
      () => {

        const preview =
          document.getElementById(
            "startRatePreview"
          );

        if (preview) {

          preview.textContent =
            `₹${
              Number(
                priceInput.value
              ) || 0
            }/hr`;
        }
      }
    );
  }

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
  } = await db.auth.getSession();

  if (!session) {

    showLoginModal();

    return;
  }

  const inputs =
    document.querySelectorAll(
      ".player-input"
    );

  inputs.forEach(
    input => {

      playerList[
        Number(
          input.dataset.index
        )
      ] =
        input.value.trim();
    }
  );

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

  const priceInput =
    document.getElementById(
      "startPrice"
    );

  const customRate =
    Number(
      priceInput?.value
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

    const startedAt =
      new Date().toISOString();

    const {
      error
    } = await db
      .from(
        "active_games"
      )
      .insert({

        table_number:
          selectedTable,

        game:
          selectedGame,

        players,

        started_at:
          startedAt,

        custom_rate:
          customRate

      });

    if (error) {

      /*
        If custom_rate doesn't exist
        in the existing database,
        retry using the old schema.
      */

      if (
        String(
          error.message || ""
        ).includes(
          "custom_rate"
        )
      ) {

        const retry =
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

              started_at:
                startedAt
            });

        if (retry.error) {
          throw retry.error;
        }

      } else {

        throw error;
      }
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

  renderEndModal(
    game
  );

  openModal();
}

/* =========================================================
   END MODAL
========================================================= */

function renderEndModal(
  game
) {

  const players =
    normalizePlayers(
      game.players
    );

  const session =
    getSessionData(
      game
    );

  const currentGame =
    session.currentGame ||
    game.game ||
    "Snooker";

  const currentDuration =
    getDurationMinutes(
      game.started_at
    );

  const customRate =
    getCustomRate(
      game
    );

  const currentCalculated =
    calculateAmountWithRate(
      customRate,
      currentDuration,
      players.length
    );

  const previousTotal =
    Number(
      session.accumulatedAmount ||
      0
    );

  const combined =
    previousTotal +
    currentCalculated;

  modal.dataset.loginRequired =
    "false";

  modal.innerHTML = `

    <h2>
      Finish Game
    </h2>

    <div class="modal-sub">

      Table ${game.table_number}
      ·
      ${escapeHTML(
        currentGame
      )}

      ${
        session.games.length > 1
          ? `
            ·
            Game ${session.games.length}
          `
          : ""
      }

    </div>

    <div class="bill">

      <div class="bill-line">

        <span>
          Players
        </span>

        <b>
          ${players.length}
        </b>

      </div>

      <div class="bill-line">

        <span>
          Current duration
        </span>

        <b>
          ${formatDuration(
            currentDuration
          )}
        </b>

      </div>

      <div class="bill-line">

        <span>
          Table rate
        </span>

        <b>
          ₹${customRate}/hr
        </b>

      </div>

      <div class="bill-line">

        <span>
          Extra player charge
        </span>

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

      ${
        previousTotal > 0
          ? `

            <div class="bill-line">

              <span>
                Previous games total
              </span>

              <b>
                ₹${previousTotal}
              </b>

            </div>

          `
          : ""
      }

      <div class="bill-line bill-total">

        <span>
          Current total
        </span>

        <b>
          ₹${combined}
        </b>

      </div>

    </div>

    <label class="form-label">
      Who Lost?
    </label>

    <input
      id="loserName"
      class="input"
      type="text"
      placeholder="Enter loser's name manually"
    >

    <div class="loser-note">
      The loser is responsible for paying the bill.
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
        value="${combined}"
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
        Unpaid
      </button>

    </div>

    <div
      id="unpaidMobileWrap"
      style="display:none;"
    >

      <label class="form-label">
        Mobile Number
        <span
          style="
            color:#777;
            font-weight:400;
          "
        >
          Optional
        </span>
      </label>

      <input
        id="unpaidMobile"
        class="input"
        type="tel"
        inputmode="numeric"
        placeholder="Enter mobile number"
        maxlength="15"
      >

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
        Continue Game
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
    game,
    currentCalculated,
    combined
  );
}

/* =========================================================
   END MODAL EVENTS
========================================================= */

function setupEndModalEvents(
  game,
  currentCalculated,
  combined
) {

  document
    .querySelectorAll(
      ".pay-option"
    )
    .forEach(
      button => {

        button.addEventListener(
          "click",
          () => {

            selectedPayment =
              button.dataset.payment;

            document
              .querySelectorAll(
                ".pay-option"
              )
              .forEach(
                item =>
                  item.classList.remove(
                    "selected"
                  )
              );

            button.classList.add(
              "selected"
            );

            const mobileWrap =
              document.getElementById(
                "unpaidMobileWrap"
              );

            if (
              selectedPayment ===
              "Unpaid"
            ) {

              mobileWrap.style.display =
                "block";

            } else {

              mobileWrap.style.display =
                "none";
            }
          }
        );
      }
    );

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
          game,
          currentCalculated
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
          game,
          currentCalculated,
          combined
        )
    );
}

/* =========================================================
   CONTINUE GAME
========================================================= */

async function continueGame(
  game,
  currentCalculated
) {

  const {
    data: { session }
  } = await db.auth.getSession();

  if (!session) {

    showLoginModal();

    return;
  }

  const players =
    normalizePlayers(
      game.players
    );

  const sessionData =
    getSessionData(
      game
    );

  const finalAmountInput =
    document.getElementById(
      "finalAmount"
    );

  const currentAmount =
    Number(
      finalAmountInput?.value
    );

  if (
    !Number.isFinite(
      currentAmount
    ) ||
    currentAmount < 0
  ) {

    showToast(
      "Enter a valid amount"
    );

    return;
  }

  /*
    Save the amount of the game
    before continuing.
  */

  sessionData.games.push({

    game:
      sessionData.currentGame ||
      game.game ||
      "Snooker",

    started_at:
      game.started_at,

    ended_at:
      new Date().toISOString(),

    amount:
      currentAmount,

    players:
      players
  });

  sessionData.accumulatedAmount +=
    currentAmount;

  /*
    Ask what the next game is.
  */

  openContinueSetupModal(
    game,
    sessionData
  );
}

/* =========================================================
   CONTINUE SETUP MODAL
========================================================= */

function openContinueSetupModal(
  game,
  sessionData
) {

  selectedGame =
    sessionData.currentGame ||
    "Snooker";

  playerList =
    normalizePlayers(
      game.players
    );

  if (
    playerList.length <
    2
  ) {
    playerList.push("");
  }

  modal.dataset.loginRequired =
    "false";

  modal.innerHTML = `

    <h2>
      Continue Game
    </h2>

    <div class="modal-sub">

      Previous games total:
      <strong
        style="color:var(--gold);"
      >
        ₹${sessionData.accumulatedAmount}
      </strong>

    </div>

    <label class="form-label">
      Next Game
    </label>

    <div class="game-options">

      ${GAME_TYPES.map(
        gameType => `

          <button
            type="button"
            class="game-option ${
              gameType ===
              selectedGame
                ? "selected"
                : ""
            }"
            data-game="${escapeAttribute(
              gameType
            )}"
          >

            ${escapeHTML(
              gameType
            )}

          </button>

        `
      ).join("")}

    </div>

    <label class="form-label">
      Players
    </label>

    <div id="continuePlayers">

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
      id="continueAddPlayer"
    >
      + Add Player
    </button>

    <div class="bill">

      <div class="bill-line">

        <span>
          Current players
        </span>

        <b>
          ${playerList.length}
        </b>

      </div>

      <div class="bill-line">

        <span>
          Previous total
        </span>

        <b>
          ₹${sessionData.accumulatedAmount}
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
        Start Next Game
      </button>

    </div>
  `;

  document
    .querySelectorAll(
      ".game-option"
    )
    .forEach(
      button => {

        button.addEventListener(
          "click",
          () => {

            selectedGame =
              button.dataset.game;

            document
              .querySelectorAll(
                ".game-option"
              )
              .forEach(
                item =>
                  item.classList.remove(
                    "selected"
                  )
              );

            button.classList.add(
              "selected"
            );
          }
        );
      }
    );

  document
    .querySelectorAll(
      ".player-input"
    )
    .forEach(
      input => {

        input.addEventListener(
          "input",
          () => {

            playerList[
              Number(
                input.dataset.index
              )
            ] =
              input.value;
          }
        );
      }
    );

  document
    .querySelectorAll(
      ".remove-player"
    )
    .forEach(
      button => {

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

            openContinueSetupModal(
              game,
              sessionData
            );
          }
        );
      }
    );

  document
    .getElementById(
      "continueAddPlayer"
    )
    .addEventListener(
      "click",
      () => {

        playerList.push("");

        openContinueSetupModal(
          game,
          sessionData
        );
      }
    );

  document
    .getElementById(
      "cancelContinue"
    )
    .addEventListener(
      "click",
      () => {

        renderEndModal(
          game
        );
      }
    );

  document
    .getElementById(
      "saveContinue"
    )
    .addEventListener(
      "click",
      () =>
        saveContinuedGame(
          game,
          sessionData
        )
    );
}

/* =========================================================
   SAVE CONTINUED GAME
========================================================= */

async function saveContinuedGame(
  game,
  sessionData
) {

  const inputs =
    document.querySelectorAll(
      ".player-input"
    );

  inputs.forEach(
    input => {

      playerList[
        Number(
          input.dataset.index
        )
      ] =
        input.value.trim();
    }
  );

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

  const button =
    document.getElementById(
      "saveContinue"
    );

  button.disabled =
    true;

  button.textContent =
    "Starting...";

  try {

    sessionData.currentGame =
      selectedGame;

    const encoded =
      encodeSessionData(
        sessionData
      );

    const {
      error
    } = await db
      .from(
        "active_games"
      )
      .update({

        game:
          encoded,

        players:
          players

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
      `${selectedGame} started`
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
      "Start Next Game";

    showToast(
      error.message ||
      "Could not continue game"
    );
  }
}

/* =========================================================
   FINISH GAME
========================================================= */

async function finishGame(
  game,
  calculated,
  combined
) {

  const {
    data: { session }
  } = await db.auth.getSession();

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
      amountInput.value
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

  const loserInput =
    document.getElementById(
      "loserName"
    );

  const loser =
    loserInput
      ? loserInput.value.trim()
      : "";

  if (!loser) {

    showToast(
      "Enter the loser's name"
    );

    return;
  }

  let mobile = "";

  if (
    selectedPayment ===
    "Unpaid"
  ) {

    mobile =
      (
        document.getElementById(
          "unpaidMobile"
        )?.value ||
        ""
      ).trim();
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

    const sessionData =
      getSessionData(
        game
      );

    /*
      Add current game to the
      session's game list.
    */

    sessionData.games.push({

      game:
        sessionData.currentGame ||
        game.game ||
        "Snooker",

      started_at:
        game.started_at,

      ended_at:
        now.toISOString(),

      amount:
        finalAmount,

      players:
        players

    });

    const gameDate =
      formatDateForDB(
        new Date(
          sessionData.originalStartedAt ||
          game.started_at
        )
      );

    const startTime =
      sessionData.originalStartedAt ||
      game.started_at;

    const endTime =
      now.toISOString();

    /*
      Store mobile alongside loser
      so this works without requiring
      a new Supabase column.

      Example:
      Rahul | Mobile: 9876543210
    */

    const loserStored =
      mobile
        ? `${loser} | Mobile: ${mobile}`
        : loser;

    /*
      History game name.
    */

    const gameNames =
      sessionData.games
        .map(
          item =>
            item.game
        )
        .filter(Boolean);

    const historyGame =
      [
        ...new Set(
          gameNames
        )
      ].join(
        " + "
      );

    const {
      error:
        historyError
    } = await db
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

        players:
          players,

        player_count:
          players.length,

        loser:
          loserStored,

        game:
          historyGame,

        calculated_amount:
          combined,

        amount:
          finalAmount,

        payment:
          selectedPayment

      });

    if (historyError) {
      throw historyError;
    }

    const {
      error:
        deleteError
    } = await db
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
        `Unpaid saved · ₹${finalAmount}`
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
   CUSTOM RATE
========================================================= */

function getCustomRate(
  game
) {

  if (
    game &&
    game.custom_rate !==
      undefined &&
    game.custom_rate !==
      null
  ) {

    const rate =
      Number(
        game.custom_rate
      );

    if (
      Number.isFinite(rate)
    ) {

      return rate;
    }
  }

  return getTableRate(
    game.table_number
  );
}

/* =========================================================
   AMOUNT CALCULATION
========================================================= */

function calculateAmount(
  tableNumber,
  durationMinutes,
  playerCount
) {

  return calculateAmountWithRate(
    getTableRate(
      tableNumber
    ),
    durationMinutes,
    playerCount
  );
}

function calculateAmountWithRate(
  rate,
  durationMinutes,
  playerCount
) {

  const numericRate =
    Number(rate) || 0;

  const billableHours =
    Math.max(
      1,
      Number(
        durationMinutes
      ) / 60
    );

  const baseAmount =
    numericRate *
    billableHours;

  const extraPlayers =
    Math.max(
      0,
      Number(
        playerCount
      ) - 2
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
   LOGIN PROTECTION
========================================================= */

async function requireLoginForHistory() {

  const {
    data: { session }
  } = await db.auth.getSession();

  if (!session) {

    showLoginModal();

    return;
  }

  openHistoryModal();
}

/* =========================================================
   LOGIN MODAL
========================================================= */

function showLoginModal() {

  modal.dataset.loginRequired =
    "true";

  modal.innerHTML = `

    <h2>
      Staff Login
    </h2>

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
    } = await db.auth
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

    <h2>
      Game History
    </h2>

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

        loadHistory(
          date
        );
      }
    );

  await loadHistory(
    getTodayDate()
  );
}

/* =========================================================
   LOAD HISTORY
========================================================= */

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
    } = await db
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

    renderHistory(
      data || [],
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

  container.innerHTML = `

    <div class="history-summary">

      <div class="stat-card">
        <span>Games</span>
        <strong>
          ${games}
        </strong>
      </div>

      <div class="stat-card">
        <span>Collection</span>
        <strong>
          ₹${total}
        </strong>
      </div>

      <div class="stat-card">
        <span>Cash</span>
        <strong>
          ₹${cash}
        </strong>
      </div>

      <div class="stat-card">
        <span>Online</span>
        <strong>
          ₹${online}
        </strong>
      </div>

    </div>

    ${
      unpaid > 0
        ? `

          <div class="bill">
            <div class="bill-line">

              <span>
                Unpaid
              </span>

              <b
                style="
                  color:var(--red);
                "
              >
                ₹${unpaid}
              </b>

            </div>
          </div>

        `
        : ""
    }

    <div class="history-wrap">

      <table class="history-table">

        <thead>

          <tr>

            <th>
              Time
            </th>

            <th>
              Table
            </th>

            <th>
              Game
            </th>

            <th>
              Players
            </th>

            <th>
              Loser
            </th>

            <th>
              Duration
            </th>

            <th>
              Amount
            </th>

            <th>
              Payment
            </th>

          </tr>

        </thead>

        <tbody>

          ${
            records.length
              ? records
                  .map(
                    record => {

                      const players =
                        normalizePlayers(
                          record.players
                        );

                      const duration =
                        calculateRecordDuration(
                          record
                        );

                      const payment =
                        String(
                          record.payment ||
                          ""
                        );

                      const isUnpaid =
                        payment.toLowerCase() ===
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

                          <td
                            ${
                              record.loser
                                ? `
                                  style="
                                    color:var(--red);
                                    font-weight:700;
                                  "
                                `
                                : ""
                            }
                          >
                            ${escapeHTML(
                              record.loser ||
                              "-"
                            )}
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

                          <td
                            ${
                              isUnpaid
                                ? `
                                  style="
                                    color:var(--red);
                                    font-weight:700;
                                  "
                                `
                                : ""
                            }
                          >
                            ${escapeHTML(
                              payment
                            )}
                          </td>

                        </tr>
                      `;
                    }
                  )
                  .join("")
              : `
                  <tr>
                    <td
                      colspan="8"
                      style="
                        text-align:center;
                        padding:30px;
                      "
                    >
                      No games found.
                    </td>
                  </tr>
                `
          }

        </tbody>

      </table>

    </div>

    <div class="report-actions">

      <button
        class="btn btn-secondary"
        id="unpaidHistoryBtn"
      >
        Unpaid History
      </button>

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

  document
    .getElementById(
      "unpaidHistoryBtn"
    )
    .addEventListener(
      "click",
      openUnpaidHistory
    );
}

/* =========================================================
   UNPAID HISTORY
========================================================= */

async function openUnpaidHistory() {

  modal.dataset.loginRequired =
    "false";

  modal.innerHTML = `

    <h2>
      Unpaid History
    </h2>

    <div class="modal-sub">
      Search unpaid games by any detail
    </div>

    <input
      id="unpaidSearch"
      class="input"
      type="text"
      placeholder="
        Search name, loser, mobile, table,
        game, amount...
      "
    >

    <div
      id="unpaidContent"
      class="empty"
    >
      Loading unpaid games...
    </div>

    <div class="modal-actions">

      <button
        type="button"
        class="btn btn-secondary"
        id="backHistoryBtn"
      >
        Back
      </button>

    </div>
  `;

  openModal();

  let records = [];

  try {

    const {
      data,
      error
    } = await db
      .from(
        "game_history"
      )
      .select("*")
      .ilike(
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

    records =
      data || [];

  } catch (error) {

    console.error(
      "Unpaid history error:",
      error
    );

    document.getElementById(
      "unpaidContent"
    ).innerHTML =
      `
        <div class="empty">
          Could not load unpaid history.
        </div>
      `;

    return;
  }

  const searchInput =
    document.getElementById(
      "unpaidSearch"
    );

  function renderUnpaidSearch(
    search = ""
  ) {

    const query =
      search
        .toLowerCase()
        .trim();

    const filtered =
      records.filter(
        record => {

          const players =
            normalizePlayers(
              record.players
            ).join(" ");

          const searchable =
            [
              record.player,
              record.loser,
              record.table_number,
              record.game,
              record.amount,
              record.payment,
              record.start_time,
              record.end_time,
              players
            ]
              .map(
                value =>
                  String(
                    value ??
                    ""
                  )
              )
              .join(" ")
              .toLowerCase();

          return searchable.includes(
            query
          );
        }
      );

    const content =
      document.getElementById(
        "unpaidContent"
      );

    if (!filtered.length) {

      content.innerHTML =
        `
          <div class="empty">
            No unpaid games found.
          </div>
        `;

      return;
    }

    content.innerHTML = `

      <div class="history-wrap">

        <table class="history-table">

          <thead>

            <tr>

              <th>
                Date
              </th>

              <th>
                Time
              </th>

              <th>
                Loser
              </th>

              <th>
                Mobile
              </th>

              <th>
                Players
              </th>

              <th>
                Table
              </th>

              <th>
                Game
              </th>

              <th>
                Amount
              </th>

              <th>
                Action
              </th>

            </tr>

          </thead>

          <tbody>

            ${filtered
              .map(
                record => {

                  const loserInfo =
                    parseLoserInfo(
                      record.loser
                    );

                  const players =
                    normalizePlayers(
                      record.players
                    );

                  return `

                    <tr>

                      <td>
                        ${escapeHTML(
                          record.game_date ||
                          "-"
                        )}
                      </td>

                      <td>
                        ${formatTimeDisplay(
                          record.start_time
                        )}
                      </td>

                      <td
                        style="
                          color:var(--red);
                          font-weight:700;
                        "
                      >
                        ${escapeHTML(
                          loserInfo.name ||
                          "-"
                        )}
                      </td>

                      <td>
                        ${escapeHTML(
                          loserInfo.mobile ||
                          "-"
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
                        <strong>
                          ₹${Number(
                            record.amount ||
                            0
                          )}
                        </strong>
                      </td>

                      <td>

                        <button
                          type="button"
                          class="btn btn-primary mark-paid-btn"
                          data-id="${escapeAttribute(
                            record.id
                          )}"
                        >
                          Mark Paid
                        </button>

                      </td>

                    </tr>
                  `;
                }
              )
              .join("")}

          </tbody>

        </table>

      </div>
    `;

    document
      .querySelectorAll(
        ".mark-paid-btn"
      )
      .forEach(
        button => {

          button.addEventListener(
            "click",
            async () => {

              await markUnpaidPaid(
                button.dataset.id
              );

              openUnpaidHistory();
            }
          );
        }
      );
  }

  searchInput.addEventListener(
    "input",
    () =>
      renderUnpaidSearch(
        searchInput.value
      )
  );

  renderUnpaidSearch();

  document
    .getElementById(
      "backHistoryBtn"
    )
    .addEventListener(
      "click",
      openHistoryModal
    );
}

/* =========================================================
   MARK UNPAID AS PAID
========================================================= */

async function markUnpaidPaid(
  id
) {

  try {

    const {
      error
    } = await db
      .from(
        "game_history"
      )
      .update({
        payment:
          "Cash"
      })
      .eq(
        "id",
        id
      );

    if (error) {
      throw error;
    }

    showToast(
      "Payment marked as paid"
    );

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
   PARSE LOSER + MOBILE
========================================================= */

function parseLoserInfo(
  value
) {

  const text =
    String(
      value || ""
    );

  const marker =
    " | Mobile:";

  const index =
    text.indexOf(
      marker
    );

  if (index === -1) {

    return {
      name:
        text.trim(),

      mobile:
        ""
    };
  }

  return {

    name:
      text
        .substring(
          0,
          index
        )
        .trim(),

    mobile:
      text
        .substring(
          index +
          marker.length
        )
        .trim()
  };
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

  const difference =
    Math.max(
      0,
      Math.floor(
        (
          end.getTime() -
          start.getTime()
        ) /
        60000
      )
    );

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
    } = await db
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

    /*
      Unpaid is NOT counted as
      collected money.
    */

    const paidRows =
      (
        data || []
      ).filter(
        row =>
          String(
            row.payment ||
            ""
          ).toLowerCase() !==
          "unpaid"
      );

    const total =
      paidRows.reduce(
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

let toastTimer = null;

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

  if (hours > 0) {

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

  return formatDateForDB(
    new Date()
  );
}

function formatDateForDB(
  date
) {

  const formatter =
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
    );

  const parts =
    formatter.formatToParts(
      date
    );

  const year =
    parts.find(
      p =>
        p.type ===
        "year"
    ).value;

  const month =
    parts.find(
      p =>
        p.type ===
        "month"
    ).value;

  const day =
    parts.find(
      p =>
        p.type ===
        "day"
    ).value;

  return `${year}-${month}-${day}`;
}

function formatTimeDisplay(
  value
) {

  if (!value) return "-";

  const date =
    new Date(
      value
    );

  if (
    !Number.isNaN(
      date.getTime()
    )
  ) {

    return date.toLocaleTimeString(
      "en-IN",
      {
        hour:
          "numeric",

        minute:
          "2-digit",

        hour12:
          true,

        timeZone:
          "Asia/Kolkata"
      }
    );
  }

  return String(
    value
  );
}

function parseTimeToMinutes(
  value
) {

  if (!value) {
    return null;
  }

  const parts =
    String(
      value
    ).split(":");

  if (
    parts.length <
    2
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
    hours *
      60 +
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
      .filter(Boolean);
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
        .filter(Boolean);
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
    value ?? ""
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
   AUTO REFRESH STATS
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
