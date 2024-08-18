declare const HEAPU8: Int8Array;
declare const _emscripten_notify_memory_growth: (index: number) => void;

export const fd_seek = (
  _fd: number,
  offset: number | bigint,
  _whence: number,
  _newOffset: number,
): number => {
  offset = bigintToI53Checked(offset);
  if (!HEAPU8.byteLength) _emscripten_notify_memory_growth(0);
  return 70;
};

const INT53_MAX = 9007199254740992n;

const INT53_MIN = -9007199254740992n;

const bigintToI53Checked = (num: number | bigint): number =>
  (num < INT53_MIN || num > INT53_MAX) ? NaN : Number(num);
