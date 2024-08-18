import { abort } from "./abort.ts";
import { checkInt16, checkInt32, checkInt64, checkInt8 } from "./checkInt.ts";

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
declare const HEAPU32: Uint32Array;

export function SAFE_HEAP_STORE(
  dest: number,
  value: number,
  bytes: 1 | 2 | 4,
  unsigned: boolean,
  isFloat?: boolean,
): number;
export function SAFE_HEAP_STORE(
  dest: number,
  value: number,
  bytes: 8,
  unsigned: boolean,
  isFloat?: false,
): bigint;
export function SAFE_HEAP_STORE(
  dest: number,
  value: number,
  bytes: 8,
  unsigned: boolean,
  isFloat: true,
): number;
export function SAFE_HEAP_STORE(
  dest: number,
  value: number,
  bytes: 1 | 2 | 4 | 8,
  unsigned: boolean,
  isFloat?: boolean,
): number | bigint {
  check(dest, bytes);
  if (bytes === 8) {
    if (isFloat) {
      setValue_safe(dest, value, getSafeHeapType(bytes, isFloat));
      return value;
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
    abort(`segmentation fault storing ${bytes} bytes to address ${dest}`);
  }
  if (dest % bytes !== 0) {
    abort(
      `alignment error storing to address ${dest}, which was expected to be aligned to a multiple of ${bytes}`,
    );
  }
  if (runtimeInitialized) {
    const brk = _sbrk(0);
    if (dest + bytes > brk) {
      abort(
        `segmentation fault, exceeded the top of the available dynamic heap when storing ${bytes} bytes to address ${dest}. DYNAMICTOP=${brk}`,
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

function setValue_safe(
  ptr: number,
  value: number,
  type: "i1" | "i8" | "i16" | "i32" | "float" | "double" | "*",
): void;
function setValue_safe(ptr: number, value: bigint, type: "i64"): void;
function setValue_safe(
  ptr: number,
  value: number | bigint,
  type: WebAssemblyNumberType,
): void {
  if (type === "i64") {
    HEAP64[ptr >> 3] = value as bigint;
    checkInt64(value as bigint);
    return;
  }
  switch (type) {
    case "i1":
    case "i8":
      HEAP8[ptr] = value;
      checkInt8(value);
      break;
    case "i16":
      HEAP16[ptr >> 1] = value;
      checkInt16(value);
      break;
    case "i32":
      HEAP32[ptr >> 2] = value;
      checkInt32(value);
      break;
    case "float":
      HEAPF32[ptr >> 2] = value;
      break;
    case "i64":
      HEAP64[ptr >> 3] = value;
      checkInt64(value);
      break;
    case "double":
      HEAPF64[ptr >> 3] = value;
      break;

    case "*":
      HEAPU32[ptr >> 2] = value;
      break;
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
