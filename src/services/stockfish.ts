// Wraps @udaychauhan/react-native-stockfish (v0.5.1).
//
// The package exposes a UCI-style native module: stockfishLoop() starts the
// engine, sendCommandToStockfish(cmd) sends a UCI line, stopStockfish()
// stops it. Output arrives via NativeEventEmitter on 'stockfish-output'
// (errors on 'stockfish-error'). The public package entry ships only a
// React hook, so we reach into NativeModules to keep one long-lived
// process and expose a plain ChessEngine to callers.
//
// evaluate() sends `position fen <fen>` + `go depth <n>`, buffers output
// until a `bestmove ...` line arrives, and parses the last
// `info ... score cp|mate N` before it.

import { NativeEventEmitter, NativeModules } from 'react-native';
import type { EmitterSubscription } from 'react-native';
import type { ChessEngine } from './stockfish.types';

const EVAL_TIMEOUT_MS = 15_000;

interface NativeSpec {
  stockfishLoop(): void;
  sendCommandToStockfish(command: string): void;
  stopStockfish(): void;
}

interface Pending {
  buffer: string;
  resolve: (r: { cp: number; bestMove: string; mate: number | null }) => void;
  reject: (e: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

function getNative(): NativeSpec {
  const mod = (NativeModules as Record<string, unknown>).ReactNativeStockfish as
    | NativeSpec
    | undefined;
  if (!mod) throw new Error('ReactNativeStockfish native module not linked');
  return mod;
}

class StockfishEngine implements ChessEngine {
  private native: NativeSpec | null = null;
  private outSub: EmitterSubscription | null = null;
  private errSub: EmitterSubscription | null = null;
  private running = false;
  private pending: Pending | null = null;
  private queue: Promise<unknown> = Promise.resolve();

  async init(): Promise<void> {
    if (this.running) return;
    this.native = getNative();
    const emitter = new NativeEventEmitter(
      NativeModules.ReactNativeStockfish as never,
    );
    this.outSub = emitter.addListener('stockfish-output', (c: string) =>
      this.onOutput(c),
    );
    this.errSub = emitter.addListener('stockfish-error', (m: string) => {
      if (this.pending) this.fail(new Error(`stockfish: ${m}`));
    });
    this.native.stockfishLoop();
    this.native.sendCommandToStockfish('uci');
    this.native.sendCommandToStockfish('isready');
    this.running = true;
  }

  evaluate(fen: string, depth: number) {
    // Serialize: one UCI position/go pair at a time.
    const run = this.queue.then(() => this.runEvaluate(fen, depth));
    this.queue = run.catch(() => {});
    return run;
  }

  private runEvaluate(fen: string, depth: number) {
    if (!this.running || !this.native) {
      return Promise.reject(new Error('stockfish: not initialized'));
    }
    const native = this.native;
    return new Promise<{ cp: number; bestMove: string; mate: number | null }>(
      (resolve, reject) => {
        const timer = setTimeout(
          () => this.fail(new Error('stockfish: evaluate timeout')),
          EVAL_TIMEOUT_MS,
        );
        this.pending = { buffer: '', resolve, reject, timer };
        native.sendCommandToStockfish('ucinewgame');
        native.sendCommandToStockfish(`position fen ${fen}`);
        native.sendCommandToStockfish(`go depth ${depth}`);
      },
    );
  }

  private onOutput(chunk: string): void {
    if (!this.pending) return;
    this.pending.buffer += chunk;
    const idx = this.pending.buffer.indexOf('bestmove');
    if (idx === -1) return;
    const bm = /bestmove\s+(\S+)/.exec(this.pending.buffer.slice(idx));
    if (!bm) return;
    const head = this.pending.buffer.slice(0, idx);
    const scores = [...head.matchAll(/score\s+(cp|mate)\s+(-?\d+)/g)];
    const last = scores[scores.length - 1];
    let cp = 0;
    let mate: number | null = null;
    if (last) {
      if (last[1] === 'cp') cp = parseInt(last[2], 10);
      else mate = parseInt(last[2], 10);
    }
    this.resolve({ cp, bestMove: bm[1], mate });
  }

  private resolve(r: { cp: number; bestMove: string; mate: number | null }) {
    const p = this.pending;
    if (!p) return;
    clearTimeout(p.timer);
    this.pending = null;
    p.resolve(r);
  }

  private fail(err: Error) {
    const p = this.pending;
    if (!p) return;
    clearTimeout(p.timer);
    this.pending = null;
    p.reject(err);
  }

  async dispose(): Promise<void> {
    if (!this.running) return;
    try {
      this.native?.sendCommandToStockfish('quit');
      this.native?.stopStockfish();
    } catch {}
    this.outSub?.remove();
    this.errSub?.remove();
    this.outSub = null;
    this.errSub = null;
    this.running = false;
    if (this.pending) this.fail(new Error('stockfish: disposed'));
  }
}

let singleton: ChessEngine | null = null;

export function getEngine(): ChessEngine {
  if (!singleton) singleton = new StockfishEngine();
  return singleton;
}
