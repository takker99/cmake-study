import { abort } from "./abort.ts";

declare let runtimeInitialized: boolean;
declare const _sbrk: (increment: number) => number;
declare const _emscripten_stack_get_base: () => number;
declare const wasmMemory: WebAssembly.Memory;
declare const HEAP8: Int8Array;
declare const HEAP16: Int16Array;
declare const HEAP32: Int32Array;
declare const HEAP64: BigInt64Array;
declare const HEAPF32: Float32Array;
declare const HEAPF64: Float64Array;

export function SAFE_HEAP_LOAD(
  dest: number,
  bytes: 1 | 2 | 4,
  unsigned: boolean,
  isFloat?: boolean,
): number;
export function SAFE_HEAP_LOAD(
  dest: number,
  bytes: 8,
  unsigned: boolean,
  isFloat?: false,
): bigint;
export function SAFE_HEAP_LOAD(
  dest: number,
  bytes: 8,
  unsigned: boolean,
  isFloat: true,
): number;
export function SAFE_HEAP_LOAD(
  dest: number,
  bytes: 1 | 2 | 4 | 8,
  unsigned: boolean,
  isFloat?: boolean,
): number | bigint {
  check(dest, bytes);
  if (bytes === 8) {
    if (isFloat) {
      let ret = getValue_safe(dest, bytes, isFloat);
      if (unsigned) ret = unSign(ret, bytes);
      return ret;
    }
    let ret = getValue_safe(dest, bytes, isFloat);
    if (unsigned) ret = unSign(ret, bytes);
    return ret;
  }
  let ret = getValue_safe(dest, bytes, isFloat);
  if (unsigned) ret = unSign(ret, bytes);
  return ret;
}

const check = (dest: number, bytes: 1 | 2 | 4 | 8) => {
  if (dest <= 0) {
    abort(`segmentation fault loading ${bytes} bytes from address ${dest}`);
  }
  if (dest % bytes !== 0) {
    abort(
      `alignment error loading from address ${dest}, which was expected to be aligned to a multiple of ${bytes}`,
    );
  }
  if (runtimeInitialized) {
    const brk = _sbrk(0);
    if (dest + bytes > brk) {
      abort(
        `segmentation fault, exceeded the top of the available dynamic heap when loading ${bytes} bytes from address ${dest}. DYNAMICTOP=${brk}`,
      );
    }
    if (brk < _emscripten_stack_get_base()) {
      abort(
        `brk >= _emscripten_stack_get_base() (brk=${brk}, _emscripten_stack_get_base()=${_emscripten_stack_get_base()})`,
      );
    }
    // sbrk-managed memory must be above the stack
    if (brk > wasmMemory.buffer.byteLength) {
      abort(
        `brk <= wasmMemory.buffer.byteLength (brk=${brk}, wasmMemory.buffer.byteLength=${wasmMemory.buffer.byteLength})`,
      );
    }
  }
};

export const SAFE_HEAP_LOAD_D = (
  dest: number,
  bytes: 1 | 2 | 4 | 8,
  unsigned: boolean,
): number => {
  if (bytes === 8) {
    return SAFE_HEAP_LOAD(dest, bytes, unsigned, true);
  }
  return SAFE_HEAP_LOAD(dest, bytes, unsigned, true);
};

type WebAssemblyNumberType =
  | "i1"
  | "i8"
  | "i16"
  | "i32"
  | "i64"
  | "float"
  | "double"
  | "*";

function getValue_safe(
  ptr: number,
  bytes: 1 | 2 | 4,
  isFloat?: boolean,
): number;
function getValue_safe(ptr: number, bytes: 8, isFloat?: false): bigint;
function getValue_safe(ptr: number, bytes: 8, isFloat: true): number;
function getValue_safe(
  ptr: number,
  bytes: 1 | 2 | 4 | 8,
  isFloat?: boolean,
): number | bigint {
  switch (bytes) {
    case 1:
      return HEAP8[ptr];
    case 2:
      return HEAP16[ptr >> 1];
    case 4:
      return isFloat ? HEAPF32[ptr >> 2] : HEAP32[ptr >> 2];
    case 8:
      return isFloat ? HEAPF64[ptr >> 3] : HEAP64[ptr >> 3];
  }
}

const unSign = <V extends number | bigint>(value: V, bits: number): V => {
  if (value >= 0) return value;
  // Need some trickery, since if bits == 32, we are right at the limit of the
  // bits JS uses in bitshifts
  return (typeof value === "bigint"
    ? bits <= 32
      ? 2n * BigInt(Math.abs(1 << (bits - 1))) + value
      : BigInt(Math.pow(2, bits)) + value
    : bits <= 32
    ? 2 * Math.abs(1 << (bits - 1)) + (value as number)
    : Math.pow(2, bits) + (value as number)) as V;
};
