/* =========================================================
   VANTARA SNOOKER ACADEMY
   COMPLETE TABLE MANAGEMENT SYSTEM

   FIXED:
   - Login
   - Individual game sessions
   - Continue game
   - Add/remove players
   - ₹20 extra player charge PER GAME
   - Editable price
   - Editable final amount
   - Manual loser name
   - Unpaid + optional mobile
   - Unpaid search
   - Multiple game totals
   - Individual loser history
   - Game count in history
   - Custom rate stored per game
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
  "VANTARA_SESSION_V3|";


/* =========================================================
   STATE
========================================================= */

let activeGames = [];

let selectedTable = null;

let selectedGame = "Snooker";

let selectedPayment = "Cash";

let selectedRate = 0;

let playerList = ["", ""];

let selectedLoser = "";

let toastTimer = null;

let appInitialized = false;

let realtimeChannel = null;

let currentEndGame = null;

let pendingContinueData = null;

window.currentUnpaidRecords = [];


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

const unpaidBtn =
  document.getElementById("unpaidBtn");

const unpaidBadge =
  document.getElementById("unpaidBadge");

const historyBtn =
  document.getElementById("historyBtn");

const connectionStatus =
  document.getElementById("connectionStatus");

const clock =
  document.getElementById("clock");

const modalBackdrop =
  document.getElementById("modalBackdrop");

const modal =
  document.getElementById("modal");

const toast =
  document.getElementById("toast");


/* =========================================================
   INIT
========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  async () => {

    startClock();

    setupEvents();

    try {

      const {
        data: {
          session
        },
        error
      } =
        await db.auth.getSession();

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

    } catch (error) {

      console.error(
        "Initialization error:",
        error
      );

      showLoginModal();

    }

  }
);


/* =========================================================
   INITIALIZE APP
========================================================= */

async function initializeApp() {

  if (appInitialized) {
    return;
  }

  appInitialized = true;

  renderTables();

  await loadActiveGames();

  await updateStats();

  await updateUnpaidCount();

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

        await updateStats();

        await updateUnpaidCount();

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
   LOCK APPLICATION
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

  unpaidBadge.textContent =
    "0";

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

  historyBtn?.addEventListener(
    "click",
    requireLoginForHistory
  );

  unpaidBtn?.addEventListener(
    "click",
    requireLoginForUnpaid
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

    clock.textContent =
      new Date().toLocaleTimeString(
        "en-IN",
        {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false
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

  connectionStatus.classList.add(
    online
      ? "online"
      : "offline"
  );

  connectionStatus.innerHTML =
    `<span></span> ${
      escapeHTML(
        text ||
        (
          online
            ? "Connected"
            : "Offline"
        )
      )
    }`;

}


/* =========================================================
   ACTIVE GAMES
========================================================= */

async function loadActiveGames() {

  try {

    const {
      data,
      error
    } =
      await db
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

    await updateStats();

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
        "vantara-live"
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

      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "game_history"
        },
        async () => {

          await updateStats();

          await updateUnpaidCount();

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


function getGameRate(
  game
) {

  const customRate =
    Number(
      game?.custom_rate
    );

  if (
    Number.isFinite(
      customRate
    ) &&
    customRate >= 0
  ) {

    return customRate;

  }

  return getTableRate(
    game?.table_number
  );

}


/* =========================================================
   SESSION ENCODING
========================================================= */

function encodeSession(
  session
) {

  try {

    const json =
      JSON.stringify(
        session
      );

    const encoded =
      btoa(
        unescape(
          encodeURIComponent(
            json
          )
        )
      );

    return (
      SESSION_PREFIX +
      encoded
    );

  } catch (error) {

    console.error(
      "Session encode error:",
      error
    );

    return (
      SESSION_PREFIX +
      btoa(
        JSON.stringify(
          session
        )
      )
    );

  }

}


function decodeSession(
  value
) {

  if (
    typeof value !==
    "string"
  ) {

    return null;

  }

  if (
    !value.startsWith(
      SESSION_PREFIX
    )
  ) {

    return null;

  }

  try {

    const encoded =
      value.slice(
        SESSION_PREFIX.length
      );

    const json =
      decodeURIComponent(
        escape(
          atob(encoded)
        )
      );

    return JSON.parse(
      json
    );

  } catch (error) {

    console.error(
      "Session decode error:",
      error
    );

    return null;

  }

}


function getSession(
  game
) {

  const parsed =
    decodeSession(
      game?.game
    );

  if (
    parsed &&
    Array.isArray(
      parsed.games
    )
  ) {

    return parsed;

  }

  return {

    version: 3,

    original_started_at:
      game?.started_at ||
      new Date().toISOString(),

    games: []

  };

}


function getPreviousGames(
  game
) {

  const session =
    getSession(game);

  return Array.isArray(
    session.games
  )
    ? session.games
    : [];

}


/* =========================================================
   DISPLAY GAME NAME
========================================================= */

function getCurrentGameName(
  game
) {

  const session =
    decodeSession(
      game?.game
    );

  if (
    session &&
    session.current_game
  ) {

    return session.current_game;

  }

  return (
    game?.game ||
    "Snooker"
  );

}


/* =========================================================
   TABLE RENDER
========================================================= */

function renderTables() {

  floorGrid.innerHTML = "";

  for (
    let tableNumber = 1;
    tableNumber <= TOTAL_TABLES;
    tableNumber++
  ) {

    const game =
      getActiveGame(
        tableNumber
      );

    floorGrid.appendChild(
      game
        ? createPlayingTable(game)
        : createAvailableTable(
            tableNumber
          )
    );

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
    getCurrentGameName(
      game
    );

  const previousGames =
    getPreviousGames(
      game
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
          Table ${escapeHTML(
            game.table_number
          )}
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
            previousGames.length
              ? ` · ${
                  previousGames.length + 1
                } games`
              : ""
          }

        </div>

        <div class="timer">
          ${formatDuration(
            elapsed
          )}
        </div>

      </div>

    </div>

  `;


  card.addEventListener(
    "click",
    () =>
      openEndGameModal(
        game
      )
  );

  return card;

}


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

  selectedRate =
    getTableRate(
      tableNumber
    );

  selectedPayment =
    "Cash";

  playerList =
    ["", ""];

  renderStartModal();

  openModal();

}


function renderStartModal() {

  const rate =
    Number(selectedRate) ||
    0;

  modal.dataset.loginRequired =
    "false";

  modal.innerHTML = `

    <h2>
      Start Table
    </h2>

    <div class="modal-sub">

      Table
      ${escapeHTML(
        selectedTable
      )}

      · Start new game

    </div>


    <label class="form-label">
      Game
    </label>

    <div class="game-options">

      ${GAME_TYPES
        .map(
          gameType =>
            `
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
        )
        .join("")}

    </div>


    <label class="form-label">
      Price per Hour
    </label>

    <div class="amount-input-wrap">

      <span class="amount-symbol">
        ₹
      </span>

      <input
        id="startRate"
        class="input amount-input"
        type="number"
        min="0"
        step="1"
        value="${rate}"
        inputmode="numeric"
      >

    </div>


    <div class="amount-edit-hint">
      You can change the table price for this game.
    </div>


    <label class="form-label">
      Players
    </label>

    <div id="startPlayers">

      ${playerList
        .map(
          (
            player,
            index
          ) =>
            `
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
                  playerList.length > 1
                    ? `
                      <button
                        type="button"
                        class="remove-player remove-start-player"
                        data-index="${index}"
                      >
                        ×
                      </button>
                    `
                    : ""
                }

              </div>
            `
        )
        .join("")}

    </div>


    <button
      type="button"
      class="add-btn"
      id="addStartPlayer"
    >
      + Add Player
    </button>


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

      <div class="bill-line bill-total">

        <span>
          Starting amount
        </span>

        <b id="startTotal">
          ₹${rate}
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
    .getElementById(
      "startRate"
    )
    ?.addEventListener(
      "input",
      event => {

        const value =
          Number(
            event.target.value
          );

        if (
          Number.isFinite(
            value
          ) &&
          value >= 0
        ) {

          selectedRate =
            value;

          updateStartPricePreview();

        }

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
      ".remove-start-player"
    )
    .forEach(
      button => {

        button.addEventListener(
          "click",
          () => {

            playerList.splice(
              Number(
                button.dataset.index
              ),
              1
            );

            if (
              playerList.length <
              1
            ) {

              playerList =
                [""];

            }

            renderStartModal();

          }
        );

      }
    );


  document
    .getElementById(
      "addStartPlayer"
    )
    ?.addEventListener(
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
    ?.addEventListener(
      "click",
      closeModal
    );


  document
    .getElementById(
      "startGameBtn"
    )
    ?.addEventListener(
      "click",
      startGame
    );

}


function updatePlayerPreview() {

  const players =
    normalizePlayers(
      playerList
    );

  const extra =
    calculateExtraPlayerCharge(
      players.length
    );

  const rate =
    Number(selectedRate) || 0;

  const count =
    document.getElementById(
      "startPlayerCount"
    );

  const extraEl =
    document.getElementById(
      "startExtra"
    );

  const totalEl =
    document.getElementById(
      "startTotal"
    );

  if (count) {
    count.textContent =
      String(players.length);
  }

  if (extraEl) {
    extraEl.textContent =
      `₹${extra}`;
  }

  if (totalEl) {
    totalEl.textContent =
      `₹${Math.round(
        rate + extra
      )}`;
  }

}


function updateStartPricePreview() {

  updatePlayerPreview();

}


/* =========================================================
   START GAME SAVE
========================================================= */

async function startGame() {

  const {
    data: {
      session
    }
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


  const customRate =
    Number(
      selectedRate
    );


  if (
    !Number.isFinite(
      customRate
    ) ||
    customRate < 0
  ) {

    showToast(
      "Enter a valid hourly price"
    );

    return;
  }


  if (
    !players[0]
  ) {

    showToast(
      "Enter Player 1 name"
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


    const sessionData = {

      version: 3,

      original_started_at:
        startedAt,

      games: [],

      current_game:
        selectedGame,

      current_rate:
        customRate

    };


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
            encodeSession(
              sessionData
            ),

          players,

          custom_rate:
            customRate,

          started_at:
            startedAt

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

    showToast(
      error.code === "23505"
        ? "This table is already playing"
        : (
            error.message ||
            "Could not start game"
          )
    );

  }

}


/* =========================================================
   FINISH GAME MODAL
========================================================= */

function openEndGameModal(
  game
) {

  currentEndGame =
    game;

  selectedPayment =
    "Cash";

  selectedLoser =
    "";

  pendingContinueData =
    null;

  renderEndModal(
    game
  );

  openModal();

}


function renderEndModal(
  game
) {

  const players =
    normalizePlayers(
      game.players
    );

  const currentGameName =
    getCurrentGameName(
      game
    );

  const duration =
    getDurationMinutes(
      game.started_at
    );

  const rate =
    getGameRate(
      game
    );

  const calculated =
    calculateAmount(
      game.table_number,
      duration,
      players.length,
      rate
    );

  const previousGames =
    getPreviousGames(
      game
    );

  const previousTotal =
    getSessionTotal(
      game
    );

  const currentDefault =
    calculated;

  const grandPreview =
    Math.round(
      previousTotal +
      currentDefault
    );


  modal.dataset.loginRequired =
    "false";


  modal.innerHTML = `

    <h2>
      Finish Game
    </h2>

    <div class="modal-sub">

      Table
      ${escapeHTML(
        game.table_number
      )}

      ·

      ${escapeHTML(
        currentGameName
      )}

      ${
        previousGames.length
          ? ` · Game ${
              previousGames.length + 1
            }`
          : ""
      }

    </div>


    ${
      previousGames.length
        ? `
          <div class="continue-note">

            This table already has
            ${previousGames.length}
            completed game${
              previousGames.length === 1
                ? ""
                : "s"
            }.

            Their amount will be
            <b>added</b>
            to this game's amount.

            <div class="continue-game-list">

              ${previousGames
                .map(
                  (
                    item,
                    index
                  ) =>
                    `
                      <div class="continue-game-item">

                        <div>

                          <div class="continue-game-title">

                            Game ${
                              index + 1
                            }

                            ·

                            ${escapeHTML(
                              item.game ||
                              "Game"
                            )}

                          </div>

                          <div class="continue-game-loser">

                            Loser:

                            ${escapeHTML(
                              item.loser ||
                              "-"
                            )}

                          </div>

                        </div>

                        <div class="continue-game-amount">

                          ₹${Number(
                            item.amount ||
                            0
                          )}

                        </div>

                      </div>
                    `
                )
                .join("")}

            </div>

          </div>
        `
        : ""
    }


    <div class="bill">

      <div class="bill-line">

        <span>
          Current players
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
            duration
          )}
        </b>

      </div>


      <div class="bill-line">

        <span>
          Current table rate
        </span>

        <b>
          ₹${rate}/hr
        </b>

      </div>


      <div class="bill-line">

        <span>
          Current extra players
        </span>

        <b>
          ₹${calculateExtraPlayerCharge(
            players.length
          )}
        </b>

      </div>


      <div class="bill-line">

        <span>
          Current game calculated
        </span>

        <b>
          ₹${currentDefault}
        </b>

      </div>


      ${
        previousGames.length
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
          Total if closed now
        </span>

        <b id="grandTotalPreview">
          ₹${grandPreview}
        </b>

      </div>

    </div>


    <label class="form-label">
      Current Game Amount
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
        value="${currentDefault}"
        inputmode="numeric"
      >

    </div>


    <div class="amount-edit-hint">

      Edit this game's amount manually.
      Previous game amounts stay separate.

    </div>


    <div class="loser-box">

      <label class="form-label">
        Who lost this game?
      </label>

      <div class="loser-hint">

        Enter the loser manually.
        This person will be shown as the payer.

      </div>

      <input
        id="loserName"
        class="input loser-input"
        type="text"
        placeholder="Enter loser name"
        autocomplete="off"
      >

      <div
        id="loserRequired"
        class="required-message"
      >
        Enter the loser's name before continuing.
      </div>

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
        class="pay-option unpaid-option"
        data-payment="Unpaid"
      >
        Not Paid
      </button>

    </div>


    <div
      id="unpaidMobileWrap"
      class="unpaid-mobile-wrap"
    >

      <div class="unpaid-mobile-label">

        UNPAID MOBILE NUMBER · OPTIONAL

      </div>

      <input
        id="unpaidMobile"
        class="input"
        type="tel"
        inputmode="numeric"
        maxlength="15"
        placeholder="Enter mobile number (optional)"
      >

      <div class="unpaid-mobile-hint">

        Optional.
        If entered, it will appear in Unpaid History.

      </div>

    </div>


    <div class="continue-actions">

      <button
        type="button"
        class="btn btn-secondary"
        id="cancelEnd"
      >
        Cancel
      </button>

      <button
        type="button"
        class="btn btn-continue"
        id="continueGameBtn"
      >
        Continue → Next Game
      </button>

      <button
        type="button"
        class="btn btn-primary"
        id="finishGameBtn"
      >
        Complete Table
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


            const unpaidWrap =
              document.getElementById(
                "unpaidMobileWrap"
              );

            if (
              unpaidWrap
            ) {

              unpaidWrap.classList.toggle(
                "show",
                selectedPayment ===
                  "Unpaid"
              );

            }

          }
        );

      }
    );


  document
    .getElementById(
      "finalAmount"
    )
    ?.addEventListener(
      "input",
      () => {

        updateGrandTotalPreview(
          game
        );

      }
    );


  document
    .getElementById(
      "cancelEnd"
    )
    ?.addEventListener(
      "click",
      closeModal
    );


  document
    .getElementById(
      "continueGameBtn"
    )
    ?.addEventListener(
      "click",
      () =>
        prepareContinueGame(
          game
        )
    );


  document
    .getElementById(
      "finishGameBtn"
    )
    ?.addEventListener(
      "click",
      () =>
        completeWholeTable(
          game
        )
    );

}


/* =========================================================
   GRAND TOTAL
========================================================= */

function updateGrandTotalPreview(
  game
) {

  const input =
    document.getElementById(
      "finalAmount"
    );

  const currentAmount =
    Number(
      input?.value
    );

  const previousTotal =
    getSessionTotal(
      game
    );

  const total =
    previousTotal +
    (
      Number.isFinite(
        currentAmount
      ) &&
      currentAmount >= 0
        ? currentAmount
        : 0
    );

  const element =
    document.getElementById(
      "grandTotalPreview"
    );

  if (element) {

    element.textContent =
      `₹${Math.round(
        total
      )}`;

  }

}


/* =========================================================
   PREPARE CONTINUE
========================================================= */

function prepareContinueGame(
  game
) {

  const amountInput =
    document.getElementById(
      "finalAmount"
    );

  const loserInput =
    document.getElementById(
      "loserName"
    );

  const currentAmount =
    Number(
      amountInput?.value
    );

  const loser =
    loserInput?.value
      ?.trim() ||
    "";


  if (
    !Number.isFinite(
      currentAmount
    ) ||
    currentAmount < 0
  ) {

    showToast(
      "Enter a valid amount for this game"
    );

    return;

  }


  if (!loser) {

    document
      .getElementById(
        "loserRequired"
      )
      ?.classList.add(
        "show"
      );

    showToast(
      "Enter who lost this game"
    );

    return;

  }


  pendingContinueData = {

    amount:
      Math.round(
        currentAmount
      ),

    loser,

    mobile:
      selectedPayment ===
      "Unpaid"
        ? (
            document.getElementById(
              "unpaidMobile"
            )?.value ||
            ""
          ).trim()
        : "",

    payment:
      selectedPayment

  };


  openContinueSetup(
    game
  );

}


/* =========================================================
   CONTINUE SETUP
========================================================= */

function openContinueSetup(
  game
) {

  playerList =
    normalizePlayers(
      game.players
    );

  selectedRate =
    getGameRate(
      game
    );

  selectedGame =
    getCurrentGameName(
      game
    );

  renderContinueSetup(
    game
  );

}


function renderContinueSetup(
  game
) {

  const players =
    normalizePlayers(
      playerList
    );

  const rate =
    Number.isFinite(
      Number(selectedRate)
    )
      ? Number(selectedRate)
      : getGameRate(
          game
        );

  const extra =
    calculateExtraPlayerCharge(
      players.length
    );

  const currentGameAmount =
    pendingContinueData
      ?.amount || 0;

  const previousTotal =
    getSessionTotal(
      game
    );

  const projectedTotal =
    previousTotal +
    currentGameAmount;


  modal.innerHTML = `

    <h2>
      Continue Table
    </h2>

    <div class="modal-sub">

      Table
      ${escapeHTML(
        game.table_number
      )}

      · Starting next game

    </div>


    <div class="continue-note">

      Game
      ${
        getPreviousGames(
          game
        ).length + 1
      }

      has been saved as

      <b>
        ₹${currentGameAmount}
      </b>

      with loser

      <b>
        ${escapeHTML(
          pendingContinueData
            ?.loser ||
          "-"
        )}
      </b>.

      That amount will be added to the final table total.

    </div>


    <div class="bill">

      <div class="bill-line">

        <span>
          Previous games
        </span>

        <b>
          ₹${previousTotal}
        </b>

      </div>


      <div class="bill-line">

        <span>
          Just completed
        </span>

        <b>
          ₹${currentGameAmount}
        </b>

      </div>


      <div class="bill-line bill-total">

        <span>
          Total before next game
        </span>

        <b>
          ₹${projectedTotal}
        </b>

      </div>

    </div>


    <label class="form-label">
      Next Game
    </label>

    <div class="game-options">

      ${GAME_TYPES
        .map(
          gameType =>
            `
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
        )
        .join("")}

    </div>


    <label class="form-label">
      Price per Hour
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
        value="${rate}"
        inputmode="numeric"
      >

    </div>


    <label class="form-label">
      Players for Next Game
    </label>

    <div id="continuePlayers">

      ${playerList
        .map(
          (
            player,
            index
          ) =>
            `
              <div class="player-row">

                <input
                  class="input continue-player-input"
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
                  playerList.length > 1
                    ? `
                      <button
                        type="button"
                        class="remove-player continue-remove-player"
                        data-index="${index}"
                      >
                        ×
                      </button>
                    `
                    : ""
                }

              </div>
            `
        )
        .join("")}

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
          Players
        </span>

        <b id="continuePlayerCount">
          ${players.length}
        </b>

      </div>


      <div class="bill-line">

        <span>
          Extra player charge
        </span>

        <b id="continueExtra">
          ₹${extra}
        </b>

      </div>


      <div class="bill-line bill-total">

        <span>
          Next game's starting amount
        </span>

        <b id="continueNextAmount">
          ₹${Math.round(
            rate +
            extra
          )}
        </b>

      </div>

    </div>


    <div class="modal-actions">

      <button
        type="button"
        class="btn btn-secondary"
        id="backToFinish"
      >
        Back
      </button>

      <button
        type="button"
        class="btn btn-primary"
        id="saveContinueBtn"
      >
        Start Next Game
      </button>

    </div>

  `;


  setupContinueEvents(
    game
  );

}


/* =========================================================
   CONTINUE EVENTS
========================================================= */

function setupContinueEvents(
  game
) {

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
    .getElementById(
      "continueRate"
    )
    ?.addEventListener(
      "input",
      event => {

        const value =
          Number(
            event.target.value
          );

        if (
          Number.isFinite(
            value
          ) &&
          value >= 0
        ) {

          selectedRate =
            value;

          updateContinuePreview();

        }

      }
    );


  document
    .querySelectorAll(
      ".continue-player-input"
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
      ".continue-remove-player"
    )
    .forEach(
      button => {

        button.addEventListener(
          "click",
          () => {

            playerList.splice(
              Number(
                button.dataset.index
              ),
              1
            );

            if (
              playerList.length <
              1
            ) {

              playerList =
                [""];

            }

            renderContinueSetup(
              game
            );

          }
        );

      }
    );


  document
    .getElementById(
      "continueAddPlayer"
    )
    ?.addEventListener(
      "click",
      () => {

        playerList.push("");

        renderContinueSetup(
          game
        );

      }
    );


  document
    .getElementById(
      "backToFinish"
    )
    ?.addEventListener(
      "click",
      () => {

        pendingContinueData =
          null;

        renderEndModal(
          game
        );

      }
    );


  document
    .getElementById(
      "saveContinueBtn"
    )
    ?.addEventListener(
      "click",
      () =>
        saveContinueGame(
          game
        )
    );

}


function updateContinuePreview() {

  const players =
    normalizePlayers(
      playerList
    );

  const rate =
    Number.isFinite(
      Number(selectedRate)
    )
      ? Number(selectedRate)
      : 0;

  const extra =
    calculateExtraPlayerCharge(
      players.length
    );

  const nextAmount =
    Math.round(
      rate +
      extra
    );


  const countElement =
    document.getElementById(
      "continuePlayerCount"
    );

  const extraElement =
    document.getElementById(
      "continueExtra"
    );

  const amountElement =
    document.getElementById(
      "continueNextAmount"
    );


  if (countElement) {

    countElement.textContent =
      String(
        players.length
      );

  }

  if (extraElement) {

    extraElement.textContent =
      `₹${extra}`;

  }

  if (amountElement) {

    amountElement.textContent =
      `₹${nextAmount}`;

  }

}


/* =========================================================
   SAVE CONTINUE
========================================================= */

async function saveContinueGame(
  game
) {

  document
    .querySelectorAll(
      ".continue-player-input"
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

  const rate =
    Number(
      document.getElementById(
        "continueRate"
      )?.value
    );


  if (
    !players.length
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
      "Enter a valid hourly price"
    );

    return;

  }


  if (
    !pendingContinueData
  ) {

    showToast(
      "Previous game details are missing"
    );

    return;

  }


  const button =
    document.getElementById(
      "saveContinueBtn"
    );

  button.disabled =
    true;

  button.textContent =
    "Starting...";


  try {

    const session =
      getSession(
        game
      );


    const currentGameName =
      getCurrentGameName(
        game
      );


    const now =
      new Date();


    session.games.push({

      game:
        currentGameName,

      started_at:
        game.started_at,

      ended_at:
        now.toISOString(),

      amount:
        Math.round(
          pendingContinueData.amount
        ),

      rate:
        getGameRate(game),

      players:
        normalizePlayers(
          game.players
        ),

      loser:
        pendingContinueData.loser,

      mobile:
        pendingContinueData.mobile ||
        "",

      payment:
        "Pending"

    });


    const nextStartedAt =
      now.toISOString();


    session.current_game =
      selectedGame;

    session.current_rate =
      rate;


    const {
      error
    } =
      await db
        .from(
          "active_games"
        )
        .update({

          game:
            encodeSession(
              session
            ),

          players,

          custom_rate:
            rate,

          started_at:
            nextStartedAt

        })
        .eq(
          "id",
          game.id
        );


    if (error) {
      throw error;
    }


    pendingContinueData =
      null;


    closeModal();

    showToast(
      `Game ${
        session.games.length + 1
      } started · previous amount added`
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
   COMPLETE WHOLE TABLE
========================================================= */

async function completeWholeTable(
  game
) {

  const {
    data: {
      session
    }
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

  const loserInput =
    document.getElementById(
      "loserName"
    );


  const currentAmount =
    Number(
      amountInput?.value
    );

  const loser =
    loserInput?.value
      ?.trim() ||
    "";


  if (
    !Number.isFinite(
      currentAmount
    ) ||
    currentAmount < 0
  ) {

    showToast(
      "Enter a valid final amount"
    );

    return;

  }


  if (!loser) {

    document
      .getElementById(
        "loserRequired"
      )
      ?.classList.add(
        "show"
      );

    showToast(
      "Enter who lost this game"
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
      getSession(
        game
      );


    const currentGameName =
      getCurrentGameName(
        game
      );


    const completedGames =
      Array.isArray(
        sessionData.games
      )
        ? [
            ...sessionData.games
          ]
        : [];


    completedGames.push({

      game:
        currentGameName,

      started_at:
        game.started_at,

      ended_at:
        now.toISOString(),

      amount:
        Math.round(
          currentAmount
        ),

      rate:
        getGameRate(game),

      players,

      loser,

      mobile,

      payment:
        selectedPayment

    });


    /*
      IMPORTANT:
      Total is ALWAYS addition.

      Game 1 = 200
      Game 2 = 200
      Game 3 = 220

      Final = 620

      Never:
      200 → 400 → 800
    */

    const totalAmount =
      completedGames.reduce(
        (
          sum,
          item
        ) =>
          sum +
          Number(
            item.amount || 0
          ),
        0
      );


    const calculatedTotal =
      completedGames.reduce(
        (
          sum,
          item
        ) => {

          const itemPlayers =
            normalizePlayers(
              item.players
            );

          const itemRate =
            Number(
              item.rate
            );

          const fallbackRate =
            Number.isFinite(
              itemRate
            ) &&
            itemRate >= 0
              ? itemRate
              : getTableRate(
                  game.table_number
                );

          const itemDuration =
            calculateMinutesBetween(
              item.started_at,
              item.ended_at
            );

          return (
            sum +
            calculateAmount(
              game.table_number,
              itemDuration,
              itemPlayers.length,
              fallbackRate
            )
          );

        },
        0
      );


    const gameSummary =
      buildGameSummary(
        completedGames
      );


    const loserSummary =
      buildLoserSummary(
        completedGames
      );


    const finalLoserField =
      loserSummary;


    const gameDate =
      formatDateForDB(
        new Date(
          sessionData.original_started_at ||
          game.started_at
        )
      );


    const startTime =
      sessionData.original_started_at ||
      game.started_at;


    const endTime =
      now.toISOString();


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

          loser:
            finalLoserField,

          game:
            gameSummary,

          calculated_amount:
            Math.round(
              calculatedTotal
            ),

          amount:
            Math.round(
              totalAmount
            ),

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


    closeModal();


    if (
      selectedPayment ===
      "Unpaid"
    ) {

      showToast(
        `UNPAID · ₹${totalAmount} · ${completedGames.length} games`
      );

    } else {

      showToast(
        `Completed · ₹${totalAmount} · ${completedGames.length} games`
      );

    }


    await loadActiveGames();

    await updateStats();

    await updateUnpaidCount();


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
   AMOUNT CALCULATION
========================================================= */

function calculateAmount(
  tableNumber,
  durationMinutes,
  playerCount,
  rateOverride = null
) {

  const override =
    Number(
      rateOverride
    );

  const rate =
    Number.isFinite(
      override
    ) &&
    override >= 0
      ? override
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


function calculateExtraPlayerCharge(
  playerCount
) {

  const extraPlayers =
    Math.max(
      0,
      Number(playerCount) - 2
    );

  return (
    extraPlayers *
    EXTRA_PLAYER_CHARGE
  );

}


function getSessionTotal(
  game
) {

  return getPreviousGames(
    game
  ).reduce(
    (
      sum,
      item
    ) =>
      sum +
      Number(
        item.amount || 0
      ),
    0
  );

}


/* =========================================================
   SUMMARIES
========================================================= */

function buildGameSummary(
  games
) {

  const list =
    Array.isArray(games)
      ? games
      : [];


  return (
    `${list.length} Game${
      list.length === 1
        ? ""
        : "s"
    } · ` +

    list
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
          } · ₹${
            Number(
              item.amount || 0
            )
          }`
      )
      .join(
        " + "
      )
  );

}


function buildLoserSummary(
  games
) {

  const list =
    Array.isArray(games)
      ? games
      : [];


  return list
    .map(
      (
        item,
        index
      ) => {

        const loser =
          item.loser ||
          "Not recorded";

        const mobile =
          item.mobile
            ? ` · Mobile: ${item.mobile}`
            : "";

        return (
          `Game ${
            index + 1
          }: ${
            loser
          }${mobile}`
        );

      }
    )
    .join(
      " · "
    );

}


/* =========================================================
   LOGIN PROTECTION
========================================================= */

async function requireLoginForHistory() {

  const {
    data: {
      session
    }
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
    data: {
      session
    }
  } =
    await db.auth.getSession();

  if (!session) {

    showLoginModal();

    return;

  }

  openUnpaidModal();

}


/* =========================================================
   LOGIN
========================================================= */

function showLoginModal() {

  modal.dataset.loginRequired =
    "true";

  modal.innerHTML = `

    <div class="auth-logo">
      V
    </div>

    <h2>
      Owner Login
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
      placeholder="Owner email"
      autocomplete="email"
    >


    <label class="form-label">
      Password
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
      class="required-message"
    ></div>


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


  document
    .getElementById(
      "loginBtn"
    )
    ?.addEventListener(
      "click",
      loginUser
    );


  document
    .getElementById(
      "loginPassword"
    )
    ?.addEventListener(
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

}


async function loginUser() {

  const email =
    document
      .getElementById(
        "loginEmail"
      )
      ?.value
      ?.trim();

  const password =
    document
      .getElementById(
        "loginPassword"
      )
      ?.value;


  if (!email || !password) {

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
      error
    } =
      await db.auth.signInWithPassword({

        email,

        password

      });


    if (error) {
      throw error;
    }


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
   HISTORY
========================================================= */

async function openHistoryModal() {

  modal.dataset.loginRequired =
    "false";


  modal.innerHTML = `

    <h2>
      History
    </h2>

    <div class="modal-sub">
      Search and export your table records.
    </div>


    <div class="history-controls">

      <input
        id="historySearch"
        class="input"
        type="search"
        placeholder="Search any detail..."
        autocomplete="off"
      >


      <div class="date-selector">

        <input
          id="historyDate"
          class="input"
          type="date"
          value="${getTodayDate()}"
        >

        <button
          type="button"
          class="btn btn-secondary"
          id="loadHistoryBtn"
        >
          Load
        </button>

      </div>

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
    ?.addEventListener(
      "click",
      () => {

        loadHistory(
          document.getElementById(
            "historyDate"
          )?.value ||
          getTodayDate()
        );

      }
    );


  document
    .getElementById(
      "historySearch"
    )
    ?.addEventListener(
      "input",
      event => {

        const content =
          document.getElementById(
            "historyContent"
          );

        if (
          content &&
          Array.isArray(
            window.currentHistoryRecords
          )
        ) {

          renderFilteredHistory(
            window.currentHistoryRecords,
            event.target.value,
            content
          );

        }

      }
    );


  await loadHistory(
    getTodayDate()
  );

}


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
    `<div class="empty">
      Loading...
    </div>`;


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


    window.currentHistoryRecords =
      data || [];


    renderFilteredHistory(
      data || [],
      "",
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


function renderFilteredHistory(
  records,
  searchTerm,
  container,
  date
) {

  const search =
    String(
      searchTerm ||
      ""
    )
      .trim()
      .toLowerCase();


  const filtered =
    records.filter(
      record =>
        !search ||
        recordSearchText(
          record
        ).includes(
          search
        )
    );


  renderHistory(
    filtered,
    container,
    date ||
    getTodayDate()
  );

}


function renderHistory(
  records,
  container,
  date
) {

  const paidRecords =
    records.filter(
      record =>
        String(
          record.payment ||
          ""
        ).toLowerCase() !==
        "unpaid"
    );


  const total =
    paidRecords.reduce(
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
    paidRecords
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


  container.innerHTML = `

    <div class="history-summary">

      <div class="stat-card">

        <span>
          TABLE SESSIONS
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
          UNPAID
        </span>

        <strong style="color:var(--red)">
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

                  <th>TIME</th>
                  <th>TABLE</th>
                  <th>GAMES</th>
                  <th>PLAYERS</th>
                  <th>LOSERS</th>
                  <th>DURATION</th>
                  <th>TOTAL</th>
                  <th>PAYMENT</th>

                </tr>

              </thead>


              <tbody>

                ${records
                  .map(
                    record =>
                      renderHistoryRow(
                        record
                      )
                  )
                  .join("")}

              </tbody>

            </table>

          </div>

        `
        : `

          <div class="empty">

            No games found for
            ${escapeHTML(
              date
            )}.

          </div>

        `
    }


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
        Export Selected Date
      </button>

    </div>


    <div class="report-actions">

      <button
        class="btn btn-secondary"
        id="exportTodayBtn"
      >
        Export Today
      </button>


      <button
        class="btn btn-primary"
        id="exportMonthBtn"
      >
        Export Whole Month
      </button>

    </div>

  `;


  document
    .getElementById(
      "closeHistoryBtn"
    )
    ?.addEventListener(
      "click",
      closeModal
    );


  document
    .getElementById(
      "exportHistoryBtn"
    )
    ?.addEventListener(
      "click",
      () =>
        exportCSV(
          records,
          date
        )
    );


  document
    .getElementById(
      "exportTodayBtn"
    )
    ?.addEventListener(
      "click",
      async () => {

        const today =
          getTodayDate();

        const todayRecords =
          await fetchHistoryRange(
            today,
            today
          );

        exportCSV(
          todayRecords,
          today
        );

      }
    );


  document
    .getElementById(
      "exportMonthBtn"
    )
    ?.addEventListener(
      "click",
      async () => {

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

        const first =
          `${year}-${month}-01`;

        const lastDay =
          new Date(
            year,
            now.getMonth() + 1,
            0
          ).getDate();

        const last =
          `${year}-${month}-${String(
            lastDay
          ).padStart(
            2,
            "0"
          )}`;

        const monthRecords =
          await fetchHistoryRange(
            first,
            last
          );

        exportCSV(
          monthRecords,
          `${year}-${month}`
        );

      }
    );

}


async function fetchHistoryRange(
  startDate,
  endDate
) {

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
        .gte(
          "game_date",
          startDate
        )
        .lte(
          "game_date",
          endDate
        )
        .order(
          "game_date",
          {
            ascending: true
          }
        )
        .order(
          "created_at",
          {
            ascending: true
          }
        );


    if (error) {
      throw error;
    }

    return data || [];

  } catch (error) {

    console.error(
      "History range error:",
      error
    );

    showToast(
      "Could not load export data"
    );

    return [];

  }

}


function renderHistoryRow(
  record
) {

  const players =
    normalizePlayers(
      record.players
    );


  const gameDetails =
    parseGameSummary(
      record.game
    );


  const loserDetails =
    parseLoserSummary(
      record.loser
    );


  const isUnpaid =
    String(
      record.payment ||
      ""
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

        <div class="history-game-detail">

          ${gameDetails
            .map(
              item =>
                `
                  <div class="history-game-row">

                    <b>
                      ${escapeHTML(
                        item.title
                      )}
                    </b>

                    · ₹${Number(
                      item.amount ||
                      0
                    )}

                  </div>
                `
            )
            .join("")}

        </div>

      </td>


      <td>
        ${escapeHTML(
          players.join(", ")
        )}
      </td>


      <td class="history-loser">

        <div class="history-game-detail">

          ${loserDetails
            .map(
              item =>
                `
                  <div class="history-game-row">

                    <span class="history-game-loser">
                      ${escapeHTML(
                        item
                      )}
                    </span>

                  </div>
                `
            )
            .join("")}

        </div>

      </td>


      <td>
        ${calculateRecordDuration(
          record
        )}
      </td>


      <td>
        ₹${Number(
          record.amount ||
          0
        )}
      </td>


      <td
        style="
          color:${
            isUnpaid
              ? "var(--red)"
              : "var(--green)"
          };
          font-weight:600;
        "
      >

        ${escapeHTML(
          record.payment ||
          ""
        )}

      </td>

    </tr>

  `;

}


/* =========================================================
   PARSE GAME SUMMARY
========================================================= */

function parseGameSummary(
  value
) {

  const text =
    String(
      value ||
      ""
    );


  const match =
    text.match(
      /Game\s+\d+\s*:/gi
    );


  if (!match) {

    return [
      {
        title:
          text ||
          "Game",

        amount:
          0
      }
    ];

  }


  const parts =
    text
      .replace(
        /^\d+\s+Games?\s*·\s*/,
        ""
      )
      .split(
        /\s+\+\s+/
      );


  return parts.map(
    part => {

      const amountMatch =
        part.match(
          /₹\s*([\d.]+)\s*$/
        );


      return {

        title:
          part
            .replace(
              /₹\s*[\d.]+\s*$/,
              ""
            )
            .trim(),

        amount:
          amountMatch
            ? Number(
                amountMatch[1]
              )
            : 0

      };

    }
  );

}


/* =========================================================
   PARSE LOSER SUMMARY
========================================================= */

function parseLoserSummary(
  value
) {

  const text =
    String(
      value ||
      ""
    );


  if (!text) {

    return [
      "Not recorded"
    ];

  }


  return text
    .split(
      /\s+·\s+/
    )
    .filter(Boolean);

}


/* =========================================================
   UNPAID COUNT
========================================================= */

async function updateUnpaidCount() {

  try {

    const {
      count,
      error
    } =
      await db
        .from(
          "game_history"
        )
        .select(
          "id",
          {
            count:
              "exact",
            head: true
          }
        )
        .eq(
          "payment",
          "Unpaid"
        );


    if (error) {
      throw error;
    }


    const value =
      Number(
        count ||
        0
      );


    unpaidBadge.textContent =
      String(
        value
      );


  } catch (error) {

    console.error(
      "Unpaid count error:",
      error
    );

    unpaidBadge.textContent =
      "0";

  }

}


/* =========================================================
   UNPAID MODAL
========================================================= */

async function openUnpaidModal() {

  modal.dataset.loginRequired =
    "false";


  modal.innerHTML = `

    <h2>
      Unpaid Games
    </h2>

    <div class="modal-sub">

      Search by anything:
      loser, player, mobile,
      table, game, date,
      time, amount,
      payment or any stored detail.

    </div>


    <input
      id="unpaidSearch"
      class="input unpaid-search"
      type="search"
      placeholder="Search any detail..."
      autocomplete="off"
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
        id="closeUnpaidBtn"
      >
        Close
      </button>

    </div>

  `;


  openModal();


  document
    .getElementById(
      "closeUnpaidBtn"
    )
    ?.addEventListener(
      "click",
      closeModal
    );


  const search =
    document.getElementById(
      "unpaidSearch"
    );


  search?.addEventListener(
    "input",
    () =>
      renderUnpaidGames(
        window.currentUnpaidRecords ||
        [],
        search.value
      )
  );


  await loadUnpaidGames();

}


async function loadUnpaidGames() {

  const content =
    document.getElementById(
      "unpaidContent"
    );


  if (!content) {
    return;
  }


  content.innerHTML =
    `<div class="empty">
      Loading...
    </div>`;


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


    window.currentUnpaidRecords =
      data || [];


    renderUnpaidGames(
      data || [],
      ""
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
   SEARCH TEXT
========================================================= */

function recordSearchText(
  record
) {

  const players =
    normalizePlayers(
      record.players
    );


  return [

    record.id,

    record.game_date,

    record.start_time,

    record.end_time,

    record.table_number,

    record.player,

    record.loser,

    record.game,

    record.player_count,

    record.amount,

    record.calculated_amount,

    record.payment,

    calculateRecordDuration(
      record
    ),

    players.join(" "),

    JSON.stringify(
      record
    )

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

}


/* =========================================================
   RENDER UNPAID
========================================================= */

function renderUnpaidGames(
  records,
  searchTerm
) {

  const content =
    document.getElementById(
      "unpaidContent"
    );


  if (!content) {
    return;
  }


  const search =
    String(
      searchTerm ||
      ""
    )
      .trim()
      .toLowerCase();


  const filtered =
    records.filter(
      record =>
        !search ||
        recordSearchText(
          record
        ).includes(
          search
        )
    );


  if (
    !filtered.length
  ) {

    content.innerHTML =
      `
        <div class="empty">

          ${
            records.length
              ? "No matching unpaid game found."
              : "No unpaid games."
          }

        </div>
      `;

    return;

  }


  content.innerHTML = `

    <div class="unpaid-list">

      ${filtered
        .map(
          record => {

            const players =
              normalizePlayers(
                record.players
              );


            const loser =
              record.loser ||
              "Not recorded";


            const loserMatch =
              search &&
              String(
                loser
              )
                .toLowerCase()
                .includes(
                  search
                );


            return `

              <div
                class="unpaid-item ${
                  loserMatch
                    ? "loser-match"
                    : ""
                }"
              >

                <div>

                  <div class="unpaid-player">

                    ${
                      escapeHTML(
                        players.join(
                          ", "
                        )
                      ) ||
                      "Unknown player"
                    }

                  </div>


                  <div class="unpaid-loser">

                    LOSER / PAYER:

                    ${escapeHTML(
                      loser
                    )}

                  </div>


                  <div class="unpaid-details">

                    Table
                    ${escapeHTML(
                      record.table_number
                    )}

                    ·

                    ${escapeHTML(
                      record.game ||
                      ""
                    )}

                    ·

                    ${escapeHTML(
                      record.game_date ||
                      ""
                    )}

                    ·

                    ${escapeHTML(
                      formatTimeDisplay(
                        record.start_time
                      )
                    )}

                    ·

                    ${escapeHTML(
                      calculateRecordDuration(
                        record
                      )
                    )}

                    ·

                    ${players.length}
                    player${
                      players.length ===
                      1
                        ? ""
                        : "s"
                    }

                  </div>


                  <button
                    type="button"
                    class="unpaid-pay-btn"
                    data-id="${escapeAttribute(
                      record.id
                    )}"
                  >
                    Mark as Paid
                  </button>

                </div>


                <div class="unpaid-amount">

                  ₹${Number(
                    record.amount ||
                    0
                  )}

                </div>

              </div>

            `;

          }
        )
        .join("")}

    </div>

  `;


  document
    .querySelectorAll(
      ".unpaid-pay-btn"
    )
    .forEach(
      button => {

        button.addEventListener(
          "click",
          () => {

            const record =
              records.find(
                item =>
                  String(
                    item.id
                  ) ===
                  String(
                    button.dataset.id
                  )
              );


            if (record) {

              openMarkPaidModal(
                record
              );

            }

          }
        );

      }
    );

}


/* =========================================================
   MARK PAID
========================================================= */

function openMarkPaidModal(
  record
) {

  selectedPayment =
    "Cash";


  const players =
    normalizePlayers(
      record.players
    );


  const playerText =
    players.length
      ? players.join(
          ", "
        )
      : (
          record.player ||
          "Unknown"
        );


  modal.innerHTML = `

    <h2>
      Mark as Paid
    </h2>

    <div class="modal-sub">

      ${escapeHTML(
        playerText
      )}

      · Table
      ${escapeHTML(
        record.table_number
      )}

    </div>


    <div class="bill">

      <div class="bill-line">

        <span>
          Loser / payer
        </span>

        <b style="color:var(--red)">

          ${escapeHTML(
            record.loser ||
            "Not recorded"
          )}

        </b>

      </div>


      <div class="bill-line">

        <span>
          Game
        </span>

        <b>
          ${escapeHTML(
            record.game ||
            "Snooker"
          )}
        </b>

      </div>


      <div class="bill-line">

        <span>
          Date
        </span>

        <b>
          ${escapeHTML(
            record.game_date ||
            "-"
          )}
        </b>

      </div>


      <div class="bill-line">

        <span>
          Outstanding
        </span>

        <b
          style="
            color:var(--red);
            font-size:17px
          "
        >
          ₹${Number(
            record.amount ||
            0
          )}
        </b>

      </div>

    </div>


    <label class="form-label">
      Payment received through
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

    </div>


    <div class="modal-actions">

      <button
        type="button"
        class="btn btn-secondary"
        id="cancelMarkPaid"
      >
        Cancel
      </button>

      <button
        type="button"
        class="btn btn-primary"
        id="confirmMarkPaid"
      >
        Mark Paid
      </button>

    </div>

  `;


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

          }
        );

      }
    );


  document
    .getElementById(
      "cancelMarkPaid"
    )
    ?.addEventListener(
      "click",
      closeModal
    );


  document
    .getElementById(
      "confirmMarkPaid"
    )
    ?.addEventListener(
      "click",
      () =>
        markGameAsPaid(
          record
        )
    );

}


async function markGameAsPaid(
  record
) {

  const button =
    document.getElementById(
      "confirmMarkPaid"
    );

  if (button) {

    button.disabled =
      true;

    button.textContent =
      "Saving...";

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

          payment:
            selectedPayment ===
            "Online"
              ? "Online"
              : "Cash"

        })
        .eq(
          "id",
          record.id
        );


    if (error) {
      throw error;
    }


    closeModal();

    showToast(
      "Payment marked as received"
    );

    await updateUnpaidCount();

  } catch (error) {

    console.error(
      "Mark paid error:",
      error
    );

    if (button) {

      button.disabled =
        false;

      button.textContent =
        "Mark Paid";

    }

    showToast(
      error.message ||
      "Could not update payment"
    );

  }

}


/* =========================================================
   STATS
========================================================= */

async function updateStats() {

  try {

    const available =
      TOTAL_TABLES -
      activeGames.length;


    availableCount.textContent =
      String(
        Math.max(
          0,
          available
        )
      );


    playingCount.textContent =
      String(
        activeGames.length
      );


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


    const records =
      data || [];


    gamesCount.textContent =
      String(
        records.length
      );


    const total =
      records
        .filter(
          record =>
            String(
              record.payment ||
              ""
            ).toLowerCase() !==
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


    collection.textContent =
      `₹${total}`;


  } catch (error) {

    console.error(
      "Stats error:",
      error
    );

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

  modal.innerHTML = "";

}


/* =========================================================
   TOAST
========================================================= */

function showToast(
  message
) {

  clearTimeout(
    toastTimer
  );

  toast.textContent =
    message;

  toast.classList.add(
    "show"
  );


  toastTimer =
    setTimeout(
      () => {

        toast.classList.remove(
          "show"
        );

      },
      2800
    );

}


/* =========================================================
   TIME
========================================================= */

function getElapsedTime(
  startedAt
) {

  const start =
    new Date(
      startedAt
    ).getTime();

  const now =
    Date.now();

  return Math.max(
    0,
    Math.floor(
      (
        now -
        start
      ) / 60000
    )
  );

}


function getDurationMinutes(
  startedAt
) {

  return getElapsedTime(
    startedAt
  );

}


function calculateMinutesBetween(
  start,
  end
) {

  if (
    !start ||
    !end
  ) {

    return 0;

  }

  const startTime =
    new Date(
      start
    ).getTime();

  const endTime =
    new Date(
      end
    ).getTime();


  if (
    !Number.isFinite(
      startTime
    ) ||
    !Number.isFinite(
      endTime
    )
  ) {

    return 0;

  }


  return Math.max(
    0,
    Math.floor(
      (
        endTime -
        startTime
      ) / 60000
    )
  );

}


function formatDuration(
  minutes
) {

  const total =
    Math.max(
      0,
      Number(minutes) || 0
    );

  const hours =
    Math.floor(
      total / 60
    );

  const mins =
    total % 60;


  if (hours <= 0) {

    return `${mins}m`;

  }


  return `${hours}h ${mins}m`;

}


/* =========================================================
   DATE
========================================================= */

function getTodayDate() {

  const date =
    new Date();

  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() + 1
    ).padStart(
      2,
      "0"
    );

  const day =
    String(
      date.getDate()
    ).padStart(
      2,
      "0"
    );


  return `${year}-${month}-${day}`;

}


function formatDateForDB(
  date
) {

  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() + 1
    ).padStart(
      2,
      "0"
    );

  const day =
    String(
      date.getDate()
    ).padStart(
      2,
      "0"
    );


  return `${year}-${month}-${day}`;

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

    return String(
      value
    );

  }


  return date.toLocaleTimeString(
    "en-IN",
    {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false
    }
  );

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


  return formatDuration(
    calculateMinutesBetween(
      record.start_time,
      record.end_time
    )
  );

}


/* =========================================================
   PLAYERS
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
    "Games",
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
   AUTO REFRESH
========================================================= */

setInterval(
  () => {

    if (!appInitialized) {
      return;
    }

    updateStats();

    updateUnpaidCount();

    renderTables();

  },
  30000
);
