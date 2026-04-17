let game;
let ai;
let selectedSquare = null;
let validMoves = [];
let playerColor = 'w';
let currentCharacter = '';
let currentDifficulty = '';
let promotionPending = null;
let whiteTime = 600;
let blackTime = 600;
let timerInterval;

const pieceSymbols = {
    w: { k: '♔', q: '♕', r: '♖', b: '♗', n: '♘', p: '♙' },
    b: { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' }
};

function selectCharacter(character) {
    currentCharacter = character;
    document.getElementById('start-screen').classList.remove('active');
    document.getElementById('difficulty-screen').classList.add('active');
    const name = character === 'agnes' ? 'Agnes - La Estratega' : 'Rick - El Casual';
    document.getElementById('selected-character-name').textContent = `Jugar contra ${name}`;
    const container = document.getElementById('difficulty-container');
    container.innerHTML = '';
    const difficulties = ['easy', 'medium', 'hard', 'extreme'];
    if (character === 'agnes') difficulties.push('mega');
    const diffNames = { easy: 'Fácil', medium: 'Normal', hard: 'Difícil', extreme: 'Extremo', mega: 'Mega Extremo' };
    difficulties.forEach(diff => {
        const btn = document.createElement('button');
        btn.className = `difficulty-btn ${diff}`;
        btn.textContent = diffNames[diff];
        btn.onclick = () => startGame(diff);
        container.appendChild(btn);
    });
}

function startGame(difficulty) {
    currentDifficulty = difficulty;
    game = new ChessEngine();
    ai = new ChessAI(difficulty, currentCharacter);
    playerColor = 'w';
    document.getElementById('difficulty-screen').classList.remove('active');
    document.getElementById('game-screen').classList.add('active');
    document.getElementById('black-name').textContent = currentCharacter === 'agnes' ? 'Agnes 👑' : 'Rick 🤠';
    whiteTime = 600;
    blackTime = 600;
    startTimer();
    renderBoard();
    updateStatus();
}

function renderBoard() {
    const board = document.getElementById('board');
    board.innerHTML = '';
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const square = document.createElement('div');
            square.className = `square ${(row + col) % 2 === 0 ? 'light' : 'dark'}`;
            square.dataset.row = row;
            square.dataset.col = col;
            const piece = game.getPiece(row, col);
            if (piece) square.textContent = pieceSymbols[piece.color][piece.type];
            if (game.moveHistory.length > 0) {
                const lastMove = game.moveHistory[game.moveHistory.length - 1];
                if ((row === lastMove.from.row && col === lastMove.from.col) || (row === lastMove.to.row && col === lastMove.to.col)) {
                    square.classList.add('last-move');
                }
            }
            if (piece && piece.type === 'k' && game.isInCheck(piece.color)) square.classList.add('check');
            if (selectedSquare && selectedSquare.row === row && selectedSquare.col === col) square.classList.add('selected');
            if (validMoves.some(m => m.row === row && m.col === col)) square.classList.add('valid-move');
            square.onclick = () => handleSquareClick(row, col);
            board.appendChild(square);
        }
    }
    updateCapturedPieces();
}

function handleSquareClick(row, col) {
    if (game.turn !== playerColor) return;
    const piece = game.getPiece(row, col);
    if (selectedSquare) {
        const move = validMoves.find(m => m.row === row && m.col === col);
        if (move) {
            executeMove(selectedSquare, move);
            return;
        }
    }
    if (piece && piece.color === playerColor) {
        selectedSquare = { row, col };
        validMoves = game.getValidMoves(row, col);
        renderBoard();
    } else {
        selectedSquare = null;
        validMoves = [];
        renderBoard();
    }
}

function executeMove(from, to) {
    const piece = game.getPiece(from.row, from.col);
    if (piece.type === 'p' && (to.row === 0 || to.row === 7)) {
        promotionPending = { from, to };
        document.getElementById('promotion-modal').classList.remove('hidden');
        return;
    }
    completeMove(from, to);
}

function promotePawn(pieceType) {
    if (!promotionPending) return;
    const { from, to } = promotionPending;
    to.promotion = pieceType;
    completeMove(from, to);
    document.getElementById('promotion-modal').classList.add('hidden');
    promotionPending = null;
}

function completeMove(from, to) {
    game.makeMove({ from, to });
    selectedSquare = null;
    validMoves = [];
    renderBoard();
    updateStatus();
    const state = game.getGameState();
    if (state.status !== 'ongoing') {
        endGame(state);
        return;
    }
    if (game.turn !== playerColor) setTimeout(makeAIMove, 500);
}

function makeAIMove() {
    const move = ai.makeMove(game);
    if (move) {
        game.makeMove(move);
        renderBoard();
        updateStatus();
        const state = game.getGameState();
        if (state.status !== 'ongoing') endGame(state);
    }
}

function updateStatus() {
    const state = game.getGameState();
    const statusEl = document.getElementById('status-message');
    if (state.check) {
        statusEl.textContent = '¡Jaque!';
        statusEl.style.color = '#e74c3c';
    } else if (game.turn === playerColor) {
        statusEl.textContent = 'Tu turno';
        statusEl.style.color = '#27ae60';
    } else {
        statusEl.textContent = currentCharacter === 'agnes' ? 'Agnes está pensando...' : 'Rick está pensando...';
        statusEl.style.color = '#f39c12';
    }
}

function updateCapturedPieces() {
    document.getElementById('captured-black').innerHTML = game.capturedPieces.b.map(p => pieceSymbols[p.color][p.type]).join('');
    document.getElementById('captured-white').innerHTML = game.capturedPieces.w.map(p => pieceSymbols[p.color][p.type]).join('');
}

function startTimer() {
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        if (game.turn === 'w') {
            whiteTime--;
            document.getElementById('white-timer').textContent = formatTime(whiteTime);
        } else {
            blackTime--;
            document.getElementById('black-timer').textContent = formatTime(blackTime);
        }
        if (whiteTime <= 0 || blackTime <= 0) endGame({ status: 'timeout', winner: whiteTime <= 0 ? 'b' : 'w' });
    }, 1000);
}

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function endGame(state) {
    clearInterval(timerInterval);
    const endScreen = document.getElementById('end-screen');
    const title = document.getElementById('end-title');
    const message = document.getElementById('end-message');
    endScreen.classList.add('active');
    if (state.status === 'checkmate') {
        if (state.winner === playerColor) {
            title.textContent = '¡Victoria!';
            title.style.color = '#27ae60';
            message.textContent = currentDifficulty === 'mega' && currentCharacter === 'agnes' ? '¡Increíble! Has derrotado a Agnes en Mega Extremo.' : '¡Has ganado la partida!';
        } else {
            title.textContent = 'Derrota';
            title.style.color = '#e74c3c';
            message.textContent = currentCharacter === 'agnes' ? 'Agnes te ha derrotado con su estrategia.' : 'Rick ha ganado esta vez.';
        }
    } else if (state.status === 'draw') {
        title.textContent = 'Tablas';
        title.style.color = '#f39c12';
        message.textContent = 'La partida ha terminado en empate.';
    } else if (state.status === 'timeout') {
        title.textContent = state.winner === playerColor ? '¡Victoria!' : 'Derrota';
        message.textContent = 'Se acabó el tiempo.';
    }
}

function resign() {
    if (confirm('¿Seguro que quieres rendirte?')) endGame({ status: 'resign', winner: game.turn === 'w' ? 'b' : 'w' });
}

function offerDraw() {
    const acceptChance = currentDifficulty === 'easy' ? 0.3 : currentDifficulty === 'medium' ? 0.2 : 0.1;
    if (Math.random() < acceptChance) endGame({ status: 'draw', winner: null });
    else alert(currentCharacter === 'agnes' ? 'Agnes rechaza el tablas. ¡Quiere ganar!' : 'Rick quiere seguir jugando.');
}

function restartGame() {
    if (confirm('¿Empezar nueva partida?')) startGame(currentDifficulty);
}

function returnToMenu() {
    document.getElementById('end-screen').classList.remove('active');
    document.getElementById('game-screen').classList.remove('active');
    document.getElementById('start-screen').classList.add('active');
    clearInterval(timerInterval);
}

function rematch() {
    document.getElementById('end-screen').classList.remove('active');
    startGame(currentDifficulty);
}

function goBack() {
    document.getElementById('difficulty-screen').classList.remove('active');
    document.getElementById('start-screen').classList.add('active');
}
