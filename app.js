/* =========================================================
   VANTARA SNOOKER ACADEMY
   COMPLETE 12 TABLE SYSTEM
========================================================= */


/* =========================================================
   SUPABASE
========================================================= */

const SUPABASE_URL =
  "https://crdwfhrbfxfydklpjroo.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_c0HV4psTPpzaEta9W4iJmA_FBsO3tT4";

const db =
  window.supabase.createClient(
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
  "VANTARA_SESSION_V4|";


/* =========================================================
   TABLE LIST
========================================================= */

const TABLES =
  Array.from(
    { length: TOTAL_TABLES },
    (_, index) => ({
      number: index + 1,
      rate:
        TABLE_RATES[index + 1]
    })
  );


/* =========================================================
   STATE
========================================================= */

let activeGames = [];

let selectedTable = null;

let selectedGame = "Snooker";

let selectedPayment = "Cash";

let playerList = ["", ""];

let selectedRate = 0;

let toastTimer = null;

let appInitialized = false;

let realtimeChannel = null;


/* =========================================================
   DOM
========================================================= */

const floorGrid =
  document.getElementById(
    "floorGrid"
  );

const availableCount =
  document.getElementById(
    "availableCount"
  );

const playingCount =
  document.getElementById(
    "playingCount"
  );

const gamesCount =
  document.getElementById(
    "gamesCount"
  );

const collection =
  document.getElementById(
    "collection"
  );

const historyBtn =
  document.getElementById(
    "historyBtn"
  );

const connectionStatus =
  document.getElementById(
    "connectionStatus"
  );

const clock =
  document.getElementById(
    "clock"
  );

const modalBackdrop =
  document.getElementById(
    "modalBackdrop"
  );

const modal =
  document.getElementById(
    "modal"
  );

const toast =
  document.getElementById(
    "toast"
  );


/* =========================================================
   START
========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  async () => {

    startClock();

    setupGlobalEvents();

    const {
      data: { session },
      error
    } =
      await db.auth.getSession();

    if (error) {
      console.error(error);
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
   INITIALIZE
========================================================= */

async function initializeApp() {

  if (appInitialized) {
    return;
  }

  appInitialized = true;

  renderTables();

  await loadActiveGames();

  await updateStats();

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
        event ===
        "SIGNED_IN"
      ) {

        if (
          modalBackdrop.classList.contains(
            "open"
          )
        ) {
          closeModal();
        }

        await initializeApp();

        showToast(
          "Login successful"
        );

      }

      if (
        event ===
        "SIGNED_OUT"
      ) {

        appInitialized =
          false;

        activeGames = [];

        floorGrid.innerHTML =
          "";

        showLoginModal();

      }

    }
  );

}


/* =========================================================
   CLOCK
========================================================= */

function startClock() {

  function update() {

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

  update();

  setInterval(
    update,
    1000
  );

}


/* =========================================================
   HELPERS
========================================================= */

function money(
  value
) {

  return (
    "₹" +
    Number(
      value || 0
    ).toLocaleString(
      "en-IN"
    )
  );

}


function today() {

  return new Date()
    .toLocaleDateString(
      "en-CA",
      {
        timeZone:
          "Asia/Kolkata"
      }
    );

}


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


function normalizePlayers(
  players
) {

  if (
    Array.isArray(players)
  ) {

    return players
      .map(
        player =>
          String(
            player || ""
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
        Array.isArray(parsed)
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


function getTableConfig(
  tableNumber
) {

  return (
    TABLES.find(
      table =>
        table.number ===
        Number(
          tableNumber
        )
    ) || {
      number:
        Number(
          tableNumber
        ),
      rate: 200
    }
  );

}


/* =========================================================
   CONNECTION
========================================================= */

function setConnection(
  online,
  text
) {

  connectionStatus.classList.toggle(
    "online",
    online
  );

  connectionStatus.classList.toggle(
    "offline",
    !online
  );

  connectionStatus.innerHTML =
    `<span></span> ${
      text ||
      (
        online
          ? "Connected"
          : "Offline"
      )
    }`;

}


/* =========================================================
   TOAST
========================================================= */

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
      2600
    );

}


/* =========================================================
   MODAL
========================================================= */

function openModal(
  html
) {

  modal.innerHTML =
    html;

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

  modal.innerHTML =
    "";

  modal.dataset.loginRequired =
    "false";

}


function forceCloseModal() {

  modalBackdrop.classList.remove(
    "open"
  );

  modal.innerHTML =
    "";

  modal.dataset.loginRequired =
    "false";

}


/* =========================================================
   GLOBAL EVENTS
========================================================= */

function setupGlobalEvents() {

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

      closeModal();

    }
  );

  document.addEventListener(
    "keydown",
    event => {

      if (
        event.key ===
        "Escape"
      ) {

        closeModal();

      }

    }
  );

}


/* =========================================================
   LOAD ACTIVE GAMES
========================================================= */

async function loadActiveGames() {

  try {

    const {
      data,
      error
    } =
      await db
        .from(
          "active_games"
        )
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
      .subscribe();

}


/* =========================================================
   TABLE HTML
========================================================= */

function pocketsHTML() {

  return `
    <span class="pocket p1"></span>
    <span class="pocket p2"></span>
    <span class="pocket p3"></span>
    <span class="pocket p4"></span>
    <span class="pocket p5"></span>
    <span class="pocket p6"></span>
  `;

}


/* =========================================================
   RENDER 12 TABLES
========================================================= */

function renderTables() {

  floorGrid.innerHTML =
    "";

  let available =
    0;

  let playing =
    0;

  TABLES.forEach(
    table => {

      const game =
        activeGames.find(
          item =>
            Number(
              item.table_number
            ) ===
            table.number
        );

      const card =
        document.createElement(
          "div"
        );

      if (!game) {

        available++;

        card.className =
          "table-card";

        card.innerHTML = `

          <div class="table-felt">
            ${pocketsHTML()}
          </div>

          <div class="table-info">

            <div class="table-header">

              <div class="table-number">
                Table ${table.number}
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
                ₹${table.rate}/hr
              </div>

            </div>

          </div>

        `;

        card.addEventListener(
          "click",
          () =>
            openStartModal(
              table.number
            )
        );

      } else {

        playing++;

        const players =
          normalizePlayers(
            game.players
          );

        const mainPlayer =
          players[0] ||
          "Players";

        card.className =
          "table-card playing";

        card.innerHTML = `

          <div class="table-felt">
            ${pocketsHTML()}
          </div>

          <div class="playing-overlay">

            <div class="table-header">

              <div class="table-number">
                Table ${table.number}
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
                  mainPlayer
                )}
              </div>

            </div>

            <div class="playing-meta">

              <div class="game-mini">
                ${escapeHTML(
                  game.game ||
                  "Snooker"
                )}
                ${
                  players.length > 1
                    ? ` · ${players.length} players`
                    : ""
                }
              </div>

              <div class="timer">
                ${getElapsed(
                  game.started_at
                )}
              </div>

            </div>

          </div>

        `;

        card.addEventListener(
          "click",
          () =>
            openPlayingModal(
              game
            )
        );

      }

      floorGrid.appendChild(
        card
      );

    }
  );

  availableCount.textContent =
    available;

  playingCount.textContent =
    playing;

}


/* =========================================================
   TIMER
========================================================= */

function getElapsed(
  start
) {

  if (!start) {
    return "0m";
  }

  const seconds =
    Math.max(
      0,
      Math.floor(
        (
          Date.now() -
          new Date(
            start
          ).getTime()
        ) / 1000
      )
    );

  const hours =
    Math.floor(
      seconds / 3600
    );

  const minutes =
    Math.floor(
      (
        seconds % 3600
      ) / 60
    );

  if (hours > 0) {

    return `${hours}h ${minutes}m`;

  }

  return `${minutes}m`;

}


setInterval(
  () => {

    if (
      appInitialized
    ) {

      renderTables();

    }

  },
  30000
);


/* =========================================================
   START TABLE
========================================================= */

function openStartModal(
  tableNumber
) {

  selectedTable =
    tableNumber;

  selectedGame =
    "Snooker";

  selectedRate =
    getTableConfig(
      tableNumber
    ).rate;

  playerList =
    ["", ""];

  renderStartModal();

  openModal(
    modal.innerHTML
  );

}


function renderStartModal() {

  modal.innerHTML = `

    <button
      class="modal-close"
      type="button"
      id="closeStart"
    >
      ×
    </button>

    <div class="eyebrow">
      START TABLE
    </div>

    <h2>
      Table ${selectedTable}
    </h2>

    <p class="modal-sub">
      Start a new game
    </p>


    <label class="form-label">
      GAME
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
      PLAYERS
    </label>

    <div id="startPlayers">

      ${playerList.map(
        (
          player,
          index
        ) => `

          <div class="player-row">

            <input
              class="input player-input"
              type="text"
              data-index="${index}"
              placeholder="Player ${index + 1}"
              value="${escapeAttribute(
                player
              )}"
            >

            ${
              index >= 2
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
      id="addStartPlayer"
    >
      + Add Player
    </button>


    <label class="form-label">
      STARTING PRICE
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
        value="${selectedRate}"
      >

    </div>


    <div class="bill">

      <div class="bill-line">
        <span>
          Players
        </span>

        <b id="startPlayerCount">
          ${playerList.length}
        </b>
      </div>

      <div class="bill-line">
        <span>
          Extra player charge
        </span>

        <b id="startExtra">
          ₹0
        </b>
      </div>

      <div class="bill-line">
        <span>
          Table rate
        </span>

        <b id="startRatePreview">
          ₹${selectedRate}/hr
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

  setupStartEvents();

}


/* =========================================================
   START EVENTS
========================================================= */

function setupStartEvents() {

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

            updateStartPreview();

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
      "addStartPlayer"
    )
    .addEventListener(
      "click",
      () => {

        playerList.push(
          ""
        );

        renderStartModal();

      }
    );


  document
    .getElementById(
      "startPrice"
    )
    .addEventListener(
      "input",
      event => {

        selectedRate =
          Number(
            event.target.value
          ) || 0;

        updateStartPreview();

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
      "closeStart"
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
   START PREVIEW
========================================================= */

function updateStartPreview() {

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
      "startPlayerCount"
    );

  const extraElement =
    document.getElementById(
      "startExtra"
    );

  const rateElement =
    document.getElementById(
      "startRatePreview"
    );

  if (countElement) {

    countElement.textContent =
      count;

  }

  if (extraElement) {

    extraElement.textContent =
      money(extra);

  }

  if (rateElement) {

    rateElement.textContent =
      `₹${selectedRate}/hr`;

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


  if (
    players.length ===
    0
  ) {

    showToast(
      "Enter at least one player"
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


  const startedAt =
    new Date().toISOString();


  try {

    const {
      data,
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

          started_at:
            startedAt
        })
        .select()
        .single();


    if (error) {
      throw error;
    }


    saveSessionData(
      selectedTable,
      {
        tableNumber:
          selectedTable,

        baseRate:
          selectedRate,

        games: [
          {
            game:
              selectedGame,

            players,

            amount:
              0,

            loser:
              "",

            mobile:
              "",

            startedAt
          }
        ]
      }
    );


    forceCloseModal();

    showToast(
      `Table ${selectedTable} started`
    );

    await loadActiveGames();

  } catch (error) {

    console.error(
      error
    );

    button.disabled =
      false;

    button.textContent =
      "Start Game";

    showToast(
      error.message ||
      "Could not start game"
    );

  }

}


/* =========================================================
   SESSION STORAGE
========================================================= */

function sessionKey(
  tableNumber
) {

  return (
    SESSION_PREFIX +
    Number(
      tableNumber
    )
  );

}


function getSessionData(
  tableNumber
) {

  try {

    const raw =
      localStorage.getItem(
        sessionKey(
          tableNumber
        )
      );

    if (!raw) {
      return null;
    }

    return JSON.parse(
      raw
    );

  } catch {

    return null;

  }

}


function saveSessionData(
  tableNumber,
  data
) {

  localStorage.setItem(
    sessionKey(
      tableNumber
    ),
    JSON.stringify(
      data
    )
  );

}


function clearSessionData(
  tableNumber
) {

  localStorage.removeItem(
    sessionKey(
      tableNumber
    )
  );

}


/* =========================================================
   PLAYING MODAL
========================================================= */

function openPlayingModal(
  game
) {

  renderPlayingModal(
    game
  );

  openModal(
    modal.innerHTML
  );

}


function renderPlayingModal(
  game
) {

  const players =
    normalizePlayers(
      game.players
    );

  const session =
    getSessionData(
      game.table_number
    ) ||
    {
      tableNumber:
        game.table_number,

      baseRate:
        getTableConfig(
          game.table_number
        ).rate,

      games: []
    };


  const currentGame =
    session.games.length
      ? session.games[
          session.games.length - 1
        ]
      : null;


  const currentAmount =
    calculateCurrentGameAmount(
      game,
      session
    );


  modal.innerHTML = `

    <button
      class="modal-close"
      id="closePlaying"
    >
      ×
    </button>

    <div class="eyebrow">
      LIVE TABLE
    </div>

    <h2>
      Table ${game.table_number}
    </h2>

    <p class="modal-sub">
      ${escapeHTML(
        game.game ||
        "Snooker"
      )}
      ·
      ${getElapsed(
        game.started_at
      )}
    </p>


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
          Current game
        </span>

        <b>
          ${money(
            currentAmount
          )}
        </b>
      </div>

      <div class="bill-line">
        <span>
          Previous games
        </span>

        <b>
          ${money(
            getPreviousSessionTotal(
              session
            )
          )}
        </b>
      </div>

      <div class="bill-line bill-total">
        <span>
          Running Total
        </span>

        <b>
          ${money(
            getSessionRunningTotal(
              session,
              currentAmount
            )
          )}
        </b>
      </div>

    </div>


    <div class="modal-actions">

      <button
        type="button"
        class="btn btn-secondary"
        id="cancelPlaying"
      >
        Back
      </button>

      <button
        type="button"
        class="btn btn-primary"
        id="finishPlaying"
      >
        Close Table
      </button>

    </div>

  `;


  document
    .getElementById(
      "closePlaying"
    )
    .onclick =
    closeModal;


  document
    .getElementById(
      "cancelPlaying"
    )
    .onclick =
    closeModal;


  document
    .getElementById(
      "finishPlaying"
    )
    .onclick =
    () =>
      openFinishModal(
        game
      );

}


/* =========================================================
   CURRENT AMOUNT
========================================================= */

function calculateCurrentGameAmount(
  game,
  session
) {

  const players =
    normalizePlayers(
      game.players
    );

  const rate =
    Number(
      session.baseRate ||
      getTableConfig(
        game.table_number
      ).rate
    );

  const elapsed =
    Math.max(
      1,
      getDurationMinutes(
        game.started_at
      ) / 60
    );

  const extra =
    Math.max(
      0,
      players.length - 2
    ) *
    EXTRA_PLAYER_CHARGE;

  return Math.round(
    rate *
      elapsed +
    extra
  );

}


function getDurationMinutes(
  start
) {

  if (!start) {
    return 0;
  }

  return Math.max(
    0,
    (
      Date.now() -
      new Date(
        start
      ).getTime()
    ) / 60000
  );

}


function getPreviousSessionTotal(
  session
) {

  return (
    session.games || []
  ).reduce(
    (
      sum,
      item
    ) =>
      sum +
      Number(
        item.amount ||
        0
      ),
    0
  );

}


function getSessionRunningTotal(
  session,
  currentAmount
) {

  return (
    getPreviousSessionTotal(
      session
    ) +
    Number(
      currentAmount ||
      0
    )
  );

}


/* =========================================================
   FINISH MODAL
========================================================= */

function openFinishModal(
  game
) {

  const players =
    normalizePlayers(
      game.players
    );

  const session =
    getSessionData(
      game.table_number
    ) ||
    {
      tableNumber:
        game.table_number,

      baseRate:
        getTableConfig(
          game.table_number
        ).rate,

      games: []
    };


  const currentAmount =
    calculateCurrentGameAmount(
      game,
      session
    );


  const previousTotal =
    getPreviousSessionTotal(
      session
    );


  const total =
    previousTotal +
    currentAmount;


  selectedPayment =
    "Cash";


  modal.innerHTML = `

    <button
      class="modal-close"
      id="closeFinish"
    >
      ×
    </button>

    <div class="eyebrow">
      CLOSE TABLE
    </div>

    <h2>
      Table ${game.table_number}
    </h2>

    <p class="modal-sub">
      ${
        session.games.length + 1
      } game${
        session.games.length + 1 === 1
          ? ""
          : "s"
      } in this session
    </p>


    <div class="bill">

      <div class="bill-line">
        <span>
          Current game
        </span>

        <b>
          ${money(
            currentAmount
          )}
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
                ${money(
                  previousTotal
                )}
              </b>
            </div>
          `
          : ""
      }

      <div class="bill-line bill-total">

        <span>
          TOTAL
        </span>

        <b id="finishTotal">
          ${money(total)}
        </b>

      </div>

    </div>


    <label class="form-label">
      FINAL AMOUNT
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
        value="${total}"
      >

    </div>


    <label class="form-label">
      WHO LOST?
    </label>

    <input
      id="loserName"
      class="input"
      type="text"
      placeholder="Write loser name manually"
    >


    <label class="form-label">
      PAYMENT
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
      id="mobileWrap"
      style="display:none;"
    >

      <label class="form-label">
        MOBILE NUMBER
        <span style="color:var(--muted)">
          (Optional)
        </span>
      </label>

      <input
        id="loserMobile"
        class="input"
        type="tel"
        inputmode="numeric"
        placeholder="Mobile number"
      >

    </div>


    <div class="modal-actions">

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
        id="completeGameBtn"
      >
        Complete Table
      </button>

    </div>

  `;


  setupFinishEvents(
    game
  );

}


/* =========================================================
   FINISH EVENTS
========================================================= */

function setupFinishEvents(
  game
) {

  selectedPayment =
    "Cash";


  document
    .getElementById(
      "closeFinish"
    )
    .onclick =
    closeModal;


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
                "mobileWrap"
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
      "continueGameBtn"
    )
    .onclick =
    () =>
      continueGame(
        game
      );


  document
    .getElementById(
      "completeGameBtn"
    )
    .onclick =
    () =>
      completeGame(
        game
      );

}


/* =========================================================
   CONTINUE GAME
========================================================= */

async function continueGame(
  game
) {

  const finalAmount =
    Number(
      document
        .getElementById(
          "finalAmount"
        )
        .value
    ) || 0;


  const loser =
    document
      .getElementById(
        "loserName"
      )
      .value
      .trim();


  const mobile =
    document
      .getElementById(
        "loserMobile"
      )
      ?.value
      ?.trim() ||
    "";


  const session =
    getSessionData(
      game.table_number
    ) ||
    {
      tableNumber:
        game.table_number,

      baseRate:
        getTableConfig(
          game.table_number
        ).rate,

      games: []
    };


  const currentGame =
    session.games[
      session.games.length - 1
    ];


  const calculated =
    calculateCurrentGameAmount(
      game,
      session
    );


  currentGame.amount =
    finalAmount ||
    calculated;

  currentGame.loser =
    loser;

  currentGame.mobile =
    mobile;


  session.games.push({
    game:
      game.game ||
      "Snooker",

    players:
      normalizePlayers(
        game.players
      ),

    amount:
      0,

    loser:
      "",

    mobile:
      "",

    startedAt:
      new Date().toISOString()
  });


  saveSessionData(
    game.table_number,
    session
  );


  try {

    const {
      error
    } =
      await db
        .from(
          "active_games"
        )
        .update({

          game:
            game.game ||
            "Snooker",

          players:
            normalizePlayers(
              game.players
            ),

          started_at:
            new Date().toISOString()

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
      `Game ${session.games.length} started`
    );

    await loadActiveGames();

  } catch (error) {

    console.error(
      error
    );

    showToast(
      error.message ||
      "Could not continue game"
    );

  }

}


/* =========================================================
   COMPLETE TABLE
========================================================= */

async function completeGame(
  game
) {

  const button =
    document.getElementById(
      "completeGameBtn"
    );

  button.disabled =
    true;

  button.textContent =
    "Saving...";


  const enteredAmount =
    Number(
      document
        .getElementById(
          "finalAmount"
        )
        .value
    );


  const loser =
    document
      .getElementById(
        "loserName"
      )
      .value
      .trim();


  const mobile =
    document
      .getElementById(
        "loserMobile"
      )
      ?.value
      ?.trim() ||
    "";


  const session =
    getSessionData(
      game.table_number
    ) ||
    {
      tableNumber:
        game.table_number,

      baseRate:
        getTableConfig(
          game.table_number
        ).rate,

      games: []
    };


  const currentCalculated =
    calculateCurrentGameAmount(
      game,
      session
    );


  const currentIndex =
    session.games.length -
    1;


  if (
    session.games.length ===
    0
  ) {

    session.games.push({
      game:
        game.game ||
        "Snooker",

      players:
        normalizePlayers(
          game.players
        ),

      amount:
        currentCalculated,

      loser:
        loser,

      mobile:
        mobile
    });

  } else {

    session.games[
      currentIndex
    ].game =
      game.game ||
      session.games[
        currentIndex
      ].game ||
      "Snooker";

    session.games[
      currentIndex
    ].players =
      normalizePlayers(
        game.players
      );

    session.games[
      currentIndex
    ].amount =
      Number.isFinite(
        enteredAmount
      ) &&
      enteredAmount >= 0
        ? enteredAmount
        : currentCalculated;

    session.games[
      currentIndex
    ].loser =
      loser;

    session.games[
      currentIndex
    ].mobile =
      mobile;

  }


  const total =
    session.games.reduce(
      (
        sum,
        item
      ) =>
        sum +
        Number(
          item.amount ||
          0
        ),
      0
    );


  const startTime =
    session.games[0]
      ?.startedAt ||
    game.started_at ||
    new Date().toISOString();


  const endTime =
    new Date().toISOString();


  const gameSummary =
    buildGameSummary(
      session.games
    );


  const loserSummary =
    buildLoserSummary(
      session.games
    );


  const players =
    normalizePlayers(
      game.players
    );


  const loserValue =
    buildLoserDatabaseValue(
      loserSummary,
      mobile
    );


  try {

    const {
      error:
        historyError
    } =
      await db
        .from(
          "game_history"
        )
        .insert({

          game_date:
            today(),

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
            loserValue,

          game:
            gameSummary,

          calculated_amount:
            total,

          amount:
            total,

          payment:
            selectedPayment

        });


    if (historyError) {
      throw historyError;
    }


    const {
      error:
        deleteError
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


    clearSessionData(
      game.table_number
    );


    forceCloseModal();


    if (
      selectedPayment ===
      "Unpaid"
    ) {

      showToast(
        `Completed · ${money(total)} unpaid`
      );

    } else {

      showToast(
        `Completed · ${money(total)}`
      );

    }


    await loadActiveGames();

    await updateStats();

  } catch (error) {

    console.error(
      "Complete table error:",
      error
    );

    button.disabled =
      false;

    button.textContent =
      "Complete Table";

    showToast(
      error.message ||
      "Could not complete table"
    );

  }

}


/* =========================================================
   GAME SUMMARY
========================================================= */

function buildGameSummary(
  games
) {

  if (
    !games ||
    !games.length
  ) {
    return "1 Game";
  }

  return games
    .map(
      (
        item,
        index
      ) =>
        `Game ${
          index + 1
        }: ${
          item.game ||
          "Game"
        } ₹${
          Number(
            item.amount ||
            0
          )
        }`
    )
    .join(
      " + "
    );

}


function buildLoserSummary(
  games
) {

  if (
    !games ||
    !games.length
  ) {
    return "Not recorded";
  }

  return games
    .map(
      (
        item,
        index
      ) => {

        let result =
          `Game ${
            index + 1
          }: ${
            item.loser ||
            "Not recorded"
          }`;

        if (
          item.mobile
        ) {

          result +=
            ` | Mobile: ${
              item.mobile
            }`;

        }

        return result;

      }
    )
    .join(
      " · "
    );

}


function buildLoserDatabaseValue(
  loserSummary,
  mobile
) {

  if (
    mobile &&
    !loserSummary.includes(
      "Mobile:"
    )
  ) {

    return (
      loserSummary +
      ` | Mobile: ${mobile}`
    );

  }

  return loserSummary;

}


/* =========================================================
   HISTORY
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


/* =========================================================
   HISTORY MODAL
========================================================= */

async function openHistoryModal() {

  modal.dataset.loginRequired =
    "false";

  modal.innerHTML = `

    <button
      class="modal-close"
      id="closeHistory"
    >
      ×
    </button>

    <div class="eyebrow">
      RECORDS
    </div>

    <h2>
      History
    </h2>

    <p class="modal-sub">
      Search and export Vantara records
    </p>


    <div class="date-row">

      <input
        id="historyDate"
        class="input"
        type="date"
        value="${today()}"
      >

      <button
        id="todayHistory"
        class="btn btn-secondary"
      >
        Today
      </button>

      <button
        id="monthHistory"
        class="btn btn-secondary"
      >
        Month
      </button>

    </div>


    <div class="search-box">

      <input
        id="historySearch"
        class="input"
        type="text"
        placeholder="Search anything..."
      >

    </div>


    <div
      id="historyContent"
      class="empty"
    >
      Loading...
    </div>

  `;

  openModal(
    modal.innerHTML
  );


  document
    .getElementById(
      "closeHistory"
    )
    .onclick =
    closeModal;


  document
    .getElementById(
      "historyDate"
    )
    .addEventListener(
      "change",
      loadHistory
    );


  document
    .getElementById(
      "todayHistory"
    )
    .onclick =
    () => {

      document
        .getElementById(
          "historyDate"
        )
        .value =
        today();

      loadHistory();

    };


  document
    .getElementById(
      "monthHistory"
    )
    .onclick =
    () =>
      loadMonthHistory();


  document
    .getElementById(
      "historySearch"
    )
    .addEventListener(
      "input",
      () =>
        renderCurrentHistory()
    );


  await loadHistory();

}


/* =========================================================
   HISTORY STATE
========================================================= */

let historyRecords = [];


/* =========================================================
   LOAD HISTORY
========================================================= */

async function loadHistory() {

  const date =
    document
      .getElementById(
        "historyDate"
      )
      .value ||
    today();

  const content =
    document.getElementById(
      "historyContent"
    );

  content.innerHTML =
    `<div class="empty">
      Loading ${escapeHTML(date)}...
    </div>`;


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

    console.error(
      error
    );

    content.innerHTML =
      `<div class="empty">
        Could not load history.
      </div>`;

    return;

  }


  historyRecords =
    data || [];

  renderCurrentHistory();

}


/* =========================================================
   MONTH HISTORY
========================================================= */

async function loadMonthHistory() {

  const now =
    new Date();

  const year =
    now.getFullYear();

  const month =
    String(
      now.getMonth() + 1
    ).padStart(
      2,
      "0"
    );


  const start =
    `${year}-${month}-01`;


  const endDate =
    new Date(
      year,
      now.getMonth() + 1,
      0
    );


  const end =
    `${year}-${month}-${String(
      endDate.getDate()
    ).padStart(
      2,
      "0"
    )}`;


  const content =
    document.getElementById(
      "historyContent"
    );

  content.innerHTML =
    `<div class="empty">
      Loading month...
    </div>`;


  const {
    data,
    error
  } =
    await db
      .from(
        "game_history"
      )
      .select("*")
      .gte(
        "game_date",
        start
      )
      .lte(
        "game_date",
        end
      )
      .order(
        "created_at",
        {
          ascending: false
        }
      );


  if (error) {

    content.innerHTML =
      `<div class="empty">
        Could not load month history.
      </div>`;

    return;

  }


  historyRecords =
    data || [];

  renderCurrentHistory(
    true
  );

}


/* =========================================================
   SEARCH HISTORY
========================================================= */

function renderCurrentHistory(
  monthMode = false
) {

  const content =
    document.getElementById(
      "historyContent"
    );

  if (!content) {
    return;
  }


  const search =
    (
      document
        .getElementById(
          "historySearch"
        )
        ?.value ||
      ""
    )
      .toLowerCase()
      .trim();


  const records =
    historyRecords.filter(
      record => {

        if (!search) {
          return true;
        }

        const players =
          normalizePlayers(
            record.players
          ).join(" ");


        const searchable = [

          record.id,

          record.game_date,

          record.start_time,

          record.end_time,

          record.table_number,

          record.player,

          record.loser,

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
          search
        );

      }
    );


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
            record.payment ||
            ""
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
            record.payment ||
            ""
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
            record.payment ||
            ""
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


  content.innerHTML = `

    <div class="history-summary">

      <div class="stat-card">
        <span>GAMES PLAYED</span>
        <strong>
          ${games}
        </strong>
      </div>

      <div class="stat-card">
        <span>COLLECTION</span>
        <strong>
          ₹${total}
        </strong>
      </div>

      <div class="stat-card">
        <span>CASH</span>
        <strong>
          ₹${cash}
        </strong>
      </div>

      <div class="stat-card">
        <span>UNPAID</span>
        <strong
          style="color:var(--red)"
        >
          ₹${unpaid}
        </strong>
      </div>

    </div>


    ${
      records.length
        ? `

          <div class="history-wrap">

            <table class="history-table">

              <thead>

                <tr>

                  <th>
                    DATE
                  </th>

                  <th>
                    TIME
                  </th>

                  <th>
                    TABLE
                  </th>

                  <th>
                    GAMES
                  </th>

                  <th>
                    PLAYERS
                  </th>

                  <th>
                    LOSERS
                  </th>

                  <th>
                    TOTAL
                  </th>

                  <th>
                    PAYMENT
                  </th>

                </tr>

              </thead>

              <tbody>

                ${records
                  .map(
                    renderHistoryRow
                  )
                  .join("")}

              </tbody>

            </table>

          </div>

        `
        : `

          <div class="empty">
            No games found.
          </div>

        `
    }


    <div class="report-actions">

      <button
        class="btn btn-secondary"
        id="exportHistoryBtn"
      >
        Download Today
      </button>

      <button
        class="btn btn-primary"
        id="exportMonthBtn"
      >
        Download Whole Month
      </button>

    </div>

  `;


  document
    .getElementById(
      "exportHistoryBtn"
    )
    .onclick =
    () =>
      downloadCSV(
        records,
        monthMode
          ? "month"
          : "selected-date"
      );


  document
    .getElementById(
      "exportMonthBtn"
    )
    .onclick =
    async () => {

      await downloadWholeMonth();

    };

}


/* =========================================================
   HISTORY ROW
========================================================= */

function renderHistoryRow(
  record
) {

  const players =
    normalizePlayers(
      record.players
    );


  const loser =
    record.loser ||
    "Not recorded";


  const unpaid =
    String(
      record.payment ||
      ""
    ).toLowerCase() ===
    "unpaid";


  return `

    <tr>

      <td>
        ${escapeHTML(
          record.game_date ||
          ""
        )}
      </td>

      <td>
        ${formatTime(
          record.end_time
        )}
      </td>

      <td>
        Table
        ${escapeHTML(
          record.table_number
        )}
      </td>

      <td>

        <div class="history-game-detail">

          ${formatGameDetails(
            record.game
          )}

        </div>

      </td>

      <td>
        ${escapeHTML(
          players.join(
            ", "
          )
        )}
      </td>

      <td
        class="${
          unpaid
            ? "history-loser"
            : ""
        }"
      >
        ${escapeHTML(
          loser
        )}
      </td>

      <td>
        ₹${Number(
          record.amount ||
          0
        )}
      </td>

      <td
        class="${
          unpaid
            ? "unpaid-highlight"
            : ""
        }"
      >
        ${escapeHTML(
          record.payment ||
          ""
        )}
      </td>

    </tr>

  `;

}


function formatGameDetails(
  value
) {

  if (!value) {
    return "1 Game";
  }

  return String(
    value
  )
    .split(
      " + "
    )
    .map(
      item =>
        `<div class="history-game-row">
          ${escapeHTML(item)}
        </div>`
    )
    .join("");

}


/* =========================================================
   GAME COUNT
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
      .split(
        " + "
      )
      .filter(Boolean)
      .length
  );

}


/* =========================================================
   TIME FORMAT
========================================================= */

function formatTime(
  value
) {

  if (!value) {
    return "";
  }

  try {

    return new Date(
      value
    ).toLocaleTimeString(
      "en-IN",
      {
        hour:
          "2-digit",

        minute:
          "2-digit",

        hour12:
          false,

        timeZone:
          "Asia/Kolkata"
      }
    );

  } catch {

    return String(
      value
    );

  }

}


/* =========================================================
   CSV
========================================================= */

function csvEscape(
  value
) {

  return `"${String(
    value ??
    ""
  ).replace(
    /"/g,
    '""'
  )}"`;

}


function downloadCSV(
  records,
  name
) {

  const headers = [

    "Date",
    "Start Time",
    "End Time",
    "Table",
    "Games Played",
    "Game Details",
    "Players",
    "Player Count",
    "Losers",
    "Amount",
    "Calculated Amount",
    "Payment"

  ];


  const rows =
    records.map(
      record => [

        record.game_date,

        record.start_time,

        record.end_time,

        record.table_number,

        getHistoryGameCount(
          record
        ),

        record.game,

        normalizePlayers(
          record.players
        ).join(
          " | "
        ),

        record.player_count,

        record.loser,

        record.amount,

        record.calculated_amount,

        record.payment

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
            csvEscape
          )
          .join(",")
    )
    .join("\n");


  const blob =
    new Blob(
      [
        csv
      ],
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
    `vantara-${name}-${today()}.csv`;


  document.body.appendChild(
    link
  );

  link.click();

  link.remove();

  URL.revokeObjectURL(
    url
  );


  showToast(
    "Sheet downloaded"
  );

}


/* =========================================================
   WHOLE MONTH DOWNLOAD
========================================================= */

async function downloadWholeMonth() {

  const now =
    new Date();

  const year =
    now.getFullYear();

  const month =
    String(
      now.getMonth() + 1
    ).padStart(
      2,
      "0"
    );


  const start =
    `${year}-${month}-01`;


  const endDate =
    new Date(
      year,
      now.getMonth() + 1,
      0
    );


  const end =
    `${year}-${month}-${String(
      endDate.getDate()
    ).padStart(
      2,
      "0"
    )}`;


  const {
    data,
    error
  } =
    await db
      .from(
        "game_history"
      )
      .select("*")
      .gte(
        "game_date",
        start
      )
      .lte(
        "game_date",
        end
      )
      .order(
        "created_at",
        {
          ascending:
            false
        }
      );


  if (error) {

    showToast(
      "Could not download month"
    );

    return;

  }


  downloadCSV(
    data || [],
    "whole-month"
  );

}


/* =========================================================
   LOGIN
========================================================= */

function showLoginModal() {

  modal.dataset.loginRequired =
    "true";

  modal.innerHTML = `

    <div class="login-box">

      <img
        src="logo.png"
        class="login-logo"
        alt="Vantara"
      >

      <div class="eyebrow">
        VANTARA SNOOKER ACADEMY
      </div>

      <h2>
        Owner Login
      </h2>

      <p class="modal-sub">
        Login required to access the academy dashboard.
      </p>


      <label class="form-label">
        EMAIL
      </label>

      <input
        id="loginEmail"
        class="input"
        type="email"
        placeholder="Owner email"
        autocomplete="email"
      >


      <label class="form-label">
        PASSWORD
      </label>

      <input
        id="loginPassword"
        class="input"
        type="password"
        placeholder="Password"
        autocomplete="current-password"
      >


      <div
        id="loginMessage"
        class="login-message"
      ></div>


      <div class="modal-actions">

        <button
          id="loginBtn"
          class="btn btn-primary"
          type="button"
        >
          Login
        </button>

      </div>

    </div>

  `;


  modalBackdrop.classList.add(
    "open"
  );


  document
    .getElementById(
      "loginBtn"
    )
    .addEventListener(
      "click",
      loginUser
    );


  document
    .getElementById(
      "loginPassword"
    )
    .addEventListener(
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


  setTimeout(
    () =>
      document
        .getElementById(
          "loginEmail"
        )
        ?.focus(),
    50
  );

}


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


  const message =
    document.getElementById(
      "loginMessage"
    );


  if (
    !email ||
    !password
  ) {

    message.textContent =
      "Enter email and password.";

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


  const {
    error
  } =
    await db.auth.signInWithPassword({
      email,
      password
    });


  if (error) {

    console.error(
      error
    );

    message.textContent =
      error.message;

    button.disabled =
      false;

    button.textContent =
      "Login";

    return;

  }


  modal.dataset.loginRequired =
    "false";

  forceCloseModal();

  await initializeApp();

}


/* =========================================================
   STATS
========================================================= */

async function updateStats() {

  try {

    const {
      data,
      error
    } =
      await db
        .from(
          "game_history"
        )
        .select(
          "amount, payment, game"
        )
        .eq(
          "game_date",
          today()
        );


    if (error) {
      throw error;
    }


    const records =
      data || [];


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


    gamesCount.textContent =
      games;

    collection.textContent =
      money(total);

  } catch (error) {

    console.error(
      error
    );

  }

}


/* =========================================================
   UNPAID SEARCH
========================================================= */

async function openUnpaidHistory() {

  const {
    data,
    error
  } =
    await db
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
          ascending:
            false
        }
      );


  if (error) {

    showToast(
      "Could not load unpaid history"
    );

    return;

  }


  const records =
    data || [];


  modal.dataset.loginRequired =
    "false";


  modal.innerHTML = `

    <button
      class="modal-close"
      id="closeUnpaid"
    >
      ×
    </button>

    <div class="eyebrow">
      PAYMENT TRACKING
    </div>

    <h2>
      Unpaid History
    </h2>

    <p class="modal-sub">
      Search by name, loser, mobile, table, game, amount, date or anything else.
    </p>


    <input
      id="unpaidSearch"
      class="input search-box"
      type="text"
      placeholder="Search anything..."
    >


    <div
      id="unpaidContent"
    ></div>

  `;


  openModal(
    modal.innerHTML
  );


  document
    .getElementById(
      "closeUnpaid"
    )
    .onclick =
    closeModal;


  const render =
    () => {

      const query =
        document
          .getElementById(
            "unpaidSearch"
          )
          .value
          .toLowerCase()
          .trim();


      const filtered =
        records.filter(
          record => {

            const players =
              normalizePlayers(
                record.players
              ).join(" ");


            const searchable = [

              record.id,
              record.game_date,
              record.start_time,
              record.end_time,
              record.table_number,
              record.player,
              record.loser,
              record.game,
              record.amount,
              record.payment,
              record.player_count,
              players

            ]
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
          `<div class="empty">
            No unpaid games found.
          </div>`;

        return;

      }


      content.innerHTML = `

        <div class="history-wrap">

          <table class="history-table">

            <thead>

              <tr>

                <th>
                  DATE
                </th>

                <th>
                  TIME
                </th>

                <th>
                  LOSER
                </th>

                <th>
                  MOBILE
                </th>

                <th>
                  TABLE
                </th>

                <th>
                  GAMES
                </th>

                <th>
                  AMOUNT
                </th>

              </tr>

            </thead>

            <tbody>

              ${filtered
                .map(
                  record => {

                    const loser =
                      String(
                        record.loser ||
                        ""
                      );

                    const mobileMatch =
                      loser.match(
                        /Mobile:\s*([0-9+\-\s]+)/
                      );

                    const mobile =
                      mobileMatch
                        ? mobileMatch[1]
                        : "—";


                    return `

                      <tr>

                        <td>
                          ${escapeHTML(
                            record.game_date
                          )}
                        </td>

                        <td>
                          ${formatTime(
                            record.end_time
                          )}
                        </td>

                        <td
                          class="history-loser"
                        >
                          ${escapeHTML(
                            loser.replace(
                              /\s*\|\s*Mobile:.*$/i,
                              ""
                            )
                          )}
                        </td>

                        <td>
                          ${escapeHTML(
                            mobile
                          )}
                        </td>

                        <td>
                          Table
                          ${escapeHTML(
                            record.table_number
                          )}
                        </td>

                        <td>
                          ${getHistoryGameCount(
                            record
                          )}
                        </td>

                        <td
                          class="unpaid-highlight"
                        >
                          ₹${Number(
                            record.amount ||
                            0
                          )}
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

    };


  document
    .getElementById(
      "unpaidSearch"
    )
    .addEventListener(
      "input",
      render
    );


  render();

}


/* =========================================================
   LOGIN REQUIRED UNPAID
========================================================= */

async function requireLoginForUnpaid() {

  const {
    data: { session }
  } =
    await db.auth.getSession();

  if (!session) {

    showLoginModal();

    return;

  }

  openUnpaidHistory();

}


/* =========================================================
   PERIODIC
========================================================= */

setInterval(
  async () => {

    if (
      !appInitialized
    ) {
      return;
    }

    await updateStats();

  },
  30000
);
