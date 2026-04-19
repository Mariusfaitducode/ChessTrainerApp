import type { Color, MoveQuality } from './types';

export function computeLoss(
  evalBefore: number,
  evalAfter: number,
  mover: Color,
): number {
  const perspective = mover === 'w' ? 1 : -1;
  const raw = (evalBefore - evalAfter) * perspective;
  return Math.max(0, raw);
}

export function classify(loss: number): MoveQuality {
  if (loss < 50) return 'best';
  if (loss < 100) return 'ok';
  if (loss < 200) return 'inaccuracy';
  if (loss < 400) return 'mistake';
  return 'blunder';
}
