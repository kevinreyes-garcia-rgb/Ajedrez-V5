class ChessAI {
    constructor(difficulty, character) {
        this.difficulty = difficulty;
        this.character = character;
        this.maxDepth = this.getDepthByDifficulty();
        this.nodesSearched = 0;
    }

    getDepthByDifficulty() {
        const depths = { easy: 2, medium: 3, hard: 4, extreme: 5, mega: 6 };
        return depths[this.difficulty] || 3;
    }

    makeMove(game) {
        this.nodesSearched = 0;
        const moves = game.getAllValidMoves(game.turn);
        if (moves.length === 0) return null;
        if (this.difficulty === 'mega' && this.character === 'agnes') {
            return this.findBestMove(game, this.maxDepth, true);
        }
        const bestMove = this.findBestMove(game, this.maxDepth, false);
        if (this.difficulty === 'easy' && Math.random() < 0.4) {
            return moves[Math.floor(Math.random() * moves.length)];
        } else if (this.difficulty === 'medium' && Math.random() < 0.2) {
            return moves[Math.floor(Math.random() * moves.length)];
        } else if (this.difficulty === 'hard' && Math.random() < 0.05) {
            return moves[Math.floor(Math.random() * moves.length)];
        }
        return bestMove;
    }

    findBestMove(game, depth, perfect) {
        const moves = game.getAllValidMoves(game.turn);
        if (moves.length === 0) return null;
        let bestMove = moves[0];
        let bestValue = -Infinity;
        const isMaximizing = game.turn === 'w';
        moves.sort((a, b) => this.moveOrderScore(b) - this.moveOrderScore(a));
        for (let move of moves) {
            const testGame = game.clone();
            testGame.makeMove(move);
            const value = this.minimax(testGame, depth - 1, -Infinity, Infinity, !isMaximizing);
            if (value > bestValue) {
                bestValue = value;
                bestMove = move;
            }
        }
        return bestMove;
    }

    moveOrderScore(move) {
        let score = 0;
        if (move.capture) score += 100;
        if (move.piece === 'q') score += 50;
        if (move.piece === 'p' && (move.to.row === 0 || move.to.row === 7)) score += 80;
        return score;
    }

    minimax(game, depth, alpha, beta, isMaximizing) {
        this.nodesSearched++;
        const state = game.getGameState();
        if (state.status === 'checkmate') return isMaximizing ? -100000 : 100000;
        if (state.status === 'draw') return 0;
        if (depth === 0) return this.quiescenceSearch(game, alpha, beta, isMaximizing, 3);
        const moves = game.getAllValidMoves(game.turn);
        if (isMaximizing) {
            let maxEval = -Infinity;
            for (let move of moves) {
                const testGame = game.clone();
                testGame.makeMove(move);
                const eval_ = this.minimax(testGame, depth - 1, alpha, beta, false);
                maxEval = Math.max(maxEval, eval_);
                alpha = Math.max(alpha, eval_);
                if (beta <= alpha) break;
            }
            return maxEval;
        } else {
            let minEval = Infinity;
            for (let move of moves) {
                const testGame = game.clone();
                testGame.makeMove(move);
                const eval_ = this.minimax(testGame, depth - 1, alpha, beta, true);
                minEval = Math.min(minEval, eval_);
                beta = Math.min(beta, eval_);
                if (beta <= alpha) break;
            }
            return minEval;
        }
    }

    quiescenceSearch(game, alpha, beta, isMaximizing, depth) {
        const standPat = game.evaluate();
        if (depth === 0) return standPat;
        if (isMaximizing) {
            if (standPat >= beta) return beta;
            alpha = Math.max(alpha, standPat);
        } else {
            if (standPat <= alpha) return alpha;
            beta = Math.min(beta, standPat);
        }
        const moves = game.getAllValidMoves(game.turn).filter(m => m.capture || m.to.promotion);
        for (let move of moves) {
            const testGame = game.clone();
            testGame.makeMove(move);
            const score = this.quiescenceSearch(testGame, alpha, beta, !isMaximizing, depth - 1);
            if (isMaximizing) {
                if (score >= beta) return beta;
                alpha = Math.max(alpha, score);
            } else {
                if (score <= alpha) return alpha;
                beta = Math.min(beta, score);
            }
        }
        return isMaximizing ? alpha : beta;
    }
}
