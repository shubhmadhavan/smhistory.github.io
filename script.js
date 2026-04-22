

let eventsData = [];
let usedEvents = [];
let tableCards = [];
let currentQuestion = null;
let strikes = 0;
let score = 0;
let latestWrongCard = null;



let settings = {
    AH: true,
    MD: true,
    MH: true,
    WH: true
};

// SETTINGS UI

const cog = document.getElementById("settings-cog");
const panel = document.getElementById("settings-panel");

cog.addEventListener("click", () => {
    panel.classList.toggle("hidden-settings");
});

document.getElementById("apply-settings").addEventListener("click", () => {

    settings.AH = document.getElementById("setting-AH").checked;
    settings.MD = document.getElementById("setting-MD").checked;
    settings.MH = document.getElementById("setting-MH").checked;
    settings.WH = document.getElementById("setting-WH").checked;

    restartGame();
});


// Convert date string into sortable number (handles BCE)
function getDateValue(dateString) {
    const isNegative = dateString.startsWith("-");
    const normalized = isNegative ? dateString.slice(1) : dateString;
    const parts = normalized.split("-");

    let year = parseInt(parts[0]);
    const month = parseInt(parts[1] || 1);
    const day = parseInt(parts[2] || 1);

    if (isNegative) year = -year;

    return year * 10000 + month * 100 + day;
}

// Load events from JSON
async function loadEvents() {
    const response = await fetch('data/dates.json');
    const data = await response.json();
    eventsData = data.events.filter(event => settings[event.subj]);
    startGame();
}


// Start the game
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
function pickStartingCards(){

    const shuffled = [...eventsData].sort(() => 0.5 - Math.random());

    if (shuffled.length < 2) return;

    const first = shuffled.pop();
    const second = shuffled.pop();

    usedEvents.push(first, second);

    tableCards.push(first);
    currentQuestion = second;
}

// Setup question card
function setupQuestionCard() {
    const questionEvent = document.getElementById('question-event');
    const questionCard = document.getElementById('question-card');

    if (!currentQuestion) {
    questionEvent.textContent = "";
    questionCard.style.opacity = '0';
    return;
}

    questionCard.style.opacity = "1";
    questionCard.style.display = 'block';

    questionEvent.textContent = currentQuestion.event;

    questionCard.setAttribute('draggable', true);

    const oldImgDiv = questionCard.querySelector('.card-img');
    if (oldImgDiv) oldImgDiv.remove();

    if (currentQuestion.imgUrl) {
        questionCard.style.position = 'relative';

        const imgDiv = document.createElement('div');
        imgDiv.classList.add('card-img');
        imgDiv.style.backgroundImage = `url('data_images/${currentQuestion.imgUrl}')`;
        questionCard.appendChild(imgDiv);
    }

    questionCard.ondragstart = dragStart;
    focusDateInput();
}


// Update table with cards and drop zones
function updateTable() {
    const table = document.getElementById('card-container-table');
    table.innerHTML = '';

    tableCards.forEach((card, index) => {

        const wrapper = document.createElement('div');
        wrapper.classList.add('card-wrapper');

        const leftDZ = createDropZone(index);
        const cardElement = createAnswerCard(card, index);

if (card.wrong) {
    cardElement.classList.add('wrong');
}

if (card.latest) {
    cardElement.classList.add('latest');
}

        const rightDZ = createDropZone(index + 1);

        wrapper.appendChild(leftDZ);
        wrapper.appendChild(cardElement);
        wrapper.appendChild(rightDZ);

        table.appendChild(wrapper);
    });
}



// Create drop zone
function createDropZone(position) {

    const dropZone = document.createElement('div');
    dropZone.classList.add('drop-zone');
    dropZone.dataset.position = position;

    dropZone.addEventListener('dragover', e => e.preventDefault());
    dropZone.addEventListener('drop', handleDrop);

    dropZone.addEventListener('click', () => {
        handleManualDrop(dropZone.dataset.position);
    });

    return dropZone;
}


// Create answer card
function createAnswerCard(card, index) {

    const cardDiv = document.createElement('div');
    cardDiv.classList.add('card');
    cardDiv.dataset.index = index;

    cardDiv.setAttribute('tabindex', '0');


cardDiv.addEventListener('keydown', (e) => {

    const cards = Array.from(document.querySelectorAll('.card'));
    const currentIndex = cards.indexOf(cardDiv);

    if (e.key === 'ArrowRight') {
        e.preventDefault();
        const next = cards[currentIndex + 1];
        if (next) next.focus();
    }

    if (e.key === 'ArrowLeft') {
        e.preventDefault();
        const prev = cards[currentIndex - 1];
        if (prev) prev.focus();
    }

    if (e.key === 'Enter') {
        e.preventDefault();
        cardDiv.classList.toggle('hidden');
        front.classList.toggle('hidden');
        back.classList.toggle('hidden');
    }

    if (e.key === 'b') {
   
    
        arrow.click();
    }

     if (e.shiftKey && e.key === 'Enter') {
        e.preventDefault();
        arrow.click();
    }






    
});

    if (card.imgUrl) {

        cardDiv.style.position = 'relative';

        const imgDiv = document.createElement('div');
        imgDiv.classList.add('card-img');
        imgDiv.style.backgroundImage = `url('data_images/${card.imgUrl}')`;

        cardDiv.appendChild(imgDiv);
    }

    
    const front = document.createElement('div');
    front.classList.add('card-info');

    front.innerHTML =
        `<h3>${card.year}</h3>
         <p class="event">${card.event}</p>
         <p class="info1">${card.info1}</p>`;

    const back = document.createElement('div');
    back.classList.add('card-info-2', 'hidden');


    back.innerHTML =
        `<p class="info2">${card.info2}</p>`;


    const arrow = document.createElement('span');
    arrow.classList.add('card-globe');
    arrow.textContent = '🌐';

    arrow.addEventListener('click', () => {

        const searchQuery = `${card.event} wikipedia`;
        const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`;

        window.open(searchUrl, '_blank');
    });

    cardDiv.appendChild(arrow);
    cardDiv.appendChild(front);
    cardDiv.appendChild(back);

    cardDiv.addEventListener('click', () => {

        cardDiv.classList.toggle('hidden');
        front.classList.toggle('hidden');
        back.classList.toggle('hidden');
    });

    return cardDiv;
}


// Handle drag start
function dragStart(e) {
    e.dataTransfer.setData('text/plain', 'dragging');
}


// Check chronological order
function isOrderCorrect() {

    for (let i = 1; i < tableCards.length; i++) {

        if (getDateValue(tableCards[i - 1].year) > getDateValue(tableCards[i].year)) {
            return false;
        }
    }

    return true;
}


// Update hearts
function updateHearts() {

    for (let i = 1; i <= 3; i++) {

        const heart = document.getElementById(`heart${i}`);

        if (i <= strikes) {
            heart.textContent = '🤍';
        } else {
            heart.textContent = '❤️';
        }
    }
}


// Pick next question
function pickNextQuestion() {

    const remaining = eventsData.filter(event => !usedEvents.includes(event));

    if (remaining.length === 0) {

        currentQuestion = null;
        setupQuestionCard();
        disableDragging();

        setTimeout(() => {

            if (confirm("You've placed all events! Replay?")) {
                location.reload();
            }

        }, 100);

        return;
    }

    const next = remaining[Math.floor(Math.random() * remaining.length)];

    usedEvents.push(next);
    currentQuestion = next;

    setupQuestionCard();
}


// Disable dragging
function disableDragging() {

    const questionCard = document.getElementById('question-card');
    questionCard.setAttribute('draggable', false);
}


// Handle drag drop
function handleDrop(e) {

    e.preventDefault();

    clearLatestWrong();   // remove latest marker from previous mistake


    const position = parseInt(e.currentTarget.dataset.position);

    const insertedCard = { ...currentQuestion, wrong: false };

    tableCards.splice(position, 0, insertedCard);

    if (isOrderCorrect()) {

        score++;
        document.getElementById('score').textContent = `Score: ${score}`;

        updateTable();
        pickNextQuestion();
        return;

    } else {

        if (latestWrongCard) {
            latestWrongCard.latest = false;
        } // Remove previous latest flag


        // Mark new wrong card
        insertedCard.wrong = true;
        insertedCard.latest = true;
        latestWrongCard = insertedCard;

        strikes++;
        updateHearts();

        updateTable(); // render the wrong class

        if (strikes >= 3) {

            setTimeout(() => {
                alert("Game Over! Final Score: " + score);
                disableDragging();
            }, 150);

            return;
        }

        tableCards.sort((a, b) => getDateValue(a.year) - getDateValue(b.year));
    }

    pickNextQuestion();
    updateTable();
}

// Handle click placement
function handleManualDrop(position) {

    clearLatestWrong();   // remove latest marker from previous mistake


    position = parseInt(position);

    const insertedCard = { ...currentQuestion, wrong: false };

    tableCards.splice(position, 0, insertedCard);

    if (isOrderCorrect()) {

        score++;
        document.getElementById('score').textContent = `Score: ${score}`;

        updateTable();
            if (tableCards.length >= 20) {
                shrinkQuestionCard();
            }
                
        showCorrectYearFeedback();

setTimeout(() => {
    pickNextQuestion();
}, 999);

        return;

    } else {

        // Remove previous latest flag
        if (latestWrongCard) {
            latestWrongCard.latest = false;
        }

        // Mark new wrong card
        insertedCard.wrong = true;
        insertedCard.latest = true;
        latestWrongCard = insertedCard;

        strikes++;
        updateHearts();

        updateTable(); // render wrong class

        if (tableCards.length >= 20) {
            shrinkQuestionCard();
        }

        if (strikes >= 3) {

            setTimeout(() => {
                alert("Game Over! Final Score: " + score);
                disableDragging();
            }, 150);

            return;
        }

        tableCards.sort((a, b) => getDateValue(a.year) - getDateValue(b.year));
    }


    showCorrectYearFeedback();

setTimeout(() => {
    pickNextQuestion();
}, 999);

    updateTable();
}

function clearLatestWrong() {

    if (latestWrongCard) {
        latestWrongCard.latest = false;
        latestWrongCard = null;
    }
}

function handleDateSubmit() {

    if (!currentQuestion) return;

    const inputEl = document.getElementById("date-input");
    const input = inputEl.value.trim();
    if (!input) return;

    clearLatestWrong();

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

function showCorrectYearFeedback() {

    const inputEl = document.getElementById("date-input");

    if (!currentQuestion || !inputEl) return;

    inputEl.value = currentQuestion.year;
    inputEl.style.color = "#00c853";

    inputEl.disabled = true;

    setTimeout(() => {
        inputEl.value = "";
        inputEl.style.color = "";
        inputEl.disabled = false;

        focusDateInput(); 
    }, 700);
}

function focusDateInput() {
    const input = document.getElementById("date-input");
    if (input) {
        input.focus();
        input.select(); // optional: highlights text
    }
}
document.addEventListener("keydown", function (e) {
    const input = document.getElementById("date-input");

    // If input is already focused, do nothing
    if (document.activeElement === input) return;

    // Check for number keys (top row + numpad)
    const isNumberKey =
        (e.key >= "0" && e.key <= "9") || // main keyboard
        (e.code && e.code.startsWith("Numpad")); // numpad

    if (isNumberKey) {
        focusDateInput();
    }
});

function restartGame() {

    // Reset game state
    usedEvents = [];
    tableCards = [];
    latestWrongCard = null;
    currentQuestion = null;
    strikes = 0;
    score = 0;

    // Reset UI
    document.getElementById("score").textContent = "Score: 0";
    updateHearts();

    // Clear table
    document.getElementById("card-container-table").innerHTML = "";

    // Reset question card
    const questionCard = document.getElementById("question-card");
    const questionEvent = document.getElementById("question-event");

    questionEvent.textContent = "";
    questionCard.style.opacity = "0";
    questionCard.removeAttribute("draggable");

    const oldImg = questionCard.querySelector(".card-img");
    if (oldImg) oldImg.remove();

    // Reload filtered events
    loadEvents();
}

function shrinkQuestionCard() {
    document.getElementById("question-card").classList.add("shrunk");
}

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



// Start game
loadEvents();