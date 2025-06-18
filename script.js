const board = document.getElementById("chessboard");
const turnIndicator = document.getElementById("turn-indicator");
const timerDisplay = document.getElementById("timer");

const pieces = {
  r: "♜", n: "♞", b: "♝", q: "♛", k: "♚", p: "♟",
  R: "♖", N: "♘", B: "♗", Q: "♕", K: "♔", P: "♙", "": ""
};

let gameBoard = [
  ["r", "n", "b", "q", "k", "b", "n", "r"],
  ["p", "p", "p", "p", "p", "p", "p", "p"],
  ["", "", "", "", "", "", "", ""],
  ["", "", "", "", "", "", "", ""],
  ["", "", "", "", "", "", "", ""],
  ["", "", "", "", "", "", "", ""],
  ["P", "P", "P", "P", "P", "P", "P", "P"],
  ["R", "N", "B", "Q", "K", "B", "N", "R"]
];

let moveHistory = [];
let selected = null;
let highlights = [];
let currentPlayer = "white";
let timer = 30;
let interval = setInterval(updateTimer, 1000);

const castlingRights = {
  white: { kingMoved: false, rookAMoved: false, rookHMoved: false },
  black: { kingMoved: false, rookAMoved: false, rookHMoved: false },
};

function renderBoard() {
  const inCheck = isKingInCheck(currentPlayer);
  const kingPos = findKing(currentPlayer);
  board.innerHTML = "";

  turnIndicator.textContent = "Current Turn: " + currentPlayer[0].toUpperCase() + currentPlayer.slice(1);

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const square = document.createElement("div");
      square.classList.add("square");
      square.classList.add((row + col) % 2 === 0 ? "white" : "black");
      square.dataset.row = row;
      square.dataset.col = col;
      square.textContent = pieces[gameBoard[row][col]];

      if (selected && selected.row === row && selected.col === col) {
        square.classList.add("selected");
      }

      const highlight = highlights.find(p => p.row === row && p.col === col);
      if (highlight) {
        const target = gameBoard[row][col];
        const isWhite = currentPlayer === "white";
        const isEnemy = target && (isWhite !== /[A-Z]/.test(target));
        square.classList.add(isEnemy ? "capture" : "highlight");
      }

      if (inCheck && row === kingPos.row && col === kingPos.col) {
        square.classList.add("check");
      }

      square.setAttribute("draggable", "true");
      square.addEventListener("click", () => onSquareClick(row, col));
      square.addEventListener("dragstart", e => onDragStart(e, row, col));
      square.addEventListener("dragover", e => e.preventDefault());
      square.addEventListener("drop", e => onDrop(e, row, col));

      board.appendChild(square);
    }
  }
}

function onSquareClick(row, col) {
  const piece = gameBoard[row][col];

  if (selected) {
    if (highlights.some(p => p.row === row && p.col === col)) {
      moveHistory.push(structuredClone(gameBoard));
      movePiece(selected.row, selected.col, row, col);
      renderBoard();
      if (isCheckmate(currentPlayer === "white" ? "black" : "white")) {
        setTimeout(() => alert(currentPlayer + " wins by checkmate!"), 100);
        return;
      }
      currentPlayer = currentPlayer === "white" ? "black" : "white";
      resetTimer();
    }
    selected = null;
    highlights = [];
  } else if (piece && ((currentPlayer === "white" && /[A-Z]/.test(piece)) ||
                       (currentPlayer === "black" && /[a-z]/.test(piece)))) {
    selected = { row, col };
    highlights = getSafeLegalMoves(piece, row, col);
  }
  renderBoard();
}

function movePiece(fromRow, fromCol, toRow, toCol) {
  const movingPiece = gameBoard[fromRow][fromCol];
  const targetPiece = gameBoard[toRow][toCol];
  const isWhite = movingPiece === movingPiece.toUpperCase();
  const color = isWhite ? "white" : "black";

  if (movingPiece.toLowerCase() === "k" && Math.abs(toCol - fromCol) === 2) {
    const direction = toCol - fromCol > 0 ? 1 : -1;
    const rookFromCol = direction > 0 ? 7 : 0;
    const rookToCol = fromCol + direction;
    gameBoard[toRow][toCol] = movingPiece;
    gameBoard[fromRow][fromCol] = "";
    gameBoard[toRow][rookToCol] = gameBoard[toRow][rookFromCol];
    gameBoard[toRow][rookFromCol] = "";
    castlingRights[color].kingMoved = true;
    if (direction > 0) castlingRights[color].rookHMoved = true;
    else castlingRights[color].rookAMoved = true;
    return;
  }

  if (movingPiece.toLowerCase() === "k") castlingRights[color].kingMoved = true;
  if (movingPiece.toLowerCase() === "r") {
    if (fromCol === 0) castlingRights[color].rookAMoved = true;
    if (fromCol === 7) castlingRights[color].rookHMoved = true;
  }

  if (targetPiece === "k" || targetPiece === "K") {
    gameBoard[toRow][toCol] = movingPiece;
    gameBoard[fromRow][fromCol] = "";
    renderBoard();
    setTimeout(() => {
      alert((isWhite ? "White" : "Black") + " wins by capturing the king!");
      resetGame();
    }, 100);
    return;
  }

  gameBoard[toRow][toCol] = movingPiece;
  gameBoard[fromRow][fromCol] = "";

  if (/[Pp]/.test(movingPiece) && (toRow === 0 || toRow === 7)) {
    let promoted = prompt("Promote to (Q/R/B/N):", "Q");
    promoted = promoted ? promoted.toUpperCase() : "Q";
    gameBoard[toRow][toCol] = isWhite ? promoted : promoted.toLowerCase();
  }
}

function isStalemate(color) {
  if (isKingInCheck(color)) return false;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = gameBoard[r][c];
      if (!p) continue;
      if ((color === "white" && p === p.toUpperCase()) || (color === "black" && p === p.toLowerCase())) {
        if (getSafeLegalMoves(p, r, c).length > 0) return false;
      }
    }
  }
  return true;
}

function onDragStart(e, row, col) {
  if ((currentPlayer === "white" && /[A-Z]/.test(gameBoard[row][col])) ||
      (currentPlayer === "black" && /[a-z]/.test(gameBoard[row][col]))) {
    selected = { row, col };
    highlights = getSafeLegalMoves(gameBoard[row][col], row, col);
    e.dataTransfer.setData("text/plain", JSON.stringify({ row, col }));
  }
}

function onDrop(e, row, col) {
  e.preventDefault();
  const from = JSON.parse(e.dataTransfer.getData("text/plain"));
  if (highlights.some(p => p.row === row && p.col === col)) {
    moveHistory.push(structuredClone(gameBoard));
    movePiece(from.row, from.col, row, col);
    currentPlayer = currentPlayer === "white" ? "black" : "white";
    resetTimer();
  }
  selected = null;
  highlights = [];
  renderBoard();
}

function resetGame() {
  gameBoard = [
    ["r", "n", "b", "q", "k", "b", "n", "r"],
    ["p", "p", "p", "p", "p", "p", "p", "p"],
    ["", "", "", "", "", "", "", ""],
    ["", "", "", "", "", "", "", ""],
    ["", "", "", "", "", "", "", ""],
    ["", "", "", "", "", "", "", ""],
    ["P", "P", "P", "P", "P", "P", "P", "P"],
    ["R", "N", "B", "Q", "K", "B", "N", "R"]
  ];
  selected = null;
  highlights = [];
  currentPlayer = "white";
  resetTimer();
  renderBoard();
}

function undoMove() {
  if (moveHistory.length > 0) {
    gameBoard = moveHistory.pop();
    currentPlayer = currentPlayer === "white" ? "black" : "white";
    resetTimer();
    renderBoard();
  }
}

function updateTimer() {
  timer--;
  timerDisplay.textContent = timer;
  if (timer <= 0) {
    alert(currentPlayer + " ran out of time!");
    resetGame();
  }
}

function resetTimer() {
  timer = 30;
  clearInterval(interval);
  interval = setInterval(updateTimer, 1000);
}

function getSafeLegalMoves(piece, row, col) {
  const candidateMoves = getLegalMoves(piece, row, col);
  const legal = [];
  for (const move of candidateMoves) {
    const tempBoard = structuredClone(gameBoard);
    tempBoard[move.row][move.col] = tempBoard[row][col];
    tempBoard[row][col] = "";
    const originalBoard = gameBoard;
    gameBoard = tempBoard;
    const stillInCheck = isKingInCheck(currentPlayer);
    gameBoard = originalBoard;
    if (!stillInCheck) legal.push(move);
  }
  return legal;
}

function getLegalMoves(piece, row, col) {
  const moves = [];
  const isWhite = piece === piece.toUpperCase();
  piece = piece.toLowerCase();

  const directions = {
    r: [[1, 0], [-1, 0], [0, 1], [0, -1]],
    b: [[1, 1], [1, -1], [-1, 1], [-1, -1]],
    q: [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]],
    k: [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]],
    n: [[2, 1], [1, 2], [-1, 2], [-2, 1], [-2, -1], [-1, -2], [1, -2], [2, -1]]
  };

  if (piece === "n" || piece === "k") {
    for (const [dr, dc] of directions[piece]) {
      const r = row + dr, c = col + dc;
      if (r < 0 || r > 7 || c < 0 || c > 7) continue;
      const target = gameBoard[r][c];
      if (!target || (isWhite !== /[A-Z]/.test(target))) {
        moves.push({ row: r, col: c });
      }
    }
    return moves;
  }

  if (piece === "p") {
    const dir = isWhite ? -1 : 1;
    if (!gameBoard[row + dir]?.[col]) {
      moves.push({ row: row + dir, col: col });
      if ((isWhite && row === 6) || (!isWhite && row === 1)) {
        if (!gameBoard[row + 2 * dir][col]) {
          moves.push({ row: row + 2 * dir, col });
        }
      }
    }

    [-1, 1].forEach(offset => {
      const r = row + dir;
      const c = col + offset;
      if (r >= 0 && r <= 7 && c >= 0 && c <= 7) {
        const target = gameBoard[r][c];
        if (target && isWhite !== /[A-Z]/.test(target)) {
          moves.push({ row: r, col: c });
        }
      }
    });
    return moves;
  }

  for (const [dr, dc] of directions[piece] || []) {
    for (let step = 1; step < 8; step++) {
      const r = row + dr * step;
      const c = col + dc * step;
      if (r < 0 || r > 7 || c < 0 || c > 7) break;
      const target = gameBoard[r][c];
      if (!target) {
        moves.push({ row: r, col: c });
      } else {
        if (isWhite !== /[A-Z]/.test(target)) {
          moves.push({ row: r, col: c });
        }
        break;
      }
    }
  }

  return moves;
}

function isKingInCheck(color) {
  const king = color === "white" ? "K" : "k";
  const kingPos = findKing(color);
  const opponent = color === "white" ? "black" : "white";

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = gameBoard[r][c];
      if (p && ((opponent === "white" && /[A-Z]/.test(p)) ||
                (opponent === "black" && /[a-z]/.test(p)))) {
        const moves = getLegalMoves(p, r, c);
        if (moves.some(m => m.row === kingPos.row && m.col === kingPos.col)) {
          return true;
        }
      }
    }
  }
  return false;
}

function isCheckmate(color) {
  if (!isKingInCheck(color)) return false;

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = gameBoard[r][c];
      if (!piece) continue;

      const isWhite = piece === piece.toUpperCase();
      const isFriendly = (color === "white" && isWhite) || (color === "black" && !isWhite);
      if (!isFriendly) continue;

      const legalMoves = getLegalMoves(piece, r, c);
      for (const move of legalMoves) {
        const captured = gameBoard[move.row][move.col];
        gameBoard[move.row][move.col] = piece;
        gameBoard[r][c] = "";

        const stillInCheck = isKingInCheck(color);

        gameBoard[r][c] = piece;
        gameBoard[move.row][move.col] = captured;

        if (!stillInCheck) return false;
      }
    }
  }

  return true;
}

function findKing(color) {
  const symbol = color === "white" ? "K" : "k";
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (gameBoard[r][c] === symbol) return { row: r, col: c };
    }
  }
  return null;
}

renderBoard();
