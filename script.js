// ===== GAME STATE =====
const boardLayout = [
    ["X", "2", "X", "2", "X"],
    ["1", "O", "1", "O", "1"],
    ["X", "2", "X", "2", "X"],
    ["1", "O", "1", "O", "1"],
    ["X", "2", "X", "2", "X"]
];

let currentPlayer = 1;
let integers = [];
let moveCount = 0;
const operators = ["+", "−", "×", "÷"];
let playerScores = { 1: 0, 2: 0 };
let operatorAssignment = {};
let gameActive = true;
let aiThinking = false;
let gameMode = 'computer'; // 'computer' or 'human'
let playerNames = { 1: "Player 1", 2: "Player 2" };

// Timer variables for individual player timers
let playerTimers = { 1: 0, 2: 0 }; // in seconds
let timerIntervals = { 1: null, 2: null };
let useTimer = false; // Flag to enable/disable timers

// Operator generation control
let operatorRevealQueue = []; // Stores the coordinates of operator cells to be revealed
const operatorRevealMoves = [2, 4, 6]; // Moves at which operators are revealed (1st after 2, 2nd after 4, 3rd & 4th after 6)

// Practice test variables
let practiceQuestions = [];
let practiceAnswers = {};
let practiceStartTime = 0;
let practiceTimerInterval = null;

// ===== DOM ELEMENTS =====
const laserSound = document.getElementById("laser-sound");
const explosionSound = document.getElementById("explosion-sound");
const winSound = document.getElementById("win-sound");
const timerPlayer1Display = document.getElementById("timer-player1");
const timerPlayer2Display = document.getElementById("timer-player2");

// ===== NEW AUDIO ELEMENTS =====
const arielSound = new Audio("assets/iloveyouariel.mp3");
const wowSound = new Audio("assets/wow.mp3");


// ===== GAME FUNCTIONS =====
function showModeSelection() {
    document.getElementById("mode-selection").style.display = "flex";
    document.getElementById("game-container").style.display = "none";
    document.getElementById("game-over").classList.remove("show");
    // Clear any existing timer intervals
    clearInterval(timerIntervals[1]);
    clearInterval(timerIntervals[2]);
    timerPlayer1Display.textContent = "00:00"; // Reset timer display
    timerPlayer2Display.textContent = "00:00"; // Reset timer display
    useTimer = false; // Reset timer flag
}

function showNameInput(mode) {
    gameMode = mode;
    const nameModal = document.getElementById("name-input-modal");
    const player2InputGroup = document.getElementById("player2-input-group");

    // Hide mode selection
    document.getElementById("mode-selection").style.display = "none";

    // Show appropriate input fields based on game mode
    if (mode === 'computer') {
        player2InputGroup.style.display = 'none';
        document.getElementById("player2-name").value = 'Computer';
    } else {
        player2InputGroup.style.display = 'block';
        document.getElementById("player2-name").value = '';
    }

    // Clear previous names and timer input
    document.getElementById("player1-name").value = '';
    document.getElementById("game-timer").value = ''; // Clear timer input by default

    // Show name input modal
    nameModal.style.display = "block";

    // Focus on first input field
    document.getElementById("player1-name").focus();
}

function startGameWithNames() {
    const nameModal = document.getElementById("name-input-modal");
    const p1Name = document.getElementById("player1-name").value.trim();
    const p2Name = document.getElementById("player2-name").value.trim();
    const timerInput = document.getElementById("game-timer").value.trim();

    // ===== NEW CODE: Check if either player is named "Ariel" =====
    if (p1Name.toLowerCase() === "ariel" || p2Name.toLowerCase() === "ariel") {
        arielSound.currentTime = 0;
        arielSound.play();
    }
    // ===== END OF NEW CODE =====

    // Check if timer input is provided
    if (timerInput !== "") {
        const timeRegex = /^([0-5][0-9]):([0-5][0-9])$/;
        if (!timeRegex.test(timerInput)) {
            alert("Please enter a valid time in mm:ss format (e.g., 05:00 for 5 minutes) or leave blank to disable the timer.");
            return;
        }

        const parts = timerInput.split(':');
        const minutes = parseInt(parts[0], 10);
        const seconds = parseInt(parts[1], 10);
        const initialTimeInSeconds = (minutes * 60) + seconds;

        if (initialTimeInSeconds <= 0) {
            alert("Game timer must be greater than 0 seconds, or leave blank to disable it.");
            return;
        }

        playerTimers[1] = initialTimeInSeconds;
        playerTimers[2] = initialTimeInSeconds;
        useTimer = true; // Enable timers
        timerPlayer1Display.style.display = "block"; // Show timers
        if (gameMode === 'human') { // Only show player 2's timer in human mode
            timerPlayer2Display.style.display = "block";
        } else {
            timerPlayer2Display.style.display = "none";
        }
    } else {
        useTimer = false; // Disable timers
        timerPlayer1Display.style.display = "none"; // Hide timers
        timerPlayer2Display.style.display = "none";
    }

    // Set default names if empty
    playerNames[1] = p1Name || "Player 1";
    playerNames[2] = (gameMode === 'human' && p2Name) ? p2Name :
        (gameMode === 'computer' ? "Computer" : "Player 2");

    // Update UI with player names
    document.getElementById("player1-name-display").textContent = playerNames[1];
    document.getElementById("player2-name-display").textContent = playerNames[2];

    // Hide name modal
    nameModal.style.display = "none";

    // Start the game
    startGame();
}

function startGame() {
    document.getElementById("game-container").style.display = "flex";

    currentPlayer = 1;
    moveCount = 0;
    playerScores = { 1: 0, 2: 0 };
    operatorAssignment = {}; // Clear previous operator assignments
    gameActive = true;
    document.getElementById("game-over").classList.remove("show");

    updateScores();
    updateTurnIndicator();
    generateIntegers();
    buildBoard();
    populateIntegerPool();
    preAssignOperators(); // This now populates operatorRevealQueue

    if (useTimer) {
        updateTimersDisplay(); // Display initial time
        startCurrentPlayerTimer(); // Start the current player's timer
    }
}

function startCurrentPlayerTimer() {
    if (!useTimer || !gameActive) return;

    // Pause the other player's timer if in human mode
    if (gameMode === 'human') {
        clearInterval(timerIntervals[currentPlayer === 1 ? 2 : 1]);
    } else { // In computer mode, only player 1 has a timer
        clearInterval(timerIntervals[2]); // Ensure computer's timer is always clear
    }

    // Start the current player's timer (only player 1 in computer mode)
    if (gameMode === 'human' || (gameMode === 'computer' && currentPlayer === 1)) {
        clearInterval(timerIntervals[currentPlayer]); // Clear any previous interval for current player
        timerIntervals[currentPlayer] = setInterval(() => {
            playerTimers[currentPlayer]--;
            updateTimersDisplay();

            if (playerTimers[currentPlayer] <= 0) {
                clearInterval(timerIntervals[currentPlayer]);
                timeLoss(currentPlayer); // Player loses by time
            }
        }, 1000);
    }
}

function pauseTimers() {
    clearInterval(timerIntervals[1]);
    clearInterval(timerIntervals[2]);
}

function updateTimersDisplay() {
    const p1Minutes = Math.floor(playerTimers[1] / 60);
    const p1Seconds = playerTimers[1] % 60;
    timerPlayer1Display.textContent = `${p1Minutes.toString().padStart(2, '0')}:${p1Seconds.toString().padStart(2, '0')}`;
    timerPlayer1Display.style.color = currentPlayer === 1 ? "#00ff00" : "#ffcc00"; // Highlight active timer

    const p2Minutes = Math.floor(playerTimers[2] / 60);
    const p2Seconds = playerTimers[2] % 60;
    timerPlayer2Display.textContent = `${p2Minutes.toString().padStart(2, '0')}:${p2Seconds.toString().padStart(2, '0')}`;
    timerPlayer2Display.style.color = currentPlayer === 2 ? "#0088ff" : "#ffcc00"; // Highlight active timer
}

function timeLoss(playerNumber) {
    if (!gameActive) return; // Prevent multiple endGames

    gameActive = false;
    pauseTimers(); // Stop all timers

    const winner = playerNumber === 1 ? 2 : 1; // The other player wins

    const gameOverScreen = document.getElementById("game-over");
    const winnerText = document.getElementById("winner-text");

    winnerText.innerText = `${playerNames[playerNumber]} ran out of time! ${playerNames[winner]} WINS!`;
    winnerText.style.color = winner === 1 ? "#00ff00" : "#0088ff";

    winSound.currentTime = 0;
    winSound.play();

    createExplosions(winner === 1 ? "#00ff00" : "#0088ff");

    gameOverScreen.classList.add("show");
}

function preAssignOperators() {
    const operatorCells = [];
    for (let row = 0; row < 5; row++) {
        for (let col = 0; col < 5; col++) {
            if (boardLayout[row][col] === "O") {
                operatorCells.push({ row, col });
            }
        }
    }

    // Shuffle the operator cells for random placement
    operatorCells.sort(() => Math.random() - 0.5);

    const shuffledOperators = [...operators].sort(() => Math.random() - 0.5);

    // Assign operators to their positions but don't display them yet
    operatorCells.forEach((cell, index) => {
        operatorAssignment[`${cell.row},${cell.col}`] = shuffledOperators[index % shuffledOperators.length];
    });

    // Populate the reveal queue with the shuffled operator cell coordinates
    operatorRevealQueue = operatorCells;
}

function updateScores() {
    document.getElementById("score-player1").innerText = `${playerNames[1]}: ${playerScores[1].toFixed(2)}`;
    document.getElementById("score-player2").innerText = `${playerNames[2]}: ${playerScores[2].toFixed(2)}`;
}

function updateTurnIndicator() {
    const indicator = document.getElementById("turn-indicator");
    indicator.innerText = `TURN: ${playerNames[currentPlayer]}`;
    indicator.style.color = currentPlayer === 1 ? "#00ff00" : "#0088ff";
}

function generateIntegers() {
    integers = [];
    while (integers.length < 12) {
        let n = Math.floor(Math.random() * 21) - 10;
        if (n !== 0) integers.push(n);
    }
}

function buildBoard() {
    const board = document.getElementById("board");
    board.innerHTML = "";
    for (let row = 0; row < 5; row++) {
        for (let col = 0; col < 5; col++) {
            const cellType = boardLayout[row][col];
            if (cellType === "X") {
                const hidden = document.createElement("div");
                hidden.style.width = "70px";
                hidden.style.height = "70px";
                hidden.style.visibility = "hidden";
                board.appendChild(hidden);
                continue;
            }
            const div = document.createElement("div");
            div.classList.add("cell");
            div.dataset.row = row;
            div.dataset.col = col;
            div.dataset.type = cellType;
            div.ondragover = allowDrop;
            div.ondrop = drop;
            board.appendChild(div);
        }
    }
}

function populateIntegerPool() {
    const pool = document.getElementById("integer-pool");
    pool.innerHTML = "";
    integers.forEach((n, idx) => {
        const intDiv = document.createElement("div");
        intDiv.classList.add("integer");
        intDiv.innerText = n;
        intDiv.draggable = true;
        intDiv.dataset.value = n;
        intDiv.dataset.index = idx;
        intDiv.ondragstart = drag;
        pool.appendChild(intDiv);
    });
}

function drag(event) {
    event.dataTransfer.setData("text", event.target.dataset.index);
}

function allowDrop(event) {
    event.preventDefault();
}

function drop(event) {
    if (!gameActive || aiThinking) return;

    event.preventDefault();
    const index = event.dataTransfer.getData("text");
    const integer = integers[index];
    const target = event.target;

    if (!target.classList.contains("cell") || target.innerText !== "") return;
    const type = target.dataset.type;
    if ((currentPlayer === 1 && type !== "1") || (currentPlayer === 2 && type !== "2")) return;

    placeInteger(target, integer, index);
}

function placeInteger(cell, value, index) {
    if (!gameActive) return; // Prevent moves after game ends

    cell.innerText = value;
    cell.classList.add("placed");

    // Play laser sound
    laserSound.currentTime = 0;
    laserSound.play();

    // Remove from pool
    document.querySelector(`[data-index='${index}']`).remove();

    moveCount++;
    revealOperators(); // Call revealOperators after each move

    if (moveCount === 12) {
        endGame();
    } else {
        currentPlayer = currentPlayer === 1 ? 2 : 1;
        updateTurnIndicator();
        if (useTimer) {
            // Only start the timer for the current player if they are a human player.
            // For computer, the timer remains paused/cleared.
            if (gameMode === 'human' || (gameMode === 'computer' && currentPlayer === 1)) {
                startCurrentPlayerTimer(); // Switch active timer
            }
        }

        // AI move if it's Player 2's turn in computer mode
        if (currentPlayer === 2 && gameMode === 'computer') {
            aiThinking = true; // Set thinking flag
            if (useTimer) pauseTimers(); // Pause player 1's timer during AI thinking
            setTimeout(() => {
                aiMove();
            }, 1000);
        }
    }
}

function aiMove() {
    if (!gameActive || gameMode !== 'computer') {
        aiThinking = false;
        return;
    }

    const availableCells = Array.from(document.querySelectorAll(`.cell[data-type="2"]`))
        .filter(cell => cell.innerText === "");

    const availableIntegers = Array.from(document.querySelectorAll(".integer"));

    if (availableCells.length > 0 && availableIntegers.length > 0) {
        const randomCell = availableCells[Math.floor(Math.random() * availableCells.length)];
        const randomInteger = availableIntegers[Math.floor(Math.random() * availableIntegers.length)];

        placeInteger(
            randomCell,
            randomInteger.dataset.value,
            randomInteger.dataset.index
        );
    }

    aiThinking = false; // Reset thinking flag
    // In computer mode, only player 1's timer matters, so we don't restart a timer for the AI.
    if (useTimer && gameActive && currentPlayer === 1) startCurrentPlayerTimer();
}

function revealOperators() {
    // Generate the first operator after 2 moves
    if (moveCount === 2 && operatorRevealQueue.length >= 1) {
        const cellInfo = operatorRevealQueue.shift(); // Get the first operator cell from the shuffled queue
        const cellToReveal = document.querySelector(`.cell[data-row="${cellInfo.row}"][data-col="${cellInfo.col}"]`);
        cellToReveal.innerText = operatorAssignment[`${cellInfo.row},${cellInfo.col}`];
    }
    // Generate the second operator after 4 moves
    else if (moveCount === 4 && operatorRevealQueue.length >= 1) {
        const cellInfo = operatorRevealQueue.shift(); // Get the next operator cell
        const cellToReveal = document.querySelector(`.cell[data-row="${cellInfo.row}"][data-col="${cellInfo.col}"]`);
        cellToReveal.innerText = operatorAssignment[`${cellInfo.row},${cellInfo.col}`];
    }
    // Generate the third and fourth operators after the sixth move
    else if (moveCount === 6) {
        if (operatorRevealQueue.length >= 1) {
            const cellInfo1 = operatorRevealQueue.shift(); // Get the next operator cell
            const cellToReveal1 = document.querySelector(`.cell[data-row="${cellInfo1.row}"][data-col="${cellInfo1.col}"]`);
            cellToReveal1.innerText = operatorAssignment[`${cellInfo1.row},${cellInfo1.col}`];
        }
        if (operatorRevealQueue.length >= 1) {
            const cellInfo2 = operatorRevealQueue.shift(); // Get the last operator cell
            const cellToReveal2 = document.querySelector(`.cell[data-row="${cellInfo2.row}"][data-col="${cellInfo2.col}"]`);
            cellToReveal2.innerText = operatorAssignment[`${cellInfo2.row},${cellInfo2.col}`];
        }
    }
}


function endGame() {
    if (!gameActive) return; // Prevent multiple endGame calls

    gameActive = false;
    pauseTimers(); // Stop all timers

    calculateFinalScores();

    // Determine winner
    const winner = playerScores[1] > playerScores[2] ? 1 :
        playerScores[2] > playerScores[1] ? 2 : 0;

    // Show game over screen after 1 second delay
    setTimeout(() => {
        const gameOverScreen = document.getElementById("game-over");
        const winnerText = document.getElementById("winner-text");

        if (winner === 0) {
            winnerText.innerText = "DRAW!";
            winnerText.style.color = "white";
        } else {
            winnerText.innerText = `${playerNames[winner]} WINS!`;
            winnerText.style.color = winner === 1 ? "#00ff00" : "#0088ff";

            // Play win sound
            winSound.currentTime = 0;
            winSound.play();

            // Create explosions
            createExplosions(winner === 1 ? "#00ff00" : "#0088ff");
        }

        gameOverScreen.classList.add("show");
    }, 1000);
}

function calculateFinalScores() {
    playerScores = { 1: 0, 2: 0 };

    // Player 1: Rows 1 and 3 (0-based index)
    playerScores[1] += evaluateExpression(getRowExpression(1));
    playerScores[1] += evaluateExpression(getRowExpression(3));

    // Player 2: Columns 1 and 3 (0-based index)
    playerScores[2] += evaluateExpression(getColumnExpression(1));
    playerScores[2] += evaluateExpression(getColumnExpression(3));

    updateScores();

    // Show score popups
    showScorePopups();
}

function getRowExpression(row) {
    let expression = "";
    const cells = [];

    // Get all cells in the row in order
    for (let col = 0; col < 5; col++) {
        const cell = document.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
        if (cell) cells.push(cell);
    }

    // Build expression with operators
    for (let i = 0; i < cells.length; i++) {
        const cell = cells[i];
        if (cell.dataset.type === "O") {
            // Only add operator if a number is already present or it's the first element.
            // This helps prevent expressions like "+ 5" at the start.
            if (expression !== "" || i === 0) { // Operators can't start an expression, so only add if it's not the very first thing
                expression += cell.innerText + " ";
            }
        } else if (cell.innerText !== "") {
            expression += cell.innerText + " ";
        }
    }

    return expression.trim();
}

function getColumnExpression(col) {
    let expression = "";
    const cells = [];

    // Get all cells in the column in order
    for (let row = 0; row < 5; row++) {
        const cell = document.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
        if (cell) cells.push(cell);
    }

    // Build expression with operators
    for (let i = 0; i < cells.length; i++) {
        const cell = cells[i];
        if (cell.dataset.type === "O") {
            if (expression !== "" || i === 0) {
                expression += cell.innerText + " ";
            }
        } else if (cell.innerText !== "") {
            expression += cell.innerText + " ";
        }
    }

    return expression.trim();
}

function evaluateExpression(expression) {
    // Remove trailing operators, e.g., "5 +" should become "5"
    expression = expression.replace(/[\+\-\×÷]\s*$/, '');
    let mathExpr = expression.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-');
    try {
        // Basic validation to prevent arbitrary code execution
        if (!/^[0-9\s\+\-\*\/\.]+$/.test(mathExpr)) {
            console.error("Invalid characters in expression:", mathExpr);
            return 0;
        }
        return new Function(`return ${mathExpr}`)();
    } catch (e) {
        console.error("Error evaluating:", expression, e);
        return 0;
    }
}

function showScorePopups() {
    // Player 1 score popup (row 2)
    const row2firstCell = document.querySelector(`.cell[data-row="1"][data-col="1"]`);
    if (row2firstCell) {
        createScorePopup(row2firstCell, `+${evaluateExpression(getRowExpression(1)).toFixed(2)}`, "#00ff00");
    }

    // Player 1 score popup (row 4)
    const row4firstCell = document.querySelector(`.cell[data-row="3"][data-col="1"]`);
    if (row4firstCell) {
        createScorePopup(row4firstCell, `+${evaluateExpression(getRowExpression(3)).toFixed(2)}`, "#00ff00");
    }

    // Player 2 score popup (column 2)
    const col2firstCell = document.querySelector(`.cell[data-row="1"][data-col="1"]`);
    if (col2firstCell) {
        createScorePopup(col2firstCell, `+${evaluateExpression(getColumnExpression(1)).toFixed(2)}`, "#0088ff", "right");
    }

    // Player 2 score popup (column 4)
    const col4firstCell = document.querySelector(`.cell[data-row="1"][data-col="3"]`);
    if (col4firstCell) {
        createScorePopup(col4firstCell, `+${evaluateExpression(getColumnExpression(3)).toFixed(2)}`, "#0088ff", "right");
    }
}

function createScorePopup(element, text, color, alignment = "left") {
    const popup = document.createElement("div");
    popup.classList.add("score-popup");
    popup.innerText = text;
    popup.style.color = color;

    const rect = element.getBoundingClientRect();

    // Adjust position based on alignment
    if (alignment === "right") {
        popup.style.left = `${rect.right - 20}px`; // Offset a bit from the right
    } else {
        popup.style.left = `${rect.left + 20}px`; // Offset a bit from the left
    }
    popup.style.top = `${rect.top}px`;
    popup.style.textAlign = alignment;

    document.body.appendChild(popup);

    setTimeout(() => {
        popup.remove();
    }, 1000);
}


function createExplosions(color) {
    explosionSound.currentTime = 0;
    explosionSound.play();

    for (let i = 0; i < 20; i++) {
        setTimeout(() => {
            const explosion = document.createElement("div");
            explosion.classList.add("explosion");
            explosion.style.left = `${Math.random() * window.innerWidth}px`;
            explosion.style.top = `${Math.random() * window.innerHeight}px`;
            explosion.style.background = `radial-gradient(circle, ${color}, ${darkenColor(color, 0.5)}, #000)`;

            document.body.appendChild(explosion);

            setTimeout(() => {
                explosion.remove();
            }, 1000);
        }, i * 100);
    }
}

function darkenColor(color, amount) {
    // Simple color darkening for explosion effect
    // This is a very basic implementation and might not work for all color formats.
    // It assumes color is in hex format like "#RRGGBB".
    if (color.startsWith("#")) {
        let hex = color.slice(1);
        let r = parseInt(hex.substring(0, 2), 16);
        let g = parseInt(hex.substring(2, 4), 16);
        let b = parseInt(hex.substring(4, 6), 16);

        r = Math.floor(r * (1 - amount));
        g = Math.floor(g * (1 - amount));
        b = Math.floor(b * (1 - amount));

        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    }
    return color; // Return original if not a recognized format
}

function showInstructions() {
    const modal = document.getElementById("instructions-modal");
    const span = document.getElementsByClassName("close")[0];

    modal.style.display = "block";

    span.onclick = function() {
        modal.style.display = "none";
    }

    window.onclick = function(event) {
        if (event.target == modal) {
            modal.style.display = "none";
        }
    }
}

// ===== PRACTICE TEST FUNCTIONS =====
function startPracticeMode() {
    document.getElementById("mode-selection").style.display = "none";
    generatePracticeQuestions();
    displayPracticeQuestions();
    startPracticeTimer();
    document.getElementById("practice-modal").style.display = "block";
}

function closePracticeModal() {
    document.getElementById("practice-modal").style.display = "none";
    clearInterval(practiceTimerInterval);
    showModeSelection();
}

function closePracticeResults() {
    document.getElementById("practice-results").style.display = "none";
    showModeSelection();
}

function generatePracticeQuestions() {
    practiceQuestions = [];
    practiceAnswers = {};
    
    const operators = ['+', '−', '×'];
    
    for (let i = 0; i < 10; i++) {
        let validQuestion = false;
        let num1, num2, num3, op1, op2, answer;
        
        while (!validQuestion) {
            // Generate random numbers between -10 and 10, excluding 0
            num1 = Math.floor(Math.random() * 21) - 10;
            if (num1 === 0) num1 = 1;
            
            num2 = Math.floor(Math.random() * 21) - 10;
            if (num2 === 0) num2 = 1;
            
            num3 = Math.floor(Math.random() * 21) - 10;
            if (num3 === 0) num3 = 1;
            
            // Select random operators
            op1 = operators[Math.floor(Math.random() * operators.length)];
            op2 = operators[Math.floor(Math.random() * operators.length)];
            
            // Calculate the answer
            answer = calculateAnswer(num1, num2, num3, op1, op2);
            
            // Check if the answer is an integer
            if (Number.isInteger(answer)) {
                validQuestion = true;
            }
        }
        
        // Format the question
        const question = `${num1} ${op1} ${num2} ${op2} ${num3}`;
        
        // Generate options (one correct, three incorrect)
        const options = generateOptions(answer);
        
        practiceQuestions.push({
            question,
            options,
            answer
        });
    }
}

function calculateAnswer(num1, num2, num3, op1, op2) {
    // Apply operator precedence: multiplication first
    let result;
    
    if (op1 === '×') {
        result = num1 * num2;
        result = applyOperation(result, num3, op2);
    } else if (op2 === '×') {
        result = num2 * num3;
        result = applyOperation(num1, result, op1);
    } else {
        // No multiplication, left to right
        result = applyOperation(num1, num2, op1);
        result = applyOperation(result, num3, op2);
    }
    
    return result;
}

function applyOperation(a, b, op) {
    switch (op) {
        case '+': return a + b;
        case '−': return a - b;
        case '×': return a * b;
        default: return a + b;
    }
}

function generateOptions(correctAnswer) {
    const options = [correctAnswer];
    
    // Generate three unique wrong answers
    while (options.length < 4) {
        // Vary the wrong answer based on the correct answer
        let wrongAnswer;
        if (correctAnswer === 0) {
            wrongAnswer = Math.floor(Math.random() * 21) - 10;
        } else {
            const variation = Math.floor(Math.random() * 5) + 1;
            const sign = Math.random() > 0.5 ? 1 : -1;
            wrongAnswer = correctAnswer + (variation * sign);
        }
        
        // Ensure the wrong answer is different from all existing options
        if (!options.includes(wrongAnswer)) {
            options.push(wrongAnswer);
        }
    }
    
    // Shuffle the options
    return options.sort(() => Math.random() - 0.5);
}

function displayPracticeQuestions() {
    const container = document.getElementById("practice-questions");
    container.innerHTML = "";
    
    practiceQuestions.forEach((q, index) => {
        const questionDiv = document.createElement("div");
        questionDiv.className = "practice-question";
        
        const questionText = document.createElement("p");
        questionText.textContent = `${index + 1}. ${q.question} = ?`;
        questionDiv.appendChild(questionText);
        
        const optionsDiv = document.createElement("div");
        optionsDiv.className = "practice-options";
        
        const optionLetters = ['a', 'b', 'c', 'd'];
        q.options.forEach((option, optIndex) => {
            const optionDiv = document.createElement("div");
            optionDiv.className = "practice-option";
            optionDiv.textContent = `${optionLetters[optIndex]}) ${option}`;
            optionDiv.dataset.option = optionLetters[optIndex];
            optionDiv.dataset.value = option;
            
            optionDiv.onclick = function() {
                // Remove selected class from all options in this question
                const allOptions = optionsDiv.querySelectorAll(".practice-option");
                allOptions.forEach(opt => opt.classList.remove("selected"));
                
                // Add selected class to clicked option
                this.classList.add("selected");
                
                // Store the answer
                practiceAnswers[index] = option;
            };
            
            optionsDiv.appendChild(optionDiv);
        });
        
        questionDiv.appendChild(optionsDiv);
        container.appendChild(questionDiv);
    });
}

function startPracticeTimer() {
    practiceStartTime = Date.now();
    const timerElement = document.getElementById("practice-timer");
    
    clearInterval(practiceTimerInterval);
    practiceTimerInterval = setInterval(() => {
        const elapsedSeconds = Math.floor((Date.now() - practiceStartTime) / 1000);
        const minutes = Math.floor(elapsedSeconds / 60);
        const seconds = elapsedSeconds % 60;
        
        timerElement.textContent = `Time: ${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }, 1000);
}

function submitPracticeTest() {
    // Check if all questions are answered
    if (Object.keys(practiceAnswers).length < 10) {
        alert("My dear student, please answer all items before submitting.");
        return;
    }
    
    clearInterval(practiceTimerInterval);
    
    // Calculate score
    let correctCount = 0;
    practiceQuestions.forEach((q, index) => {
        if (practiceAnswers[index] === q.answer) {
            correctCount++;
        }
    });
    
    // ===== NEW CODE: Play wow sound if perfect score =====
    if (correctCount === 10) {
        wowSound.currentTime = 0;
        wowSound.play();
    }
    // ===== END OF NEW CODE =====
    
    const accuracy = (correctCount / 10) * 100;
    const elapsedSeconds = Math.floor((Date.now() - practiceStartTime) / 1000);
    const minutes = Math.floor(elapsedSeconds / 60);
    const seconds = elapsedSeconds % 60;
    
    // Display results
    document.getElementById("score-display").textContent = `Score: ${correctCount} out of 10`;
    document.getElementById("accuracy-display").textContent = `Accuracy: ${accuracy.toFixed(1)}%`;
    document.getElementById("time-display").textContent = `Time: ${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    // Show results modal
    document.getElementById("practice-modal").style.display = "none";
    document.getElementById("practice-results").style.display = "block";
}

// Set up name input submission
document.getElementById("name-submit-btn").addEventListener("click", startGameWithNames);

// Allow pressing Enter to submit names from player 1 name field
document.getElementById("player1-name").addEventListener("keypress", function(event) {
    if (event.key === "Enter") {
        event.preventDefault();
        startGameWithNames();
    }
});

// Allow pressing Enter to submit names from player 2 name field
document.getElementById("player2-name").addEventListener("keypress", function(event) {
    if (event.key === "Enter") {
        event.preventDefault();
        startGameWithNames();
    }
});

// Allow pressing Enter to submit names from game timer field
document.getElementById("game-timer").addEventListener("keypress", function(event) {
    if (event.key === "Enter") {
        event.preventDefault();
        startGameWithNames();
    }
});
