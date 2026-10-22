let eventsData = [];
let usedEvents = [];
let tableCards = [];
let currentQuestion = null;
let strikes = 0;
let score = 0;
let latestWrongCard = null;
let locked = false;      // true while a placement is being shown, blocks double taps
let gameOver = false;

const settings = {
    AH: true,
    MD: true,
    MH: true,
    WH: true
};

const isTouch = window.matchMedia("(pointer: coarse)").matches;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];


/* ============================================================
   SETTINGS UI
   ============================================================ */

const cog = document.getElementById("settings-cog");
const panel = document.getElementById("settings-panel");

cog.addEventListener("click", (e) => {
    e.stopPropagation();
    panel.classList.toggle("hidden-settings");
});

// tap outside closes the settings panel
document.addEventListener("click", (e) => {
    if (!panel.classList.contains("hidden-settings") && !panel.contains(e.target)) {
        panel.classList.add("hidden-settings");
    }
});

document.getElementById("apply-settings").addEventListener("click", () => {

    settings.AH = document.getElementById("setting-AH").checked;
    settings.MD = document.getElementById("setting-MD").checked;
    settings.MH = document.getElementById("setting-MH").checked;
    settings.WH = document.getElementById("setting-WH").checked;

    panel.classList.add("hidden-settings");
    restartGame();
});


/* ============================================================
   DATE HELPERS
   ============================================================ */

// Convert date string into sortable number (handles BCE)
function getDateValue(dateString) {
    dateString = String(dateString);
    const isNegative = dateString.startsWith("-");
    const normalized = isNegative ? dateString.slice(1) : dateString;
    const parts = normalized.split("-");

    let year = parseInt(parts[0]);
    const month = parseInt(parts[1] || 1);
    const day = parseInt(parts[2] || 1);

    if (isNegative) year = -year;

    return year * 10000 + month * 100 + day;
}

// Friendly display: "-0322" -> "322 BCE", "1857-05-10" -> "10 May 1857"
function formatYear(dateString) {
    dateString = String(dateString);
    const isNegative = dateString.startsWith("-");
    const parts = (isNegative ? dateString.slice(1) : dateString).split("-");

    const year = parseInt(parts[0]);
    if (isNaN(year)) return dateString;

    const month = parseInt(parts[1]);
    const day = parseInt(parts[2]);

    const yearText = year + (isNegative ? " BCE" : "");

    if (month >= 1 && month <= 12) {
        return (day >= 1 ? day + " " : "") + MONTHS[month - 1] + " " + yearText;
    }
    return yearText;
}


/* ============================================================
   LOADING / STARTING
   ============================================================ */

async function loadEvents() {
    try {
        const response = await fetch('data/dates.json');
        const data = await response.json();
        eventsData = data.events.filter(event => settings[event.subj]);
        startGame();
    } catch (err) {
        showMessageInQuestionCard("Couldn't load the events. Please refresh.");
    }
}

function showMessageInQuestionCard(msg) {
    const questionEvent = document.getElementById('question-event');
    const questionCard = document.getElementById('question-card');
    questionEvent.textContent = msg;
    questionCard.style.opacity = "1";
    questionCard.removeAttribute("draggable");
}

function showNoEventsMessage() {
    showMessageInQuestionCard("Pick at least one era with 2+ events in Settings ⚙️");
}

function startGame() {

    if (eventsData.length < 2) {
        showNoEventsMessage();
        return;
    }

    pickStartingCards();
    setupQuestionCard();
    updateTable();
}

// Pick starting table card and question card
function pickStartingCards() {

    const shuffled = [...eventsData].sort(() => 0.5 - Math.random());

    if (shuffled.length < 2) return;

    const first = shuffled.pop();
    const second = shuffled.pop();

    usedEvents.push(first, second);

    tableCards.push(first);
    currentQuestion = second;
}


/* ============================================================
   QUESTION CARD
   ============================================================ */

function setupQuestionCard() {
    const questionEvent = document.getElementById('question-event');
    const questionCard = document.getElementById('question-card');

    if (!currentQuestion) {
        questionEvent.textContent = "";
        questionCard.style.opacity = '0';
        return;
    }

    questionCard.style.opacity = "1";

    questionEvent.textContent = currentQuestion.event;

    questionCard.setAttribute('draggable', true);

    const oldImgDiv = questionCard.querySelector('.card-img');
    if (oldImgDiv) oldImgDiv.remove();

    if (currentQuestion.imgUrl) {
        const imgDiv = document.createElement('div');
        imgDiv.classList.add('card-img');
        imgDiv.style.backgroundImage = `url('data_images/${currentQuestion.imgUrl}')`;
        questionCard.appendChild(imgDiv);
    }

    questionCard.ondragstart = dragStart;
    focusDateInput();
}

function shrinkQuestionCard() {
    document.getElementById("question-card").classList.add("shrunk");
}

function dragStart(e) {
    e.dataTransfer.setData('text/plain', 'dragging');
}

function disableDragging() {
    document.getElementById('question-card').setAttribute('draggable', false);
}


/* ============================================================
   TABLE (answer cards + gaps)
   ============================================================ */

function updateTable() {
    const table = document.getElementById('card-container-table');
    table.innerHTML = '';

    const total = tableCards.length;

    tableCards.forEach((card, index) => {

        table.appendChild(createDropZone(index, total));

        const cardElement = createAnswerCard(card, index);

        if (card.wrong) cardElement.classList.add('wrong');
        if (card.latest) cardElement.classList.add('latest');
        if (card.fresh) cardElement.classList.add('fresh');

        table.appendChild(cardElement);
    });

    // final gap after the last card
    table.appendChild(createDropZone(total, total));

    scrollToNewCard();
}

// If the newly placed card is off-screen (or hidden under the sticky panel), bring it into view
function scrollToNewCard() {
    const el = document.querySelector('.card.fresh, .card.latest');
    if (!el) return;

    const topEdge = document.getElementById('top-panel').getBoundingClientRect().bottom;
    const rect = el.getBoundingClientRect();

    if (rect.top < topEdge || rect.bottom > window.innerHeight) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

function createDropZone(position, total) {

    const dropZone = document.createElement('div');
    dropZone.classList.add('drop-zone');
    dropZone.dataset.position = position;
    dropZone.setAttribute('role', 'button');

    let label = "Place here";
    if (position === 0) label = "Earlier than all";
    else if (position === total) label = "Later than all";

    dropZone.setAttribute('aria-label', label);
    dropZone.innerHTML = `<span class="dz-plus">＋</span><span class="dz-text">${label}</span>`;

    dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('over'); });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('over'));
    dropZone.addEventListener('drop', handleDrop);

    dropZone.addEventListener('click', () => {
        handleManualDrop(dropZone.dataset.position);
    });

    return dropZone;
}

function createAnswerCard(card, index) {

    const cardDiv = document.createElement('div');
    cardDiv.classList.add('card');
    cardDiv.dataset.index = index;

    cardDiv.setAttribute('tabindex', '0');
    cardDiv.setAttribute('role', 'button');
    cardDiv.setAttribute('aria-label', `${card.event}. Tap to flip.`);

    if (card.imgUrl) {
        const imgDiv = document.createElement('div');
        imgDiv.classList.add('card-img');
        imgDiv.style.backgroundImage = `url('data_images/${card.imgUrl}')`;
        cardDiv.appendChild(imgDiv);
    }

    const front = document.createElement('div');
    front.classList.add('card-info');

    front.innerHTML =
        `<h3>${formatYear(card.year)}</h3>
         <p class="event">${card.event}</p>
         <p class="info1">${card.info1}</p>`;

    const back = document.createElement('div');
    back.classList.add('card-info-2', 'hidden');

    back.innerHTML = `<p class="info2">${card.info2}</p>`;

    const arrow = document.createElement('span');
    arrow.classList.add('card-globe');
    arrow.textContent = '🌐';
    arrow.setAttribute('role', 'link');
    arrow.setAttribute('aria-label', 'Search on the web');

    arrow.addEventListener('click', (e) => {
        e.stopPropagation();   // don't flip the card when opening the link

        const searchQuery = `${card.event} wikipedia`;
        const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`;

        window.open(searchUrl, '_blank', 'noopener');
    });

    function flip() {
        // keep the card's front-side size when flipped, even if the back is empty/short
        if (!cardDiv.classList.contains('hidden')) {
            cardDiv.style.minHeight = cardDiv.offsetHeight + 'px';
        }
        cardDiv.classList.toggle('hidden');
        front.classList.toggle('hidden');
        back.classList.toggle('hidden');
    }

    cardDiv.addEventListener('keydown', (e) => {

        const cards = Array.from(document.querySelectorAll('.card'));
        const currentIndex = cards.indexOf(cardDiv);

        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
            e.preventDefault();
            const next = cards[currentIndex + 1];
            if (next) next.focus();
        }

        if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
            e.preventDefault();
            const prev = cards[currentIndex - 1];
            if (prev) prev.focus();
        }

        if (e.key === 'Enter' && e.shiftKey) {
            e.preventDefault();
            arrow.click();
            return;
        }

        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            flip();
        }

        if (e.key === 'b') {
            arrow.click();
        }
    });

    cardDiv.appendChild(arrow);
    cardDiv.appendChild(front);
    cardDiv.appendChild(back);

    cardDiv.addEventListener('click', flip);

    return cardDiv;
}


/* ============================================================
   GAME LOGIC
   ============================================================ */

// Check chronological order
function isOrderCorrect() {

    for (let i = 1; i < tableCards.length; i++) {

        if (getDateValue(tableCards[i - 1].year) > getDateValue(tableCards[i].year)) {
            return false;
        }
    }

    return true;
}

function updateHearts() {

    for (let i = 1; i <= 3; i++) {

        const heart = document.getElementById(`heart${i}`);

        if (i <= strikes) {
            heart.textContent = '🤍';
            heart.classList.add('lost');
        } else {
            heart.textContent = '❤️';
            heart.classList.remove('lost');
        }
    }
}

function pickNextQuestion() {

    const remaining = eventsData.filter(event => !usedEvents.includes(event));

    if (remaining.length === 0) {

        currentQuestion = null;
        setupQuestionCard();
        endGame(true);
        return;
    }

    const next = remaining[Math.floor(Math.random() * remaining.length)];

    usedEvents.push(next);
    currentQuestion = next;

    setupQuestionCard();
}

function clearLatestWrong() {

    if (latestWrongCard) {
        latestWrongCard.latest = false;
        latestWrongCard = null;
    }
}

function clearFresh() {
    tableCards.forEach(c => { c.fresh = false; });
}

function handleDrop(e) {
    e.preventDefault();
    e.currentTarget.classList.remove('over');
    placeCard(parseInt(e.currentTarget.dataset.position));
}

function handleManualDrop(position) {
    placeCard(parseInt(position));
}

// Place the current question card at a position and score it
function placeCard(position) {

    if (gameOver || locked || !currentQuestion || isNaN(position)) return;

    locked = true;

    clearLatestWrong();
    clearFresh();

    const insertedCard = { ...currentQuestion, wrong: false, fresh: false };

    tableCards.splice(position, 0, insertedCard);

    const correct = isOrderCorrect();

    if (correct) {

        score++;
        document.getElementById('score').textContent = `Score: ${score}`;
        insertedCard.fresh = true;

    } else {

        insertedCard.wrong = true;
        insertedCard.latest = true;
        latestWrongCard = insertedCard;

        strikes++;
        updateHearts();

        // wrong cards jump to where they really belong
        tableCards.sort((a, b) => getDateValue(a.year) - getDateValue(b.year));
    }

    updateTable();

    if (tableCards.length >= 20) {
        shrinkQuestionCard();
    }

    showCorrectYearFeedback(correct);

    if (strikes >= 3) {
        endGame(false);
        return;
    }

    setTimeout(() => {
        locked = false;
        pickNextQuestion();
    }, 999);
}


/* ============================================================
   DATE INPUT
   ============================================================ */

function handleDateSubmit() {

    if (!currentQuestion || locked || gameOver) return;

    const inputEl = document.getElementById("date-input");
    let input = inputEl.value.trim().toLowerCase().replace(/\s+/g, "");
    if (!input) return;

    let negative = false;

    // allow typing "322bce" / "322bc" too
    if (/b\.?c\.?(e\.?)?$/.test(input)) {
        negative = true;
        input = input.replace(/b\.?c\.?(e\.?)?$/, "");
    }
    input = input.replace(/(a\.?d\.?|c\.?e\.?)$/, "");

    if (input.startsWith("-")) {
        negative = true;
        input = input.slice(1);
    }

    if (!/^\d+(-\d{1,2}){0,2}$/.test(input)) {
        inputEl.classList.remove("shake");
        void inputEl.offsetWidth;
        inputEl.classList.add("shake");
        return;
    }

    if (negative) input = "-" + input;

    const guessedValue = getDateValue(input);

    let guessedPosition = 0;
    while (
        guessedPosition < tableCards.length &&
        getDateValue(tableCards[guessedPosition].year) < guessedValue
    ) {
        guessedPosition++;
    }

    handleManualDrop(guessedPosition);
}

// The ± button puts/removes a leading "-" in the box (phone number pads have no minus key)
function syncSignButton() {
    const btn = document.getElementById("bce-toggle");
    const negative = document.getElementById("date-input").value.trim().startsWith("-");
    btn.setAttribute("aria-pressed", String(negative));
}

function toggleSign() {
    const inputEl = document.getElementById("date-input");
    if (inputEl.disabled) return;

    const v = inputEl.value.trim();
    inputEl.value = v.startsWith("-") ? v.slice(1) : "-" + v;
    syncSignButton();
    inputEl.focus();
}

function showCorrectYearFeedback(correct) {

    const inputEl = document.getElementById("date-input");

    if (!currentQuestion || !inputEl) return;

    inputEl.classList.remove("shake");
    inputEl.value = formatYear(currentQuestion.year);
    inputEl.classList.add(correct ? "ok" : "bad");

    inputEl.disabled = true;

    setTimeout(() => {
        inputEl.value = "";
        inputEl.classList.remove("ok", "bad");
        inputEl.disabled = false;
        syncSignButton();

        if (!gameOver) focusDateInput();
    }, 700);
}

// On phones we don't auto-focus: the on-screen keyboard would cover the timeline
function focusDateInput() {
    if (isTouch) return;

    const input = document.getElementById("date-input");
    if (input) {
        input.focus();
        input.select();
    }
}

document.addEventListener("keydown", function (e) {
    const input = document.getElementById("date-input");

    if (document.activeElement === input) return;

    const isNumberKey =
        (e.key >= "0" && e.key <= "9") ||
        (e.code && e.code.startsWith("Numpad"));

    if (isNumberKey) {
        focusDateInput();
    }
});


/* ============================================================
   END OF GAME + RESTART
   ============================================================ */

function showModal(title, text) {
    document.getElementById("modal-title").textContent = title;
    document.getElementById("modal-text").textContent = text;
    const overlay = document.getElementById("overlay");
    overlay.classList.add("show");
    overlay.setAttribute("aria-hidden", "false");
}

function hideModal() {
    const overlay = document.getElementById("overlay");
    overlay.classList.remove("show");
    overlay.setAttribute("aria-hidden", "true");
}

function endGame(won) {

    gameOver = true;
    disableDragging();

    setTimeout(() => {
        if (won) {
            showModal("You placed them all! 🎉", `Final score: ${score}`);
        } else {
            showModal("Game over", `Final score: ${score}`);
        }
    }, 900);
}

function restartGame() {

    // Reset game state
    usedEvents = [];
    tableCards = [];
    latestWrongCard = null;
    currentQuestion = null;
    strikes = 0;
    score = 0;
    locked = false;
    gameOver = false;

    hideModal();

    // Reset UI
    document.getElementById("score").textContent = "Score: 0";
    updateHearts();

    document.getElementById("card-container-table").innerHTML = "";

    const inputEl = document.getElementById("date-input");
    inputEl.value = "";
    inputEl.disabled = false;
    inputEl.classList.remove("ok", "bad", "shake");
    syncSignButton();

    const questionCard = document.getElementById("question-card");
    const questionEvent = document.getElementById("question-event");

    questionEvent.textContent = "";
    questionCard.style.opacity = "0";
    questionCard.removeAttribute("draggable");
    questionCard.classList.remove("shrunk");

    const oldImg = questionCard.querySelector(".card-img");
    if (oldImg) oldImg.remove();

    // Reload filtered events
    loadEvents();
}


/* ============================================================
   WIRING
   ============================================================ */

window.addEventListener("load", focusDateInput);

document.getElementById("submit-date").addEventListener("click", (e) => {
    e.preventDefault();
    handleDateSubmit();
    focusDateInput();
});

document.getElementById("date-input").addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
        e.preventDefault();
        handleDateSubmit();
    }
});

document.getElementById("bce-toggle").addEventListener("click", toggleSign);
document.getElementById("date-input").addEventListener("input", syncSignButton);

document.getElementById("modal-restart").addEventListener("click", restartGame);
document.getElementById("modal-close").addEventListener("click", hideModal);


// Start game
loadEvents();
