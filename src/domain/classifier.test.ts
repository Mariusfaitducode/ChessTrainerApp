import { classify, computeLoss } from './classifier';

describe('computeLoss', () => {
  it('returns evalBefore - evalAfter for white', () => {
    expect(computeLoss(100, 80, 'w')).toBe(20);
  });
  it('flips sign for black (black wants negative eval)', () => {
    expect(computeLoss(-100, -80, 'b')).toBe(20);
  });
  it('zero when no change', () => {
    expect(computeLoss(50, 50, 'w')).toBe(0);
  });
  it('negative loss clamped to zero (position improved)', () => {
    expect(computeLoss(50, 100, 'w')).toBe(0);
  });
});

describe('classify', () => {
  it('best when loss < 50', () => {
    expect(classify(0)).toBe('best');
    expect(classify(49)).toBe('best');
  });
  it('ok when 50 ≤ loss < 100', () => {
    expect(classify(50)).toBe('ok');
    expect(classify(99)).toBe('ok');
  });
  it('inaccuracy when 100 ≤ loss < 200', () => {
    expect(classify(100)).toBe('inaccuracy');
    expect(classify(199)).toBe('inaccuracy');
  });
  it('mistake when 200 ≤ loss < 400', () => {
    expect(classify(200)).toBe('mistake');
    expect(classify(399)).toBe('mistake');
  });
  it('blunder when loss ≥ 400', () => {
    expect(classify(400)).toBe('blunder');
    expect(classify(1500)).toBe('blunder');
  });
});
