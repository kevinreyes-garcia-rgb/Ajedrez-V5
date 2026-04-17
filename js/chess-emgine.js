class ChessEngine {
    constructor() {
        this.board = this.createBoard();
        this.turn = 'w';
        this.moveHistory = [];
        this.capturedPieces = { w: [], b: [] };
        this.kingPositions = { w: { row: 7, col: 4 }, b: { row: 0, col: 4 } };
        this.castlingRights = { w: { kingside: true, queenside: true }, b: { kingside: true, queenside: true } };
        this.enPassantTarget = null;
        this.halfmoveClock = 0;
        this.fullmoveNumber = 1;
    }

    createBoard() {
        const board = [];
        const backRank = ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'];
        for (let row = 0; row < 8; row++) {
            board[row] = [];
            for (let col = 0; col < 8; col++) {
                if (row === 0) board[row][col] = { type: backRank[col], color: 'b' };
                else if (row === 1) board[row][col] = { type: 'p', color: 'b' };
                else if (row === 6) board[row][col] = { type: 'p', color: 'w' };
                else if (row === 7) board[row][col] = { type: backRank[col], color: 'w' };
                else board[row][col] = null;
            }
        }
        return board;
    }

    getPiece(row, col) {
        if (row < 0 || row > 7 || col < 0 || col > 7) return null;
        return this.board[row][col];
    }

    isEmpty(row, col) {
        return this.getPiece(row, col) === null;
    }

    isEnemy(row, col, color) {
        const piece = this.getPiece(row, col);
        return piece && piece.color !== color;
    }

    getValidMoves(row, col) {
        const piece = this.getPiece(row, col);
        if (!piece || piece.color !== this.turn) return [];
        const moves = [];
        const color = piece.color;
        
        switch(piece.type) {
            case 'p':
                const direction = color === 'w' ? -1 : 1;
                const startRow = color === 'w' ? 6 : 1;
                if (this.isEmpty(row + direction, col)) {
                    moves.push({ row: row + direction, col: col });
                    if (row === startRow && this.isEmpty(row + 2 * direction, col)) {
                        moves.push({ row: row + 2 * direction, col: col, isDouble: true });
                    }
                }
                for (let dc of [-1, 1]) {
                    if (this.isEnemy(row + direction, col + dc, color)) {
                        moves.push({ row: row + direction, col: col + dc, isCapture: true });
                    }
                    if (this.enPassantTarget && 
                        this.enPassantTarget.row === row + direction && 
                        this.enPassantTarget.col === col + dc) {
                        moves.push({ row: row + direction, col: col + dc, isEnPassant: true });
                    }
                }
                break;
            case 'r':
                this.addLineMoves(moves, row, col, [[0,1],[0,-1],[1,0],[-1,0]], color);
                break;
            case 'n':
                const knightMoves = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
                for (let [dr, dc] of knightMoves) {
                    const nr = row + dr, nc = col + dc;
                    if (this.isEmpty(nr, nc) || this.isEnemy(nr, nc, color)) {
                        moves.push({ row: nr, col: nc });
                    }
                }
                break;
            case 'b':
                this.addLineMoves(moves, row, col, [[1,1],[1,-1],[-1,1],[-1,-1]], color);
                break;
            case 'q':
                this.addLineMoves(moves, row, col, [[0,1],[0,-1],[1,0],[-1,0],[1,1],[1,-1],[-1,1],[-1,-1]], color);
                break;
            case 'k':
                const kingMoves = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
                for (let [dr, dc] of kingMoves) {
                    const nr = row + dr, nc = col + dc;
                    if (this.isEmpty(nr, nc) || this.isEnemy(nr, nc, color)) {
                        moves.push({ row: nr, col: nc });
                    }
                }
                if (this.castlingRights[color].kingside && this.canCastle(color, 'kingside')) {
                    moves.push({ row: row, col: col + 2, isCastling: 'kingside' });
                }
                if (this.castlingRights[color].queenside && this.canCastle(color, 'queenside')) {
                    moves.push({ row: row, col: col - 2, isCastling: 'queenside' });
                }
                break;
        }
        return moves.filter(move => {
            const testBoard = this.clone();
            testBoard.makeMove({ from: { row, col }, to: move });
            return !testBoard.isInCheck(color);
        });
    }

    addLineMoves(moves, row, col, directions, color) {
        for (let [dr, dc] of directions) {
            let nr = row + dr, nc = col + dc;
            while (this.isEmpty(nr, nc)) {
                moves.push({ row: nr, col: nc });
                nr += dr; nc += dc;
            }
            if (this.isEnemy(nr, nc, color)) {
                moves.push({ row: nr, col: nc, isCapture: true });
            }
        }
    }

    canCastle(color, side) {
        const row = color === 'w' ? 7 : 0;
        const kingCol = 4;
        const rookCol = side === 'kingside' ? 7 : 0;
        const start = Math.min(kingCol, rookCol) + 1;
        const end = Math.max(kingCol, rookCol);
        for (let c = start; c < end; c++) {
            if (!this.isEmpty(row, c)) return false;
        }
        if (this.isInCheck(color)) return false;
        const kingPath = side === 'kingside' ? [5, 6] : [3, 2];
        for (let c of kingPath) {
            const testBoard = this.clone();
            testBoard.board[row][c] = testBoard.board[row][kingCol];
            testBoard.board[row][kingCol] = null;
            if (testBoard.isInCheck(color)) return false;
        }
        return true;
    }

    makeMove(move) {
        const { from, to } = move;
        const piece = this.board[from.row][from.col];
        const captured = this.board[to.row][to.col];
        
        this.moveHistory.push({
            from: { ...from },
            to: { ...to },
            piece: { ...piece },
            captured: captured ? { ...captured } : null,
            castlingRights: JSON.parse(JSON.stringify(this.castlingRights)),
            enPassantTarget: this.enPassantTarget ? { ...this.enPassantTarget } : null,
            halfmoveClock: this.halfmoveClock
        });

        if (captured) this.capturedPieces[piece.color].push(captured);
        this.board[to.row][to.col] = piece;
        this.board[from.row][from.col] = null;
        if (piece.type === 'k') this.kingPositions[piece.color] = { row: to.row, col: to.col };
        
        if (to.isEnPassant) {
            const epRow = piece.color === 'w' ? to.row + 1 : to.row - 1;
            this.capturedPieces[piece.color].push(this.board[epRow][to.col]);
            this.board[epRow][to.col] = null;
        }
        if (to.promotion) this.board[to.row][to.col] = { type: to.promotion, color: piece.color };
        if (to.isCastling) {
            const row = from.row;
            if (to.isCastling === 'kingside') {
                this.board[row][5] = this.board[row][7];
                this.board[row][7] = null;
            } else {
                this.board[row][3] = this.board[row][0];
                this.board[row][0] = null;
            }
        }
        if (piece.type === 'k') {
            this.castlingRights[piece.color].kingside = false;
            this.castlingRights[piece.color].queenside = false;
        }
        if (piece.type === 'r') {
            if (from.col === 0) this.castlingRights[piece.color].queenside = false;
            if (from.col === 7) this.castlingRights[piece.color].kingside = false;
        }
        if (to.isDouble) this.enPassantTarget = { row: (from.row + to.row) / 2, col: from.col };
        else this.enPassantTarget = null;
        
        if (piece.type === 'p' || captured) this.halfmoveClock = 0;
        else this.halfmoveClock++;
        
        if (this.turn === 'b') this.fullmoveNumber++;
        this.turn = this.turn === 'w' ? 'b' : 'w';
        return captured || to.isEnPassant;
    }

    isInCheck(color) {
        const kingPos = this.kingPositions[color];
        const enemyColor = color === 'w' ? 'b' : 'w';
        const pawnDir = color === 'w' ? -1 : 1;
        for (let dc of [-1, 1]) {
            const piece = this.getPiece(kingPos.row + pawnDir, kingPos.col + dc);
            if (piece && piece.type === 'p' && piece.color === enemyColor) return true;
        }
        const knightMoves = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
        for (let [dr, dc] of knightMoves) {
            const piece = this.getPiece(kingPos.row + dr, kingPos.col + dc);
            if (piece && piece.type === 'n' && piece.color === enemyColor) return true;
        }
        const directions = [[[0,1],[0,-1],[1,0],[-1,0]], [[1,1],[1,-1],[-1,1],[-1,-1]]];
        for (let i = 0; i < 2; i++) {
            for (let [dr, dc] of directions[i]) {
                let r = kingPos.row + dr, c = kingPos.col + dc;
                while (this.isEmpty(r, c)) { r += dr; c += dc; }
                const piece = this.getPiece(r, c);
                if (piece && piece.color === enemyColor) {
                    if (i === 0 && (piece.type === 'r' || piece.type === 'q')) return true;
                    if (i === 1 && (piece.type === 'b' || piece.type === 'q')) return true;
                }
            }
        }
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                if (dr === 0 && dc === 0) continue;
                const piece = this.getPiece(kingPos.row + dr, kingPos.col + dc);
                if (piece && piece.type === 'k' && piece.color === enemyColor) return true;
            }
        }
        return false;
    }

    isCheckmate(color) {
        if (!this.isInCheck(color)) return false;
        return !this.hasAnyValidMove(color);
    }

    isStalemate(color) {
        if (this.isInCheck(color)) return false;
        return !this.hasAnyValidMove(color);
    }

    hasAnyValidMove(color) {
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.board[row][col];
                if (piece && piece.color === color) {
                    if (this.getValidMoves(row, col).length > 0) return true;
                }
            }
        }
        return false;
    }

    isDraw() {
        if (this.halfmoveClock >= 100) return true;
        const pieces = { w: [], b: [] };
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.board[row][col];
                if (piece) pieces[piece.color].push(piece.type);
            }
        }
        if (pieces.w.length === 1 && pieces.b.length === 1) return true;
        for (let color of ['w', 'b']) {
            const enemy = color === 'w' ? 'b' : 'w';
            if (pieces[color].length === 1 && pieces[enemy].length === 2) {
                if (pieces[enemy].includes('n') || pieces[enemy].includes('b')) return true;
            }
        }
        return false;
    }

    getGameState() {
        const color = this.turn;
        if (this.isCheckmate(color)) return { status: 'checkmate', winner: color === 'w' ? 'b' : 'w' };
        if (this.isStalemate(color) || this.isDraw()) return { status: 'draw', winner: null };
        return { status: 'ongoing', winner: null, check: this.isInCheck(color) };
    }

    clone() {
        const newGame = new ChessEngine();
        newGame.board = this.board.map(row => row.map(cell => cell ? {...cell} : null));
        newGame.turn = this.turn;
        newGame.kingPositions = { ...this.kingPositions };
        newGame.castlingRights = JSON.parse(JSON.stringify(this.castlingRights));
        newGame.enPassantTarget = this.enPassantTarget ? { ...this.enPassantTarget } : null;
        newGame.halfmoveClock = this.halfmoveClock;
        newGame.fullmoveNumber = this.fullmoveNumber;
        return newGame;
    }

    getAllValidMoves(color) {
        const moves = [];
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.board[row][col];
                if (piece && piece.color === color) {
                    const pieceMoves = this.getValidMoves(row, col);
                    for (let move of pieceMoves) {
                        moves.push({ from: { row, col }, to: move, piece: piece.type, capture: this.getPiece(move.row, move.col)?.type });
                    }
                }
            }
        }
        return moves;
    }

    evaluate() {
        const pieceValues = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };
        let score = 0;
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.board[row][col];
                if (piece) {
                    let value = pieceValues[piece.type];
                    if (piece.type === 'p') value += piece.color === 'w' ? (6 - row) * 10 : (row - 1) * 10;
                    score += piece.color === 'w' ? value : -value;
                }
            }
        }
        return this.turn === 'w' ? score : -score;
    }
}
