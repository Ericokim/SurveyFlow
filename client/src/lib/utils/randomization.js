/**
 * Deterministic randomization helpers
 */

export function stableShuffle(items = [], seed = "") {
  const source = [...items];
  const random = createSeededRandom(seed);

  for (let index = source.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    const currentValue = source[index];
    source[index] = source[swapIndex];
    source[swapIndex] = currentValue;
  }

  return source;
}

export function hashString(value = "") {
  let hash = 0;
  const source = String(value);
  for (let index = 0; index < source.length; index += 1) {
    hash = (hash << 5) - hash + source.charCodeAt(index);
    hash |= 0;
  }
  return hash;
}

function createSeededRandom(seed = "") {
  let state = hashString(String(seed || "")) || 1;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}
