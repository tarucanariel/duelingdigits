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

    // ===== DOM ELEMENTS =====
    const laserSound = document.getElementById("laser-sound");
    const explosionSound = document.getElementById("explosion-sound");
    const winSound = document.getElementById("win-sound");

    // ===== GAME FUNCTIONS =====
    function showModeSelection() {
      document.getElementById("mode-selection").style.display = "flex";
      document.getElementById("game-container").style.display = "none";
      document.getElementById("game-over").classList.remove("show");
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
      
      // Clear previous names
      document.getElementById("player1-name").value = '';
      
      // Show name input modal
      nameModal.style.display = "block";
      
      // Focus on first input field
      document.getElementById("player1-name").focus();
    }

    function startGameWithNames() {
      const nameModal = document.getElementById("name-input-modal");
      const p1Name = document.getElementById("player1-name").value.trim();
      const p2Name = document.getElementById("player2-name").value.trim();
      
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
      operatorAssignment = {};
      gameActive = true;
      document.getElementById("game-over").classList.remove("show");
      
      updateScores();
      updateTurnIndicator();
      generateIntegers();
      buildBoard();
      populateIntegerPool();
      preAssignOperators();
    }

    function preAssignOperators() {
      const operatorCells = [];
      for (let row = 0; row < 5; row++) {
        for (let col = 0; col < 5; col++) {
          if (boardLayout[row][col] === "O") {
            operatorCells.push({row, col});
          }
        }
      }
      
      const shuffledOperators = [...operators].sort(() => Math.random() - 0.5);
      operatorCells.forEach((cell, index) => {
        operatorAssignment[`${cell.row},${cell.col}`] = shuffledOperators[index % shuffledOperators.length];
      });
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
      cell.innerText = value;
      cell.classList.add("placed");
      
      // Play laser sound
      laserSound.currentTime = 0;
      laserSound.play();
      
      // Remove from pool
      document.querySelector(`[data-index='${index}']`).remove();
      
      moveCount++;
      revealOperators();
      
      if (moveCount === 12) {
        endGame();
      } else {
        currentPlayer = currentPlayer === 1 ? 2 : 1;
        updateTurnIndicator();
        
        // AI move if it's Player 2's turn in computer mode
        if (currentPlayer === 2 && gameMode === 'computer') {
          setTimeout(() => {
            aiMove();
          }, 1000);
        }
      }
    }

    function aiMove() {
      if (!gameActive || gameMode !== 'computer') return;
      
      aiThinking = true;
      
      // AI "thinking" delay
      setTimeout(() => {
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
        
        aiThinking = false;
      }, 1000);
    }

    function revealOperators() {
      const revealed = document.querySelectorAll(".cell[data-type='O']");
      
      if (moveCount >= 2) {
        for (let cell of revealed) {
          if (cell.innerText === "") {
            const row = cell.dataset.row;
            const col = cell.dataset.col;
            cell.innerText = operatorAssignment[`${row},${col}`];
            break;
          }
        }
      }
    }

    function endGame() {
      gameActive = false;
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
          expression += cell.innerText + " ";
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
          expression += cell.innerText + " ";
        } else if (cell.innerText !== "") {
          expression += cell.innerText + " ";
        }
      }
      
      return expression.trim();
    }

    function evaluateExpression(expression) {
      let mathExpr = expression.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-');
      try {
        return new Function(`return ${mathExpr}`)();
      } catch (e) {
        console.error("Error evaluating:", expression, e);
        return 0;
      }
    }

    function showScorePopups() {
      const board = document.getElementById("board");
      
      // Player 1 score popup (row 2)
      const row2 = document.querySelector(`.cell[data-row="1"]`);
      if (row2) {
        createScorePopup(row2, `+${evaluateExpression(getRowExpression(1)).toFixed(2)}`, "#00ff00");
      }
      
      // Player 1 score popup (row 4)
      const row4 = document.querySelector(`.cell[data-row="3"]`);
      if (row4) {
        createScorePopup(row4, `+${evaluateExpression(getRowExpression(3)).toFixed(2)}`, "#00ff00");
      }
      
      // Player 2 score popup (column 2)
      const col2 = document.querySelector(`.cell[data-col="1"]`);
      if (col2) {
        createScorePopup(col2, `+${evaluateExpression(getColumnExpression(1)).toFixed(2)}`, "#0088ff");
      }
      
      // Player 2 score popup (column 4)
      const col4 = document.querySelector(`.cell[data-col="3"]`);
      if (col4) {
        createScorePopup(col4, `+${evaluateExpression(getColumnExpression(3)).toFixed(2)}`, "#0088ff");
      }
    }

    function createScorePopup(element, text, color) {
      const popup = document.createElement("div");
      popup.classList.add("score-popup");
      popup.innerText = text;
      popup.style.color = color;
      
      const rect = element.getBoundingClientRect();
      popup.style.left = `${rect.left + rect.width/2}px`;
      popup.style.top = `${rect.top}px`;
      
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
      return color.replace(/\d+/g, num => Math.floor(parseInt(num) * amount));
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

    // Set up name input submission
    document.getElementById("name-submit-btn").addEventListener("click", startGameWithNames);
    
    // Allow pressing Enter to submit names
    document.getElementById("player1-name").addEventListener("keypress", function(e) {
      if (e.key === "Enter") {
        startGameWithNames();
      }
    });
    
    document.getElementById("player2-name").addEventListener("keypress", function(e) {
      if (e.key === "Enter") {
        startGameWithNames();
      }
    });

    // Show mode selection screen when page loads
    window.onload = showModeSelection;
  