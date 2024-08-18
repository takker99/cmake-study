import { assert } from "./assert.ts";
import { Asyncify } from "./Asyncify.ts";

declare const __emscripten_stack_alloc: (size: number) => number;
declare const _emscripten_stack_get_current: () => number;
declare const HEAP8: Int8Array;
declare const Module: Record<string, unknown>;
declare const asyncify: Asyncify;

// For fast lookup of conversion functions
const convertString = (str: string) => {
  // null string
  // at most 4 bytes per UTF-8 code point, +1 for the trailing '\0'
  return stringToUTF8OnStack(str);
};
const convertArray = (arr: number[]) => {
  const ret = stackAlloc(arr.length);
  writeArrayToMemory(arr, ret);
  return ret;
};

const writeArrayToMemory = (array: ArrayLike<number>, buffer: number) => {
  assert(
    array.length >= 0,
    "writeArrayToMemory array must have a length (should be an array or typed array)",
  );
  HEAP8.set(array, buffer);
};

export interface ReturnTypeMap {
  string: string;
  number: number;
  boolean: boolean;
}
const convertReturnValue = <
  ReturnType extends "string" | "number" | "boolean",
>(returnType: ReturnType, ret: number): ReturnTypeMap[ReturnType] => {
  if (returnType === "string") {
    return UTF8ToString(ret) as ReturnTypeMap[ReturnType];
  }
  if (returnType === "boolean") {
    return Boolean(ret) as ReturnTypeMap[ReturnType];
  }
  return ret as ReturnTypeMap[ReturnType];
};

export const ccall = <
  ReturnType extends "string" | "number" | "boolean",
  Args extends (string | number | boolean | number[])[],
>(
  ident: string,
  returnType: ReturnType,
  args: Args,
  opts?: { async?: boolean },
): ReturnTypeMap[ReturnType] | Promise<ReturnTypeMap[ReturnType]> => {
  const func = getCFunc(ident);
  const cArgs: (number | boolean)[] = [];
  let stack = 0;
  if (args) {
    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      if (typeof arg === "string") {
        if (stack === 0) stack = stackSave();
        cArgs[i] = convertString(arg);
        continue;
      }
      if (Array.isArray(arg)) {
        if (stack === 0) stack = stackSave();
        cArgs[i] = convertArray(arg);
        continue;
      }
      cArgs[i] = arg;
    }
  }
  // Data for a previous async operation that was in flight before us.
  const previousAsync = asyncify.currData;
  const ret: unknown = func(...cArgs);
  if (typeof ret !== "number") throw new Error("ccall failed");
  const onDone = (ret: number) => {
    runtimeKeepalivePop();
    if (stack !== 0) stackRestore(stack);
    return convertReturnValue(returnType, ret);
  };
  const asyncMode = opts?.async ?? false;
  // Keep the runtime alive through all calls. Note that this call might not be
  // async, but for simplicity we push and pop in all calls.
  runtimeKeepalivePush();
  if (asyncify.currData != previousAsync) {
    // A change in async operation happened. If there was already an async
    // operation in flight before us, that is an error: we should not start
    // another async operation while one is active, and we should not stop one
    // either. The only valid combination is to have no change in the async
    // data (so we either had one in flight and left it alone, or we didn't have
    // one), or to have nothing in flight and to start one.
    assert(
      !(previousAsync && asyncify.currData),
      "We cannot start an async operation when one is already flight",
    );
    assert(
      !(previousAsync && !asyncify.currData),
      "We cannot stop an async operation in flight",
    );
    // This is a new async operation. The wasm is paused and has unwound its stack.
    // We need to return a Promise that resolves the return value
    // once the stack is rewound and execution finishes.
    assert(
      asyncMode,
      "The call to " + ident +
        " is running asynchronously. If this was intended, add the async option to the ccall/cwrap call.",
    );
    return asyncify.whenDone().then(onDone);
  }
  const result = onDone(ret);
  // If this is an async ccall, ensure we return a promise
  return asyncMode ? Promise.resolve(result) : result;
};

const stackSave = () => _emscripten_stack_get_current();

const stringToUTF8OnStack = (str: string) => {
  const size = lengthBytesUTF8(str) + 1;
  const ret = __emscripten_stack_alloc(size);
  stringToUTF8(str, ret, size);
  return ret;
};

const getCFunc = (ident: string) => {
  const func = Module["_" + ident];
  // closure exported function
  if (typeof func !== "function") {
    assert(
      false,
      `Cannot call unknown function ${ident}, make sure it is exported`,
    );
    throw new Error("unknown function");
  }
  return func;
};

let runtimeKeepaliveCounter = 0;
const runtimeKeepalivePush = () => {
  runtimeKeepaliveCounter += 1;
};

const runtimeKeepalivePop = () => {
  assert(runtimeKeepaliveCounter > 0);
  runtimeKeepaliveCounter -= 1;
};
