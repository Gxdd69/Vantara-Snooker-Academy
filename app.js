/* =========================================================
   VANTARA SNOOKER ACADEMY
   LIVE TABLE MANAGEMENT
   AUTHENTICATION + CONTINUE GAMES + UNPAID
   ========================================================= */

/* =========================================================
   SUPABASE
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

const SESSION_PREFIX =
  "__VANTARA_SESSION_V2__";


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

  if (appInitialized) {
    return;
  }

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

      if (
        event === "SIGNED_IN" &&
        session
      ) {

        await initializeApp();

        modal.dataset.loginRequired =
          "false";

        closeModal();

        renderTables();

        await loadActiveGames();

        showToast(
          "Login successful"
        );
      }

      if (
        event === "SIGNED_OUT"
      ) {

        lockApplication();
      }
    }
  );
}


/* =========================================================
   LOCK
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

  if (historyBtn) {

    historyBtn.addEventListener(
      "click",
      requireLoginForHistory
    );
  }

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
      Number(tableNumber)
    ] || 0
  );
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

  const session =
    getSessionData(game);

  if (
    Number.isFinite(
      Number(
        session.currentRate
      )
    )
  ) {
    return Number(
      session.currentRate
    );
  }

  return getTableRate(
    game.table_number
  );
}


/* =========================================================
   SESSION DATA
   ========================================================= */

function createNewSession(
  game
) {

  const rate =
    Number(
      game.custom_rate ??
      getTableRate(
        game.table_number
      )
    );

  const startedAt =
    game.started_at ||
    new Date().toISOString();

  const players =
    normalizePlayers(
      game.players
    );

  return {

    currentGame:
      game.game ||
      "Snooker",

    currentStartedAt:
      startedAt,

    currentPlayers:
      players,

    currentRate:
      Number.isFinite(rate)
        ? rate
        : getTableRate(
            game.table_number
          ),

    originalStartedAt:
      startedAt,

    games: [],

    accumulatedAmount: 0
  };
}


function isSessionGame(
  game
) {

  return (
    game &&
    String(
      game.game || ""
    ).startsWith(
      SESSION_PREFIX
    )
  );
}


function getSessionData(
  game
) {

  if (
    !isSessionGame(game)
  ) {

    return createNewSession(
      game
    );
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

    const fallback =
      createNewSession(
        game
      );

    return {

      currentGame:
        parsed.currentGame ||
        fallback.currentGame,

      currentStartedAt:
        parsed.currentStartedAt ||
        game.started_at,

      currentPlayers:
        Array.isArray(
          parsed.currentPlayers
        )
          ? parsed.currentPlayers
          : normalizePlayers(
              game.players
            ),

      currentRate:
        Number.isFinite(
          Number(
            parsed.currentRate
          )
        )
          ? Number(
              parsed.currentRate
            )
          : fallback.currentRate,

      originalStartedAt:
        parsed.originalStartedAt ||
        game.started_at,

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
        )
    };

  } catch (error) {

    console.error(
      "Session parse error:",
      error
    );

    return createNewSession(
      game
    );
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

      currentStartedAt:
        data.currentStartedAt,

      currentPlayers:
        data.currentPlayers,

      currentRate:
        Number(
          data.currentRate
        ) || 0,

      originalStartedAt:
        data.originalStartedAt,

      games:
        data.games,

      accumulatedAmount:
        Number(
          data.accumulatedAmount
        ) || 0
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

  const session =
    getSessionData(game);

  const players =
    normalizePlayers(
      session.currentPlayers?.length
        ? session.currentPlayers
        : game.players
    );

  const firstPlayer =
    players[0] ||
    "Player";

  const elapsed =
    getElapsedTime(
      session.currentStartedAt ||
      game.started_at
    );

  const gameName =
    session.currentGame ||
    "Snooker";

  const gameCount =
    session.games.length + 1;

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
            session.currentStartedAt ||
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
      · Default ₹${rate}/hour
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
          ₹${calculateExtraCharge(
            playerList.length
          )}
        </b>

      </div>

      <div class="bill-line bill-total">

        <span>
          Starting minimum
        </span>

        <b id="startTotalPreview">
          ₹${
            Number(rate) +
            calculateExtraCharge(
              playerList.length
            )
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
      updatePlayerPreview
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

function calculateExtraCharge(
  playerCount
) {

  return (
    Math.max(
      0,
      Number(
        playerCount
      ) - 2
    ) *
    EXTRA_PLAYER_CHARGE
  );
}


function updatePlayerPreview() {

  const count =
    playerList.length;

  const extra =
    calculateExtraCharge(
      count
    );

  const countElement =
    document.getElementById(
      "playerCountPreview"
    );

  const extraElement =
    document.getElementById(
      "extraPlayerPreview"
    );

  const priceInput =
    document.getElementById(
      "startPrice"
    );

  const totalElement =
    document.getElementById(
      "startTotalPreview"
    );

  if (countElement) {

    countElement.textContent =
      count;
  }

  if (extraElement) {

    extraElement.textContent =
      `₹${extra}`;
  }

  if (priceInput) {

    const rate =
      Number(
        priceInput.value
      ) || 0;

    const ratePreview =
      document.getElementById(
        "startRatePreview"
      );

    if (ratePreview) {

      ratePreview.textContent =
        `₹${rate}/hr`;
    }

    if (totalElement) {

      totalElement.textContent =
        `₹${rate + extra}`;
    }
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


  document
    .querySelectorAll(
      ".player-input"
    )
    .forEach(
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

        players:
          players,

        started_at:
          startedAt,

        custom_rate:
          customRate

      });


    if (error) {

      if (
        String(
          error.message ||
          ""
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

              players:
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
   END GAME
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

  const session =
    getSessionData(
      game
    );

  const players =
    normalizePlayers(
      session.currentPlayers?.length
        ? session.currentPlayers
        : game.players
    );

  const currentStartedAt =
    session.currentStartedAt ||
    game.started_at;

  const currentDuration =
    getDurationMinutes(
      currentStartedAt
    );

  const currentRate =
    Number(
      session.currentRate
    ) ||
    getCustomRate(
      game
    );

  const currentCalculated =
    calculateAmountWithRate(
      currentRate,
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

  const gameNumber =
    session.games.length + 1;

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
        session.currentGame ||
        "Snooker"
      )}

      · Game ${gameNumber}

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
          ₹${currentRate}/hr
        </b>

      </div>


      <div class="bill-line">

        <span>
          Extra player charge
        </span>

        <b>
          ₹${calculateExtraCharge(
            players.length
          )}
        </b>

      </div>


      <div class="bill-line">

        <span>
          Current game amount
        </span>

        <b>
          ₹${currentCalculated}
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
          Session Total
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
  } = await db.auth.getSession();

  if (!session) {

    showLoginModal();
    return;
  }


  const sessionData =
    getSessionData(
      game
    );


  const players =
    normalizePlayers(
      sessionData.currentPlayers?.length
        ? sessionData.currentPlayers
        : game.players
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
    IMPORTANT:

    Save ONLY this game's amount.

    Then add it ONCE to the accumulated
    session total.

    The next game starts from NOW.
  */

  sessionData.games.push({

    game:
      sessionData.currentGame ||
      "Snooker",

    started_at:
      sessionData.currentStartedAt ||
      game.started_at,

    ended_at:
      new Date().toISOString(),

    amount:
      currentAmount,

    players:
      players,

    rate:
      Number(
        sessionData.currentRate
      ) || 0
  });


  sessionData.accumulatedAmount =
    Number(
      sessionData.accumulatedAmount ||
      0
    ) +
    currentAmount;


  openContinueSetupModal(
    game,
    sessionData
  );
}


/* =========================================================
   CONTINUE SETUP
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
      sessionData.currentPlayers?.length
        ? sessionData.currentPlayers
        : game.players
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

      Games completed:
      <strong
        style="color:var(--gold);"
      >
        ${sessionData.games.length}
      </strong>

      · Previous total:

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


    <label class="form-label">
      Table Price / Hour
    </label>


    <div class="amount-input-wrap">

      <span class="amount-symbol">
        ₹
      </span>

      <input
        id="continuePrice"
        class="input amount-input"
        type="number"
        min="0"
        step="1"
        value="${Number(
          sessionData.currentRate
        ) || getTableRate(
          game.table_number
        )}"
      >

    </div>


    <div class="bill">

      <div class="bill-line">

        <span>
          Players
        </span>

        <b id="continuePlayerCount">
          ${playerList.length}
        </b>

      </div>


      <div class="bill-line">

        <span>
          Extra player charge
        </span>

        <b id="continueExtraCharge">
          ₹${calculateExtraCharge(
            playerList.length
          )}
        </b>

      </div>


      <div class="bill-line">

        <span>
          Previous games total
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

            updateContinuePreview();
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
      "continuePrice"
    )
    .addEventListener(
      "input",
      updateContinuePreview
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
   CONTINUE PREVIEW
   ========================================================= */

function updateContinuePreview() {

  const count =
    playerList.length;

  const extra =
    calculateExtraCharge(
      count
    );

  const countElement =
    document.getElementById(
      "continuePlayerCount"
    );

  const extraElement =
    document.getElementById(
      "continueExtraCharge"
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
   SAVE CONTINUED GAME
   ========================================================= */

async function saveContinuedGame(
  game,
  sessionData
) {

  document
    .querySelectorAll(
      ".player-input"
    )
    .forEach(
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
      "continuePrice"
    );

  const nextRate =
    Number(
      priceInput?.value
    );


  if (
    !Number.isFinite(
      nextRate
    ) ||
    nextRate < 0
  ) {

    showToast(
      "Enter a valid table price"
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

    /*
      NEW GAME STARTS NOW.

      This is the key fix for the
      200 → 400 → 800 problem.
    */

    const newStartedAt =
      new Date().toISOString();


    sessionData.currentGame =
      selectedGame;


    sessionData.currentStartedAt =
      newStartedAt;


    sessionData.currentPlayers =
      players;


    sessionData.currentRate =
      nextRate;


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
          players,

        started_at:
          newStartedAt,

        custom_rate:
          nextRate

      })
      .eq(
        "id",
        game.id
      );


    if (error) {

      /*
        Fallback for old database
        without custom_rate.
      */

      if (
        String(
          error.message ||
          ""
        ).includes(
          "custom_rate"
        )
      ) {

        const retry =
          await db
            .from(
              "active_games"
            )
            .update({

              game:
                encoded,

              players:
                players,

              started_at:
                newStartedAt

            })
            .eq(
              "id",
              game.id
            );

        if (retry.error) {
          throw retry.error;
        }

      } else {

        throw error;
      }
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
  game
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


    const sessionData =
      getSessionData(
        game
      );


    const players =
      normalizePlayers(
        sessionData.currentPlayers?.length
          ? sessionData.currentPlayers
          : game.players
      );


    const currentStartedAt =
      sessionData.currentStartedAt ||
      game.started_at;


    /*
      Save the current game separately.

      IMPORTANT:
      finalAmount is the FINAL SESSION BILL.

      We don't add it again to accumulatedAmount.
    */

    const currentCalculated =
      calculateAmountWithRate(
        sessionData.currentRate ||
        getCustomRate(game),
        getDurationMinutes(
          currentStartedAt
        ),
        players.length
      );


    sessionData.games.push({

      game:
        sessionData.currentGame ||
        "Snooker",

      started_at:
        currentStartedAt,

      ended_at:
        now.toISOString(),

      amount:
        currentCalculated,

      final_session_amount:
        finalAmount,

      players:
        players,

      rate:
        Number(
          sessionData.currentRate
        ) || 0
    });


    /*
      Every game's amount is already
      accumulated exactly once.

      Final editable amount is used
      as the actual amount charged.
    */

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
      Preserve mobile without requiring
      a new database column.
    */

    const loserStored =
      mobile
        ? `${loser} | Mobile: ${mobile}`
        : loser;


    /*
      DO NOT use Set here.

      If the customer plays:
      Snooker
      Snooker
      Snooker

      it must show 3 games.
    */

    const gameNames =
      sessionData.games
        .map(
          item =>
            item.game
        )
        .filter(Boolean);


    const historyGame =
      gameNames.join(
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
          finalAmount,

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

    await updateStats();

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
   AMOUNT CALCULATION
   ========================================================= */

function calculateAmountWithRate(
  rate,
  durationMinutes,
  playerCount
) {

  const numericRate =
    Number(rate) || 0;


  /*
    Minimum 1 hour.

    Example:
    Table 1 = ₹200
    3 players = +₹20
    Total minimum = ₹220
  */

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


  const extraCharge =
    calculateExtraCharge(
      playerCount
    );


  return Math.round(
    baseAmount +
    extraCharge
  );
}


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
   LOGIN
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


  if (!content) {
    return;
  }


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
   COUNT GAMES IN HISTORY
   ========================================================= */

function getHistoryGameCount(
  record
) {

  if (
    !record ||
    !record.game
  ) {
    return 1;
  }


  const text =
    String(
      record.game
    ).trim();


  if (!text) {
    return 1;
  }


  return Math.max(
    1,
    text
      .split(" + ")
      .filter(Boolean)
      .length
  );
}


/* =========================================================
   HISTORY RENDER
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
    records.reduce(
      (
        sum,
        record
      ) =>
        sum +
        getHistoryGameCount(
          record
        ),
      0
    );


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

        <span>
          GAMES PLAYED
        </span>

        <strong>
          ${games}
        </strong>

      </div>


      <div class="stat-card">

        <span>
          COLLECTION
        </span>

        <strong>
          ₹${total}
        </strong>

      </div>


      <div class="stat-card">

        <span>
          CASH
        </span>

        <strong>
          ₹${cash}
        </strong>

      </div>


      <div class="stat-card">

        <span>
          ONLINE
        </span>

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
              Games Played
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


                      const loserInfo =
                        parseLoserInfo(
                          record.loser
                        );


                      const gameCount =
                        getHistoryGameCount(
                          record
                        );


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

                            <strong>
                              ${gameCount}
                            </strong>

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
                            style="
                              ${
                                loserInfo.name
                                  ? `
                                    color:var(--red);
                                    font-weight:700;
                                  `
                                  : ""
                              }
                            "
                          >
                            ${escapeHTML(
                              loserInfo.name ||
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
                            style="
                              ${
                                isUnpaid
                                  ? `
                                    color:var(--red);
                                    font-weight:700;
                                  `
                                  : ""
                              }
                            "
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
                      colspan="9"
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
      Search anything:
      name, loser, mobile, table,
      game, amount, date, time...
    </div>


    <input
      id="unpaidSearch"
      class="input"
      type="text"
      placeholder="Search anything..."
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


          const loserInfo =
            parseLoserInfo(
              record.loser
            );


          /*
            Search EVERYTHING useful.
          */

          const searchable = [

            record.id,

            record.game_date,

            record.start_time,

            record.end_time,

            record.table_number,

            record.player,

            record.loser,

            loserInfo.name,

            loserInfo.mobile,

            record.game,

            record.amount,

            record.calculated_amount,

            record.payment,

            record.player_count,

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


    if (
      !filtered.length
    ) {

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
                Games
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


                  const gameCount =
                    getHistoryGameCount(
                      record
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


                      <td>
                        <strong>
                          ${gameCount}
                        </strong>
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

                        <strong
                          style="
                            color:var(--red);
                          "
                        >
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
   MARK PAID
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
   LOSER + MOBILE
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


  if (
    index === -1
  ) {

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
        "amount,payment,game"
      )
      .eq(
        "game_date",
        today
      );


    if (error) {
      throw error;
    }


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


    const totalGames =
      (
        data || []
      ).reduce(
        (
          sum,
          row
        ) =>
          sum +
          getHistoryGameCount(
            row
          ),
        0
      );


    gamesCount.textContent =
      totalGames;


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
   TIME
   ========================================================= */

function getElapsedTime(
  startedAt
) {

  return formatDuration(
    getDurationMinutes(
      startedAt
    )
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
      minutes / 60
    );


  const mins =
    minutes % 60;


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
   DATE
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


/* =========================================================
   TIME DISPLAY
   ========================================================= */

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

    "Games Played",

    "Game",

    "Players",

    "Player Count",

    "Loser",

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

        getHistoryGameCount(
          record
        ),

        record.game ||
          "",

        normalizePlayers(
          record.players
        ).join(
          " | "
        ),

        record.player_count ||
          "",

        record.loser ||
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
   SECURITY HELPERS
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

    if (!appInitialized) {
      return;
    }

    updateStats();

  },
  30000
);
