/* =========================================================
   VANTARA SNOOKER ACADEMY
   Complete App
========================================================= */


/* =========================================================
   SUPABASE
========================================================= */

const SUPABASE_URL =
  "https://crdwfhrbfxfydklpjroo.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_c0HV4psTPpzaEta9W4iJmA_FBsO3tT4";

const supabaseClient =
  window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
  );


/* =========================================================
   CONFIG
========================================================= */

const TABLES = [
  {
    number: 1,
    rate: 200
  },
  {
    number: 2,
    rate: 200
  },
  {
    number: 3,
    rate: 200
  },
  {
    number: 4,
    rate: 200
  },
  {
    number: 5,
    rate: 200
  },
  {
    number: 6,
    rate: 200
  }
];

const EXTRA_PLAYER_PRICE = 20;


/* =========================================================
   STATE
========================================================= */

let activeGames = {};

let historyRows = [];

let selectedDate =
  getIndiaDate();

let historySearchText = "";

let historyFilter = "selected";


/* =========================================================
   ELEMENTS
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

const clock =
  document.getElementById("clock");

const connectionStatus =
  document.getElementById("connectionStatus");

const modalBackdrop =
  document.getElementById("modalBackdrop");

const modal =
  document.getElementById("modal");

const toast =
  document.getElementById("toast");

const historyBtn =
  document.getElementById("historyBtn");

const unpaidBtn =
  document.getElementById("unpaidBtn");

const unpaidCount =
  document.getElementById("unpaidCount");


/* =========================================================
   INDIA DATE / TIME
========================================================= */

function getIndiaDate() {

  return new Intl.DateTimeFormat(
    "en-CA",
    {
      timeZone: "Asia/Kolkata"
    }
  ).format(
    new Date()
  );

}


function getIndiaTimeString(
  value = new Date()
) {

  return new Intl.DateTimeFormat(
    "en-IN",
    {
      timeZone: "Asia/Kolkata",
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      hour12: true
    }
  ).format(
    new Date(value)
  );

}


function getIndiaShortTime(
  value
) {

  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat(
    "en-IN",
    {
      timeZone: "Asia/Kolkata",
      hour: "numeric",
      minute: "2-digit",
      hour12: true
    }
  ).format(
    new Date(value)
  );

}


function formatDateDisplay(
  date
) {

  if (!date) {
    return "";
  }

  const parts =
    date.split("-");

  if (parts.length !== 3) {
    return date;
  }

  return `${parts[2]}-${parts[1]}-${parts[0]}`;

}


/* =========================================================
   CLOCK
========================================================= */

function updateClock() {

  clock.textContent =
    getIndiaTimeString();

}

setInterval(
  updateClock,
  1000
);

updateClock();


/* =========================================================
   TOAST
========================================================= */

let toastTimer;

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
   CONNECTION
========================================================= */

function setConnection(
  online
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
      online
        ? "Connected"
        : "Offline"
    }`;

}


/* =========================================================
   TABLE HELPERS
========================================================= */

function getTableConfig(
  tableNumber
) {

  return (
    TABLES.find(
      table =>
        table.number ===
        Number(tableNumber)
    ) ||
    {
      number:
        Number(tableNumber),
      rate: 200
    }
  );

}


function getPlayerCount(
  players
) {

  if (!Array.isArray(players)) {
    return 0;
  }

  return players.filter(
    p =>
      String(p || "").trim()
  ).length;

}


function calculateBaseAmount(
  game
) {

  const table =
    getTableConfig(
      game.table_number
    );

  const playerCount =
    getPlayerCount(
      game.players
    );

  const extraPlayers =
    Math.max(
      0,
      playerCount - 1
    );

  return (
    Number(table.rate) +
    (
      extraPlayers *
      EXTRA_PLAYER_PRICE
    )
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

  modalBackdrop.classList.remove(
    "open"
  );

  modal.innerHTML = "";

}


modalBackdrop.addEventListener(
  "click",
  event => {

    if (
      event.target ===
      modalBackdrop
    ) {
      closeModal();
    }

  }
);


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


function renderTables() {

  floorGrid.innerHTML = "";

  let available = 0;
  let playing = 0;

  TABLES.forEach(
    table => {

      const game =
        activeGames[
          table.number
        ];

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

        card.className =
          "table-card playing";

        const players =
          Array.isArray(game.players)
            ? game.players
            : [];

        const mainPlayer =
          players[0] ||
          "Players";

        const elapsed =
          getElapsed(
            game.started_at
          );

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
                ${escapeHTML(mainPlayer)}
              </div>

            </div>

            <div class="playing-meta">

              <div class="game-mini">
                ${escapeHTML(
                  game.game || "Snooker"
                )}
                ${
                  players.length > 1
                    ? ` · ${players.length} players`
                    : ""
                }
              </div>

              <div class="timer">
                ${elapsed}
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
          new Date(start).getTime()
        ) / 1000
      )
    );

  const hours =
    Math.floor(
      seconds / 3600
    );

  const minutes =
    Math.floor(
      (seconds % 3600) / 60
    );

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${minutes}m`;

}


setInterval(
  () => {

    renderTables();

  },
  30000
);


/* =========================================================
   START TABLE MODAL
========================================================= */

function openStartModal(
  tableNumber
) {

  const table =
    getTableConfig(
      tableNumber
    );

  openModal(`

    <button
      class="modal-close"
      onclick="closeModal()"
    >
      ×
    </button>

    <div class="eyebrow">
      START TABLE
    </div>

    <h2>
      Table ${tableNumber}
    </h2>

    <p class="modal-sub">
      Start a new game
    </p>


    <label class="form-label">
      GAME
    </label>

    <div class="game-options">

      <button
        type="button"
        class="game-option selected"
        data-game="Snooker"
      >
        Snooker
      </button>

      <button
        type="button"
        class="game-option"
        data-game="Pool"
      >
        Pool
      </button>

      <button
        type="button"
        class="game-option"
        data-game="Other"
      >
        Other
      </button>

    </div>


    <label class="form-label">
      PLAYERS
    </label>

    <div id="playersList">

      <div class="player-row">

        <input
          class="input player-input"
          placeholder="Player name"
        >

        <button
          class="remove-player"
          type="button"
          onclick="removePlayerInput(this)"
        >
          ×
        </button>

      </div>

    </div>


    <button
      class="add-btn"
      type="button"
      onclick="addPlayerInput()"
    >
      + Add player
    </button>


    <label class="form-label">
      STARTING AMOUNT
    </label>

    <div class="amount-input-wrap">

      <span class="amount-symbol">
        ₹
      </span>

      <input
        id="startAmount"
        class="input amount-input"
        type="number"
        min="0"
        step="1"
        value="${table.rate}"
      >

    </div>


    <div class="bill">

      <div class="bill-line">

        <span>
          Table rate
        </span>

        <b id="startBase">
          ₹${table.rate}
        </b>

      </div>

      <div class="bill-line">

        <span>
          Extra players
        </span>

        <b id="startExtra">
          ₹0
        </b>

      </div>

      <div class="bill-line bill-total">

        <span>
          Starting total
        </span>

        <b id="startTotal">
          ₹${table.rate}
        </b>

      </div>

    </div>


    <div class="modal-actions">

      <button
        class="btn btn-secondary"
        onclick="closeModal()"
      >
        Cancel
      </button>

      <button
        class="btn btn-primary"
        onclick="startTable(${tableNumber})"
      >
        Start Table
      </button>

    </div>

  `);


  document
    .querySelectorAll(
      ".game-option"
    )
    .forEach(
      button => {

        button.addEventListener(
          "click",
          () => {

            document
              .querySelectorAll(
                ".game-option"
              )
              .forEach(
                b =>
                  b.classList.remove(
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
      "startAmount"
    )
    .addEventListener(
      "input",
      updateStartBill
    );

  updateStartBill();

}


function addPlayerInput() {

  const list =
    document.getElementById(
      "playersList"
    );

  const row =
    document.createElement(
      "div"
    );

  row.className =
    "player-row";

  row.innerHTML = `
    <input
      class="input player-input"
      placeholder="Player name"
    >

    <button
      class="remove-player"
      type="button"
      onclick="removePlayerInput(this)"
    >
      ×
    </button>
  `;

  list.appendChild(
    row
  );

  updateStartBill();

}


function removePlayerInput(
  button
) {

  const rows =
    document.querySelectorAll(
      "#playersList .player-row"
    );

  if (rows.length <= 1) {
    return;
  }

  button.parentElement.remove();

  updateStartBill();

}


function updateStartBill() {

  const inputs =
    document.querySelectorAll(
      ".player-input"
    );

  const count =
    [...inputs].filter(
      input =>
        input.value.trim()
    ).length;

  const tableNumber =
    getCurrentTableNumberFromModal();

  const table =
    getTableConfig(
      tableNumber
    );

  const extra =
    Math.max(
      0,
      count - 1
    ) * EXTRA_PLAYER_PRICE;

  const base =
    Number(
      document.getElementById(
        "startAmount"
      )?.value ||
      table.rate
    );

  const total =
    base + extra;

  const baseEl =
    document.getElementById(
      "startBase"
    );

  const extraEl =
    document.getElementById(
      "startExtra"
    );

  const totalEl =
    document.getElementById(
      "startTotal"
    );

  if (baseEl) {
    baseEl.textContent =
      `₹${base}`;
  }

  if (extraEl) {
    extraEl.textContent =
      `₹${extra}`;
  }

  if (totalEl) {
    totalEl.textContent =
      `₹${total}`;
  }

}


function getCurrentTableNumberFromModal() {

  const title =
    modal.querySelector(
      "h2"
    )?.textContent || "";

  const match =
    title.match(
      /Table\s+(\d+)/
    );

  return match
    ? Number(match[1])
    : 1;

}


/* =========================================================
   START TABLE
========================================================= */

async function startTable(
  tableNumber
) {

  const players =
    [
      ...document.querySelectorAll(
        ".player-input"
      )
    ]
      .map(
        input =>
          input.value.trim()
      )
      .filter(Boolean);


  if (!players.length) {

    showToast(
      "Enter at least one player"
    );

    return;

  }


  const game =
    document
      .querySelector(
        ".game-option.selected"
      )
      ?.dataset.game ||
    "Snooker";


  const manualAmount =
    Number(
      document.getElementById(
        "startAmount"
      )?.value ||
      getTableConfig(
        tableNumber
      ).rate
    );


  const extra =
    Math.max(
      0,
      players.length - 1
    ) * EXTRA_PLAYER_PRICE;


  const startingAmount =
    manualAmount + extra;


  const startedAt =
    new Date().toISOString();


  const row = {

    table_number:
      Number(tableNumber),

    game,

    players,

    started_at:
      startedAt,

    created_at:
      startedAt

  };


  const {
    data,
    error
  } =
    await supabaseClient
      .from("active_games")
      .upsert(
        row,
        {
          onConflict:
            "table_number"
        }
      )
      .select()
      .single();


  if (error) {

    console.error(
      error
    );

    showToast(
      error.message
    );

    return;

  }


  activeGames[
    tableNumber
  ] = {

    ...data,

    starting_amount:
      startingAmount,

    accumulated_amount:
      startingAmount,

    game_count: 1,

    game_details: [
      {
        game_number: 1,
        players: [...players],
        loser: "",
        amount:
          startingAmount
      }
    ]

  };


  closeModal();

  renderTables();

  showToast(
    `Table ${tableNumber} started`
  );

}


/* =========================================================
   PLAYING MODAL
========================================================= */

function openPlayingModal(
  game
) {

  const players =
    Array.isArray(game.players)
      ? game.players
      : [];

  const table =
    getTableConfig(
      game.table_number
    );


  const currentAmount =
    Number(
      game.accumulated_amount ??
      game.starting_amount ??
      calculateBaseAmount(
        game
      )
    );


  openModal(`

    <button
      class="modal-close"
      onclick="closeModal()"
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
        game.game || "Snooker"
      )}
      ·
      ${players.length}
      player${players.length === 1 ? "" : "s"}
    </p>


    <label class="form-label">
      CURRENT PLAYERS
    </label>

    <div id="continuePlayersList">

      ${players
        .map(
          player => `
            <div class="player-row">

              <input
                class="input continue-player-input"
                value="${escapeAttr(player)}"
              >

              <button
                class="remove-player"
                type="button"
                onclick="removeContinuePlayer(this)"
              >
                ×
              </button>

            </div>
          `
        )
        .join("")}

    </div>


    <button
      class="add-btn"
      type="button"
      onclick="addContinuePlayer()"
    >
      + Add player
    </button>


    <div class="bill">

      <div class="bill-line">

        <span>
          Current table rate
        </span>

        <b>
          ₹${table.rate}
        </b>

      </div>

      <div class="bill-line">

        <span>
          Games played
        </span>

        <b>
          ${game.game_count || 1}
        </b>

      </div>

      <div class="bill-line bill-total">

        <span>
          Current total
        </span>

        <b>
          ₹${currentAmount}
        </b>

      </div>

    </div>


    <div class="modal-actions">

      <button
        class="btn btn-secondary"
        onclick="continueGame(${game.table_number})"
      >
        Continue
      </button>

      <button
        class="btn btn-primary"
        onclick="openCloseTableModal(${game.table_number})"
      >
        Close Table
      </button>

    </div>

  `);

}


function addContinuePlayer() {

  const list =
    document.getElementById(
      "continuePlayersList"
    );

  const row =
    document.createElement(
      "div"
    );

  row.className =
    "player-row";

  row.innerHTML = `
    <input
      class="input continue-player-input"
      placeholder="Player name"
    >

    <button
      class="remove-player"
      type="button"
      onclick="removeContinuePlayer(this)"
    >
      ×
    </button>
  `;

  list.appendChild(
    row
  );

}


function removeContinuePlayer(
  button
) {

  const rows =
    document.querySelectorAll(
      ".continue-player-input"
    );

  if (rows.length <= 1) {
    return;
  }

  button.parentElement.remove();

}


/* =========================================================
   CONTINUE GAME
========================================================= */

async function continueGame(
  tableNumber
) {

  const game =
    activeGames[
      tableNumber
    ];

  if (!game) {
    return;
  }


  const players =
    [
      ...document.querySelectorAll(
        ".continue-player-input"
      )
    ]
      .map(
        input =>
          input.value.trim()
      )
      .filter(Boolean);


  if (!players.length) {

    showToast(
      "Enter at least one player"
    );

    return;

  }


  const table =
    getTableConfig(
      tableNumber
    );


  /*
    IMPORTANT:

    Continue NEVER multiplies
    the previous amount.

    It only ADDS the new game's
    amount.
  */

  const extra =
    Math.max(
      0,
      players.length - 1
    ) * EXTRA_PLAYER_PRICE;


  const newGameAmount =
    Number(table.rate) +
    extra;


  const previousTotal =
    Number(
      game.accumulated_amount ??
      game.starting_amount ??
      0
    );


  const newTotal =
    previousTotal +
    newGameAmount;


  const previousGameCount =
    Number(
      game.game_count || 1
    );


  const newGameNumber =
    previousGameCount + 1;


  const details =
    Array.isArray(
      game.game_details
    )
      ? [
          ...game.game_details
        ]
      : [];


  details.push({

    game_number:
      newGameNumber,

    players:
      [...players],

    loser: "",

    amount:
      newGameAmount

  });


  const updatedGame = {

    ...game,

    players:
      [...players],

    accumulated_amount:
      newTotal,

    game_count:
      newGameNumber,

    game_details:
      details

  };


  activeGames[
    tableNumber
  ] =
    updatedGame;


  /*
    Supabase active_games
    stores players/current state.

    Extra game information is
    maintained locally during
    the active session.
  */

  const {
    error
  } =
    await supabaseClient
      .from("active_games")
      .update({

        players:
          [...players],

        game:
          game.game ||
          "Snooker",

        started_at:
          game.started_at

      })
      .eq(
        "table_number",
        tableNumber
      );


  if (error) {

    console.error(
      error
    );

    showToast(
      error.message
    );

    return;

  }


  closeModal();

  renderTables();

  showToast(
    `Game ${newGameNumber} added · +₹${newGameAmount}`
  );

}


/* =========================================================
   CLOSE TABLE
========================================================= */

function openCloseTableModal(
  tableNumber
) {

  const game =
    activeGames[
      tableNumber
    ];

  if (!game) {
    return;
  }


  const players =
    Array.isArray(game.players)
      ? game.players
      : [];


  const total =
    Number(
      game.accumulated_amount ??
      game.starting_amount ??
      calculateBaseAmount(
        game
      )
    );


  openModal(`

    <button
      class="modal-close"
      onclick="closeModal()"
    >
      ×
    </button>

    <div class="eyebrow">
      CLOSE TABLE
    </div>

    <h2>
      Table ${tableNumber}
    </h2>

    <p class="modal-sub">
      Final settlement
    </p>


    <label class="form-label">
      WHO LOST?
    </label>

    <div class="loser-box">

      <label class="form-label">
        Loser name
      </label>

      <input
        id="loserInput"
        class="input"
        placeholder="Write the losing player's name"
      >

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
        step="1"
        value="${total}"
      >

    </div>


    <label class="form-label">
      PAYMENT
    </label>

    <div class="payment-options">

      <button
        class="pay-option selected"
        data-payment="Cash"
        type="button"
      >
        Cash
      </button>

      <button
        class="pay-option"
        data-payment="Online"
        type="button"
      >
        Online
      </button>

      <button
        class="pay-option"
        data-payment="Unpaid"
        type="button"
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
        <span style="color:#777">
          (Optional)
        </span>
      </label>

      <input
        id="mobileInput"
        class="input"
        type="tel"
        inputmode="numeric"
        maxlength="10"
        placeholder="10 digit mobile number"
      >

    </div>


    <div class="bill">

      <div class="bill-line">

        <span>
          Games played
        </span>

        <b>
          ${game.game_count || 1}
        </b>

      </div>

      <div class="bill-line">

        <span>
          Calculated total
        </span>

        <b>
          ₹${total}
        </b>

      </div>

      <div class="bill-line bill-total">

        <span>
          Final amount
        </span>

        <b id="closeBillAmount">
          ₹${total}
        </b>

      </div>

    </div>


    <div class="modal-actions">

      <button
        class="btn btn-secondary"
        onclick="closeModal()"
      >
        Cancel
      </button>

      <button
        class="btn btn-primary"
        onclick="finishTable(${tableNumber})"
      >
        Close Table
      </button>

    </div>

  `);


  const amount =
    document.getElementById(
      "finalAmount"
    );

  amount.addEventListener(
    "input",
    () => {

      document.getElementById(
        "closeBillAmount"
      ).textContent =
        `₹${Number(
          amount.value || 0
        )}`;

    }
  );


  document
    .querySelectorAll(
      ".pay-option"
    )
    .forEach(
      button => {

        button.addEventListener(
          "click",
          () => {

            document
              .querySelectorAll(
                ".pay-option"
              )
              .forEach(
                b =>
                  b.classList.remove(
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

            mobileWrap.style.display =
              button.dataset.payment ===
              "Unpaid"
                ? "block"
                : "none";

          }
        );

      }
    );

}


/* =========================================================
   FINISH TABLE
========================================================= */

async function finishTable(
  tableNumber
) {

  const game =
    activeGames[
      tableNumber
    ];

  if (!game) {
    return;
  }


  const loser =
    document
      .getElementById(
        "loserInput"
      )
      ?.value
      .trim() ||
    "";


  const amount =
    Number(
      document
        .getElementById(
          "finalAmount"
        )
        ?.value ||
      0
    );


  const payment =
    document
      .querySelector(
        ".pay-option.selected"
      )
      ?.dataset.payment ||
    "Cash";


  const mobile =
    document
      .getElementById(
        "mobileInput"
      )
      ?.value
      .trim() ||
    "";


  if (
    !amount ||
    amount < 0
  ) {

    showToast(
      "Enter a valid amount"
    );

    return;

  }


  /*
    Save loser for the final
    game too.
  */

  const details =
    Array.isArray(
      game.game_details
    )
      ? [
          ...game.game_details
        ]
      : [];


  if (!details.length) {

    details.push({

      game_number: 1,

      players:
        Array.isArray(
          game.players
        )
          ? [...game.players]
          : [],

      loser,

      amount

    });

  } else {

    details[
      details.length - 1
    ].loser =
      loser;

  }


  /*
    Store every game as one
    history record.

    The final amount is the
    complete accumulated amount,
    never multiplied.
  */

  const firstPlayer =
    Array.isArray(
      game.players
    ) &&
    game.players.length
      ? game.players[0]
      : "";


  const startedAt =
    game.started_at ||
    new Date().toISOString();


  const endTime =
    new Date().toISOString();


  const gameCount =
    Number(
      game.game_count || 1
    );


  const historyPlayer =
    loser ||
    firstPlayer;


  const historyPlayers =
    Array.isArray(
      game.players
    )
      ? [...game.players]
      : [];


  const {
    error
  } =
    await supabaseClient
      .from("game_history")
      .insert({

        game_date:
          getIndiaDate(),

        start_time:
          startedAt,

        end_time:
          endTime,

        table_number:
          Number(tableNumber),

        player:
          historyPlayer,

        players:
          historyPlayers,

        player_count:
          historyPlayers.length,

        loser:
          loser,

        game:
          game.game ||
          "Snooker",

        calculated_amount:
          amount,

        amount:
          amount,

        payment:
          payment,

        created_at:
          endTime

      });


  if (error) {

    console.error(
      error
    );

    showToast(
      error.message
    );

    return;

  }


  /*
    Delete active table.
  */

  const {
    error:
      deleteError
  } =
    await supabaseClient
      .from("active_games")
      .delete()
      .eq(
        "table_number",
        tableNumber
      );


  if (deleteError) {

    console.error(
      deleteError
    );

    showToast(
      deleteError.message
    );

    return;

  }


  delete activeGames[
    tableNumber
  ];


  closeModal();

  renderTables();

  await loadTodayStats();

  await loadUnpaidCount();


  showToast(
    `Table ${tableNumber} closed · ₹${amount}`
  );

}


/* =========================================================
   LOAD ACTIVE TABLES
========================================================= */

async function loadActiveGames() {

  const {
    data,
    error
  } =
    await supabaseClient
      .from("active_games")
      .select("*")
      .order(
        "table_number",
        {
          ascending: true
        }
      );


  if (error) {

    console.error(
      error
    );

    setConnection(
      false
    );

    return;

  }


  activeGames = {};

  (
    data || []
  ).forEach(
    row => {

      activeGames[
        row.table_number
      ] = {

        ...row,

        /*
          New sessions begin
          with a calculated amount.
        */

        starting_amount:
          Number(
            row.starting_amount ||
            calculateBaseAmount(
              row
            )
          ),

        accumulated_amount:
          Number(
            row.accumulated_amount ||
            calculateBaseAmount(
              row
            )
          ),

        game_count:
          Number(
            row.game_count || 1
          ),

        game_details:
          Array.isArray(
            row.game_details
          )
            ? row.game_details
            : []

      };

    }
  );


  setConnection(
    true
  );

  renderTables();

}


/* =========================================================
   TODAY STATS
========================================================= */

async function loadTodayStats() {

  const today =
    getIndiaDate();


  const {
    data,
    error
  } =
    await supabaseClient
      .from("game_history")
      .select(
        "amount,payment,game_date"
      )
      .eq(
        "game_date",
        today
      );


  if (error) {

    console.error(
      error
    );

    return;

  }


  const rows =
    data || [];


  gamesCount.textContent =
    rows.length;


  const total =
    rows.reduce(
      (
        sum,
        row
      ) =>
        sum +
        Number(
          row.amount || 0
        ),
      0
    );


  collection.textContent =
    `₹${total}`;

}


/* =========================================================
   UNPAID COUNT
========================================================= */

async function loadUnpaidCount() {

  /*
    Current schema stores
    payment as Cash / Online /
    Unpaid.
  */

  const {
    count,
    error
  } =
    await supabaseClient
      .from("game_history")
      .select(
        "id",
        {
          count: "exact",
          head: true
        }
      )
      .eq(
        "payment",
        "Unpaid"
      );


  if (error) {

    console.error(
      error
    );

    unpaidCount.textContent =
      "0";

    return;

  }


  unpaidCount.textContent =
    count || 0;

}


/* =========================================================
   HISTORY MODAL
========================================================= */

historyBtn.addEventListener(
  "click",
  () => {

    openHistoryModal(
      "selected"
    );

  }
);


function openHistoryModal(
  filter = "selected"
) {

  historyFilter =
    filter;

  historySearchText =
    "";

  openModal(`

    <button
      class="modal-close"
      onclick="closeModal()"
    >
      ×
    </button>

    <div class="eyebrow">
      RECORDS
    </div>

    <h2>
      Game History
    </h2>

    <p class="modal-sub">
      Vantara Snooker Academy
    </p>


    <div class="date-selector">

      <input
        id="historyDate"
        class="input"
        type="date"
        value="${selectedDate}"
      >

      <button
        class="btn btn-primary"
        onclick="loadSelectedHistory()"
      >
        Load
      </button>

    </div>


    <div class="history-search">

      <input
        id="historySearch"
        class="input"
        placeholder="Search player, loser, table, game, payment, mobile, amount..."
      >

    </div>


    <div class="history-summary">

      <div class="stat-card">

        <span>GAMES</span>

        <strong id="historyGames">
          0
        </strong>

      </div>

      <div class="stat-card">

        <span>COLLECTION</span>

        <strong id="historyCollection">
          ₹0
        </strong>

      </div>

      <div class="stat-card">

        <span>CASH</span>

        <strong id="historyCash">
          ₹0
        </strong>

      </div>

      <div class="stat-card">

        <span>UNPAID</span>

        <strong
          id="historyUnpaid"
          style="color:#e36d6d"
        >
          ₹0
        </strong>

      </div>

    </div>


    <div id="historyContent">
      <div class="empty">
        Loading...
      </div>
    </div>


    <div class="report-actions">

      <button
        class="btn btn-secondary"
        onclick="exportHistoryCSV('selected')"
      >
        Selected Date CSV
      </button>

      <button
        class="btn btn-secondary"
        onclick="exportHistoryCSV('today')"
      >
        Today CSV
      </button>

      <button
        class="btn btn-secondary"
        onclick="exportHistoryCSV('month')"
      >
        Whole Month CSV
      </button>

      <button
        class="btn btn-secondary"
        onclick="closeModal()"
      >
        Close
      </button>

    </div>

  `);


  document
    .getElementById(
      "historySearch"
    )
    .addEventListener(
      "input",
      event => {

        historySearchText =
          event.target.value
            .toLowerCase()
            .trim();

        renderHistoryRows();

      }
    );


  loadSelectedHistory();

}


/* =========================================================
   LOAD HISTORY
========================================================= */

async function loadSelectedHistory() {

  const dateInput =
    document.getElementById(
      "historyDate"
    );

  selectedDate =
    dateInput?.value ||
    getIndiaDate();


  const {
    data,
    error
  } =
    await supabaseClient
      .from("game_history")
      .select("*")
      .eq(
        "game_date",
        selectedDate
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

    document.getElementById(
      "historyContent"
    ).innerHTML = `
      <div class="empty">
        ${escapeHTML(
          error.message
        )}
      </div>
    `;

    return;

  }


  historyRows =
    data || [];


  renderHistoryRows();

}


function renderHistoryRows() {

  const content =
    document.getElementById(
      "historyContent"
    );

  if (!content) {
    return;
  }


  let rows =
    [...historyRows];


  if (historySearchText) {

    rows =
      rows.filter(
        row => {

          const searchable =
            JSON.stringify(
              row
            ).toLowerCase();

          return searchable.includes(
            historySearchText
          );

        }
      );

  }


  const total =
    rows.reduce(
      (
        sum,
        row
      ) =>
        sum +
        Number(
          row.amount || 0
        ),
      0
    );


  const cash =
    rows
      .filter(
        row =>
          row.payment ===
          "Cash"
      )
      .reduce(
        (
          sum,
          row
        ) =>
          sum +
          Number(
            row.amount || 0
          ),
        0
      );


  const unpaid =
    rows
      .filter(
        row =>
          row.payment ===
          "Unpaid"
      )
      .reduce(
        (
          sum,
          row
        ) =>
          sum +
          Number(
            row.amount || 0
          ),
        0
      );


  const gamesEl =
    document.getElementById(
      "historyGames"
    );

  const collectionEl =
    document.getElementById(
      "historyCollection"
    );

  const cashEl =
    document.getElementById(
      "historyCash"
    );

  const unpaidEl =
    document.getElementById(
      "historyUnpaid"
    );


  if (gamesEl) {
    gamesEl.textContent =
      rows.length;
  }

  if (collectionEl) {
    collectionEl.textContent =
      `₹${total}`;
  }

  if (cashEl) {
    cashEl.textContent =
      `₹${cash}`;
  }

  if (unpaidEl) {
    unpaidEl.textContent =
      `₹${unpaid}`;
  }


  if (!rows.length) {

    content.innerHTML = `
      <div class="empty">
        No games found.
      </div>
    `;

    return;

  }


  content.innerHTML = `

    <div class="history-wrap">

      <table class="history-table">

        <thead>

          <tr>

            <th>TIME</th>

            <th>TABLE</th>

            <th>GAME</th>

            <th>PLAYERS</th>

            <th>GAMES</th>

            <th>LOSER</th>

            <th>AMOUNT</th>

            <th>PAYMENT</th>

          </tr>

        </thead>

        <tbody>

          ${rows
            .map(
              row => {

                const players =
                  Array.isArray(
                    row.players
                  )
                    ? row.players.join(
                        ", "
                      )
                    : row.player ||
                      "-";


                const paymentClass =
                  row.payment ===
                  "Unpaid"
                    ? "unpaid-label"
                    : "paid-label";


                return `

                  <tr
                    class="${
                      row.payment ===
                      "Unpaid"
                        ? "unpaid-row"
                        : ""
                    }"
                  >

                    <td>
                      ${getIndiaShortTime(
                        row.start_time ||
                        row.created_at
                      )}
                    </td>

                    <td>
                      Table ${escapeHTML(
                        row.table_number
                      )}
                    </td>

                    <td>
                      ${escapeHTML(
                        row.game ||
                        "Snooker"
                      )}
                    </td>

                    <td>
                      ${escapeHTML(
                        players
                      )}
                    </td>

                    <td>
                      ${row.game_count || 1}
                    </td>

                    <td>
                      ${
                        row.loser
                          ? escapeHTML(
                              row.loser
                            )
                          : "-"
                      }
                    </td>

                    <td>
                      ₹${Number(
                        row.amount || 0
                      )}
                    </td>

                    <td
                      class="${paymentClass}"
                    >
                      ${escapeHTML(
                        row.payment ||
                        "-"
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

}


/* =========================================================
   UNPAID MODAL
========================================================= */

unpaidBtn.addEventListener(
  "click",
  openUnpaidModal
);


async function openUnpaidModal() {

  openModal(`

    <button
      class="modal-close"
      onclick="closeModal()"
    >
      ×
    </button>

    <div class="eyebrow">
      OUTSTANDING
    </div>

    <h2>
      Unpaid History
    </h2>

    <p class="modal-sub">
      Search unpaid games by any detail
    </p>


    <div class="history-search">

      <input
        id="unpaidSearch"
        class="input"
        placeholder="Search name, loser, mobile, table, amount, date..."
      >

    </div>


    <div id="unpaidContent">
      <div class="empty">
        Loading...
      </div>
    </div>

  `);


  document
    .getElementById(
      "unpaidSearch"
    )
    .addEventListener(
      "input",
      event => {

        renderUnpaidRows(
          event.target.value
            .toLowerCase()
            .trim()
        );

      }
    );


  await loadUnpaidHistory();

}


let unpaidRows = [];


async function loadUnpaidHistory() {

  const {
    data,
    error
  } =
    await supabaseClient
      .from("game_history")
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

    console.error(
      error
    );

    document.getElementById(
      "unpaidContent"
    ).innerHTML = `
      <div class="empty">
        ${escapeHTML(
          error.message
        )}
      </div>
    `;

    return;

  }


  unpaidRows =
    data || [];


  renderUnpaidRows(
    ""
  );

}


function renderUnpaidRows(
  search
) {

  const content =
    document.getElementById(
      "unpaidContent"
    );

  if (!content) {
    return;
  }


  let rows =
    [...unpaidRows];


  if (search) {

    rows =
      rows.filter(
        row =>
          JSON.stringify(
            row
          )
            .toLowerCase()
            .includes(
              search
            )
      );

  }


  if (!rows.length) {

    content.innerHTML = `
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

            <th>DATE</th>

            <th>TIME</th>

            <th>TABLE</th>

            <th>PLAYER</th>

            <th>LOSER</th>

            <th>MOBILE</th>

            <th>AMOUNT</th>

            <th>STATUS</th>

          </tr>

        </thead>

        <tbody>

          ${rows
            .map(
              row => `

                <tr class="unpaid-row">

                  <td>
                    ${formatDateDisplay(
                      row.game_date
                    )}
                  </td>

                  <td>
                    ${getIndiaShortTime(
                      row.start_time ||
                      row.created_at
                    )}
                  </td>

                  <td>
                    Table ${escapeHTML(
                      row.table_number
                    )}
                  </td>

                  <td>
                    ${escapeHTML(
                      row.player ||
                      "-"
                    )}
                  </td>

                  <td>
                    ${escapeHTML(
                      row.loser ||
                      "-"
                    )}
                  </td>

                  <td>
                    ${
                      row.mobile ||
                      "-"
                    }
                  </td>

                  <td>
                    ₹${Number(
                      row.amount || 0
                    )}
                  </td>

                  <td class="unpaid-label">
                    UNPAID
                  </td>

                </tr>

              `
            )
            .join("")}

        </tbody>

      </table>

    </div>

  `;

}


/* =========================================================
   CSV EXPORT
========================================================= */

async function exportHistoryCSV(
  mode
) {

  let fromDate;
  let toDate;


  if (mode === "today") {

    fromDate =
      getIndiaDate();

    toDate =
      fromDate;

  }

  else if (
    mode === "selected"
  ) {

    fromDate =
      selectedDate;

    toDate =
      selectedDate;

  }

  else if (
    mode === "month"
  ) {

    const now =
      new Date();

    const year =
      new Intl.DateTimeFormat(
        "en-US",
        {
          timeZone:
            "Asia/Kolkata",
          year: "numeric"
        }
      ).format(now);

    const month =
      new Intl.DateTimeFormat(
        "en-US",
        {
          timeZone:
            "Asia/Kolkata",
          month: "2-digit"
        }
      ).format(now);


    fromDate =
      `${year}-${month}-01`;


    const lastDay =
      new Date(
        Number(year),
        Number(month),
        0
      ).getDate();


    toDate =
      `${year}-${month}-${String(
        lastDay
      ).padStart(2, "0")}`;

  }


  const {
    data,
    error
  } =
    await supabaseClient
      .from("game_history")
      .select("*")
      .gte(
        "game_date",
        fromDate
      )
      .lte(
        "game_date",
        toDate
      )
      .order(
        "created_at",
        {
          ascending: true
        }
      );


  if (error) {

    showToast(
      error.message
    );

    return;

  }


  const rows =
    data || [];


  if (!rows.length) {

    showToast(
      "No records to export"
    );

    return;

  }


  const headers = [

    "Date",
    "Time",
    "Table",
    "Game",
    "Players",
    "Games Played",
    "Loser",
    "Amount",
    "Payment",
    "Mobile"

  ];


  const csvRows = [

    headers,

    ...rows.map(
      row => [

        row.game_date || "",

        getIndiaShortTime(
          row.start_time ||
          row.created_at
        ),

        `Table ${
          row.table_number
        }`,

        row.game ||
          "Snooker",

        Array.isArray(
          row.players
        )
          ? row.players.join(
              " | "
            )
          : row.player ||
            "",

        row.game_count ||
          1,

        row.loser ||
          "",

        row.amount ||
          0,

        row.payment ||
          "",

        row.mobile ||
          ""

      ]
    )

  ];


  const csv =
    csvRows
      .map(
        row =>
          row
            .map(
              value =>
                `"${String(
                  value ?? ""
                )
                  .replaceAll(
                    '"',
                    '""'
                  )}"`
            )
            .join(",")
      )
      .join("\n");


  const blob =
    new Blob(
      [
        "\uFEFF" +
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
    `vantara-${mode}-${getIndiaDate()}.csv`;

  document.body.appendChild(
    link
  );

  link.click();

  link.remove();

  URL.revokeObjectURL(
    url
  );


  showToast(
    "CSV downloaded"
  );

}


/* =========================================================
   ESCAPE HTML
========================================================= */

function escapeHTML(
  value
) {

  return String(
    value ?? ""
  )
    .replaceAll(
      "&",
      "&amp;"
    )
    .replaceAll(
      "<",
      "&lt;"
    )
    .replaceAll(
      ">",
      "&gt;"
    )
    .replaceAll(
      '"',
      "&quot;"
    )
    .replaceAll(
      "'",
      "&#039;"
    );

}


function escapeAttr(
  value
) {

  return escapeHTML(
    value
  );

}


/* =========================================================
   AUTH
========================================================= */

const authModal =
  document.getElementById(
    "authModal"
  );

const authForm =
  document.getElementById(
    "authForm"
  );

const authMessage =
  document.getElementById(
    "authMessage"
  );

const closeAuthBtn =
  document.getElementById(
    "closeAuthBtn"
  );


function openAuth() {

  authModal.classList.add(
    "open"
  );

}


function closeAuth() {

  authModal.classList.remove(
    "open"
  );

}


closeAuthBtn?.addEventListener(
  "click",
  closeAuth
);


authForm?.addEventListener(
  "submit",
  async event => {

    event.preventDefault();

    const email =
      document
        .getElementById(
          "authEmail"
        )
        .value
        .trim();

    const password =
      document
        .getElementById(
          "authPassword"
        )
        .value;


    const button =
      document.getElementById(
        "authLoginBtn"
      );


    button.disabled =
      true;

    button.textContent =
      "Logging in...";

    authMessage.textContent =
      "";


    const {
      error
    } =
      await supabaseClient.auth.signInWithPassword(
        {
          email,
          password
        }
      );


    button.disabled =
      false;

    button.textContent =
      "Login";


    if (error) {

      authMessage.textContent =
        error.message;

      return;

    }


    closeAuth();

    showToast(
      "Logged in"
    );

  }
);


/* =========================================================
   INITIAL LOAD
========================================================= */

async function initialize() {

  try {

    await loadActiveGames();

    await loadTodayStats();

    await loadUnpaidCount();

  }

  catch (error) {

    console.error(
      error
    );

    setConnection(
      false
    );

  }

}


initialize();


/* =========================================================
   REALTIME
========================================================= */

supabaseClient
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

      await loadTodayStats();

      await loadUnpaidCount();

    }
  )
  .subscribe(
    status => {

      setConnection(
        status ===
        "SUBSCRIBED"
      );

    }
  );
