// Stockfish Web Worker Manager (UCI Protocol)

export interface EngineEvaluation {
  depth: number;
  scoreCentipawns: number;
  mateInMoves?: number;
  bestMove?: string;
  pv?: string[];
}

class StockfishWorkerService {
  private worker: Worker | null = null;
  private isReady: boolean = false;
  private currentCallback: ((bestMove: string, evalData: EngineEvaluation) => void) | null = null;
  private latestEval: EngineEvaluation = { depth: 0, scoreCentipawns: 0 };
  private initPromise: Promise<boolean> | null = null;

  public async init(): Promise<boolean> {
    if (this.isReady && this.worker) return true;
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise<boolean>((resolve) => {
      try {
        if (typeof window === 'undefined' || typeof Worker === 'undefined') {
          resolve(false);
          return;
        }

        // Try to instantiate Stockfish WASM worker from public/stockfish.js
        this.worker = new Worker('/stockfish.js');

        const timeout = setTimeout(() => {
          if (!this.isReady) {
            console.warn('Stockfish Web Worker initialization timed out, using server/hybrid fallback.');
            resolve(false);
          }
        }, 3000);

        this.worker.onmessage = (event) => {
          const line = typeof event.data === 'string' ? event.data : '';
          
          if (line === 'uciok') {
            this.worker?.postMessage('isready');
          } else if (line === 'readyok') {
            this.isReady = true;
            clearTimeout(timeout);
            resolve(true);
          } else {
            this.handleUciOutput(line);
          }
        };

        this.worker.onerror = (err) => {
          console.warn('Stockfish Worker error:', err);
          clearTimeout(timeout);
          resolve(false);
        };

        this.worker.postMessage('uci');
      } catch (err) {
        console.warn('Could not launch Stockfish worker:', err);
        resolve(false);
      }
    });

    return this.initPromise;
  }

  private handleUciOutput(line: string) {
    // Parse evaluation: info depth 10 score cp 45 pv e2e4 ...
    if (line.startsWith('info') && line.includes('score')) {
      const depthMatch = line.match(/depth\s+(\d+)/);
      const cpMatch = line.match(/score\s+cp\s+(-?\d+)/);
      const mateMatch = line.match(/score\s+mate\s+(-?\d+)/);

      const depth = depthMatch ? parseInt(depthMatch[1], 10) : this.latestEval.depth;
      let scoreCp = this.latestEval.scoreCentipawns;
      let mateIn: number | undefined;

      if (mateMatch) {
        mateIn = parseInt(mateMatch[1], 10);
        scoreCp = mateIn > 0 ? 10000 - mateIn * 100 : -10000 - mateIn * 100;
      } else if (cpMatch) {
        scoreCp = parseInt(cpMatch[1], 10);
      }

      this.latestEval = {
        depth,
        scoreCentipawns: scoreCp,
        mateInMoves: mateIn,
      };
    }

    // Parse bestmove: bestmove e2e4 ponder e7e5
    if (line.startsWith('bestmove')) {
      const parts = line.split(' ');
      const bestMove = parts[1] || '';
      if (bestMove && bestMove !== '(none)' && this.currentCallback) {
        const cb = this.currentCallback;
        this.currentCallback = null;
        cb(bestMove, { ...this.latestEval, bestMove });
      }
    }
  }

  public async evaluatePosition(fen: string, depth: number = 10): Promise<{ bestMove: string; evaluation: EngineEvaluation }> {
    const ready = await this.init();
    if (!ready || !this.worker) {
      return {
        bestMove: '',
        evaluation: { depth: 0, scoreCentipawns: 0 }
      };
    }

    return new Promise((resolve) => {
      let resolved = false;
      const onDone = (bestMove: string, evalData: EngineEvaluation) => {
        if (resolved) return;
        resolved = true;
        clearTimeout(fallbackTimer);
        this.currentCallback = null;
        resolve({ bestMove, evaluation: evalData });
      };

      this.currentCallback = onDone;

      // Reliable 1000ms safety timeout if Web Worker ever hangs
      const fallbackTimer = setTimeout(() => {
        onDone('', { depth: 0, scoreCentipawns: 0 });
      }, 1000);

      this.worker?.postMessage(`position fen ${fen}`);
      this.worker?.postMessage(`go movetime 350`);
    });
  }

  public stop() {
    if (this.worker && this.isReady) {
      this.worker.postMessage('stop');
    }
  }
}

export const stockfishService = new StockfishWorkerService();

