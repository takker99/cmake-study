import { abort } from "./abort.ts";
import { assert } from "./assert.ts";
import { checkInt32 } from "./checkInt.ts";

declare let ABORT: boolean;
declare const wasmExports: WebAssembly.Exports;
declare const _asyncify_start_unwind: (data: number) => void;
declare const _asyncify_stop_unwind: () => void;
declare const _asyncify_start_rewind: (data: number) => void;
declare const _asyncify_stop_rewind: () => void;
declare const callUserCallback: (func: () => void) => void;
declare const _malloc: (size: number) => number;
declare const _free: (ptr: number) => void;
declare const SAFE_HEAP_STORE: (
  dest: number,
  value: number,
  bytes: number,
  isFloat?: number | boolean,
) => void;
declare const SAFE_HEAP_LOAD: (
  dest: number,
  value: number,
  unsigned: number | boolean,
  isFloat?: number | boolean,
) => number;

const NORMAL = 0;
const UNWINDING = 1;
const REWINDING = 2;
const DISABLED = 3;

export interface EmscriptenFunction extends CallableFunction {
  isAsync?: boolean;
}
export type ExportValue =
  | EmscriptenFunction
  | WebAssembly.Global
  | WebAssembly.Memory
  | WebAssembly.Table;

const importPattern = /^(read_data|invoke_.*|__asyncjs__.*)$/;
export class Asyncify {
  public instrumentWasmImports(imports: Record<string, ExportValue>): void {
    for (const [x, original] of Object.entries(imports)) {
      if (typeof original == "function") {
        const isAsyncifyImport = original.isAsync || importPattern.test(x);
        imports[x] = (...args: unknown[]) => {
          const originalAsyncifyState = this.#state;
          try {
            return original(...args);
          } finally {
            // Only asyncify-declared imports are allowed to change the
            // state.
            // Changing the state from normal to disabled is allowed (in any
            // function) as that is what shutdown does (and we don't have an
            // explicit list of shutdown imports).
            const changedToDisabled = originalAsyncifyState === NORMAL &&
              this.#state === DISABLED;
            // invoke_* functions are allowed to change the state if we do
            // not ignore indirect calls.
            const ignoredInvoke = x.startsWith("invoke_") && true;
            if (
              this.#state !== originalAsyncifyState && !isAsyncifyImport &&
              !changedToDisabled && !ignoredInvoke
            ) {
              throw new Error(
                `import ${x} was not in ASYNCIFY_IMPORTS, but changed the state`,
              );
            }
          }
        };
      }
    }
  }
  public instrumentWasmExports(
    exports: WebAssembly.Exports,
  ): Record<string, ExportValue> {
    const ret: Record<string, ExportValue> = {};
    for (const [x, original] of Object.entries(exports)) {
      if (typeof original !== "function") {
        ret[x] = original;
        continue;
      }
      ret[x] = (...args: unknown[]) => {
        this.#exportCallStack.push(x);
        try {
          return original(...args);
        } finally {
          if (!ABORT) {
            const y = this.#exportCallStack.pop();
            assert(y === x);
            this.#maybeStopUnwind();
          }
        }
      };
    }
    return ret;
  }
  #state: 0 | 1 | 2 | 3 = NORMAL;
  #StackSize = 4096;
  #currData: number | null = null;
  get currData(): number | null {
    return this.#currData;
  }
  #handleSleepReturnValue = 0;
  #exportCallStack: string[] = [];
  #callStackNameToId = new Map<string, number>();
  #callStackIdToName: string[] = [];
  #callStackId = 0;
  #asyncPromiseHandlers: {
    resolve: (value: number) => void;
    reject: (reason?: unknown) => void;
  } | null = null;
  #sleepCallbacks = [];
  getCallStackId(funcName: string) {
    let id = this.#callStackNameToId.get(funcName);
    if (id === undefined) {
      id = this.#callStackId++;
      this.#callStackNameToId.set(funcName, id);
      this.#callStackIdToName[id] = funcName;
    }
    return id;
  }
  #maybeStopUnwind() {
    if (
      this.#currData && this.#state === UNWINDING &&
      this.#exportCallStack.length === 0
    ) {
      // We just finished unwinding.
      // Be sure to set the state before calling any other functions to avoid
      // possible infinite recursion here (For example in debug pthread builds
      // the dbg() function itself can call back into WebAssembly to get the
      // current pthread_self() pointer).
      this.#state = NORMAL;
      // Keep the runtime alive so that a re-wind can be done later.
      runAndAbortIfError(_asyncify_stop_unwind);
    }
  }
  public whenDone(): Promise<number> {
    assert(
      this.#currData !== null,
      "Tried to wait for an async operation when none is in progress.",
    );
    assert(
      !this.#asyncPromiseHandlers,
      "Cannot have multiple async operations in flight at once",
    );
    const { promise, ...handlers } = Promise.withResolvers<number>();
    this.#asyncPromiseHandlers = handlers;
    return promise;
  }
  #allocateData() {
    // An asyncify data structure has three fields:
    //  0  current stack pos
    //  4  max stack pos
    //  8  id of function at bottom of the call stack (callStackIdToName[id] == name of js function)
    // The Asyncify ABI only interprets the first two fields, the rest is for the runtime.
    // We also embed a stack in the same memory region here, right next to the structure.
    // This struct is also defined as asyncify_data_t in emscripten/fiber.h
    const ptr = _malloc(12 + this.#StackSize);
    this.#setDataHeader(ptr, ptr + 12, this.#StackSize);
    this.#setDataRewindFunc(ptr);
    return ptr;
  }
  #setDataHeader(ptr: number, stack: number, stackSize: number) {
    SAFE_HEAP_STORE((ptr >> 2) * 4, stack, 4);
    SAFE_HEAP_STORE(((ptr + (4)) >> 2) * 4, stack + stackSize, 4);
  }
  #setDataRewindFunc(ptr: number) {
    const bottomOfCallStack = this.#exportCallStack[0];
    const rewindId = this.getCallStackId(bottomOfCallStack);
    SAFE_HEAP_STORE(((ptr + (8)) >> 2) * 4, rewindId, 4);
    checkInt32(rewindId);
  }
  #getDataRewindFuncName(ptr: number) {
    const id = SAFE_HEAP_LOAD(((ptr + (8)) >> 2) * 4, 4, 0);
    const name = this.#callStackIdToName.at(id);
    if (!name) {
      throw new Error(`Could not find rewind function for id ${id}`);
    }
    return name;
  }
  #getDataRewindFunc(name: string): EmscriptenFunction {
    const func = wasmExports[name];
    if (typeof func !== "function") {
      throw new Error(`Could not find rewind function for ${name}`);
    }
    return func;
  }
  #doRewind(ptr: number) {
    const name = this.#getDataRewindFuncName(ptr);
    const func = this.#getDataRewindFunc(name);
    // Once we have rewound and the stack we no longer need to artificially
    // keep the runtime alive.
    return func();
  }
  public handleSleep(
    startAsync: (wakeUp: (returnValue: number) => void) => void,
  ) {
    assert(
      this.#state !== DISABLED,
      "Asyncify cannot be done during or after the runtime exits",
    );
    if (ABORT) return;
    if (this.#state === NORMAL) {
      // Prepare to sleep. Call startAsync, and see what happens:
      // if the code decided to call our callback synchronously,
      // then no async operation was in fact begun, and we don't
      // need to do anything.
      let reachedCallback = false;
      let reachedAfterCallback = false;
      startAsync((handleSleepReturnValue = 0) => {
        assert(
          !handleSleepReturnValue ||
            typeof handleSleepReturnValue == "number" ||
            typeof handleSleepReturnValue == "boolean",
        );
        // old emterpretify API supported other stuff
        if (ABORT) return;
        this.#handleSleepReturnValue = handleSleepReturnValue;
        reachedCallback = true;
        if (!reachedAfterCallback) {
          // We are happening synchronously, so no need for async.
          return;
        }
        // This async operation did not happen synchronously, so we did
        // unwind. In that case there can be no compiled code on the stack,
        // as it might break later operations (we can rewind ok now, but if
        // we unwind again, we would unwind through the extra compiled code
        // too).
        assert(
          !this.#exportCallStack.length,
          "Waking up (starting to rewind) must be done from JS, without compiled code on the stack.",
        );
        this.#state = REWINDING;
        runAndAbortIfError(() => _asyncify_start_rewind(this.#currData));
        let asyncWasmReturnValue, isError = false;
        try {
          asyncWasmReturnValue = this.#doRewind(this.#currData);
        } catch (err) {
          asyncWasmReturnValue = err;
          isError = true;
        }
        // Track whether the return value was handled by any promise handlers.
        let handled = false;
        if (!this.#currData) {
          // All asynchronous execution has finished.
          // `asyncWasmReturnValue` now contains the final
          // return value of the exported async WASM function.
          // Note: `asyncWasmReturnValue` is distinct from
          // `Asyncify.handleSleepReturnValue`.
          // `Asyncify.handleSleepReturnValue` contains the return
          // value of the last C function to have executed
          // `Asyncify.handleSleep()`, where as `asyncWasmReturnValue`
          // contains the return value of the exported WASM function
          // that may have called C functions that
          // call `Asyncify.handleSleep()`.
          const asyncPromiseHandlers = this.#asyncPromiseHandlers;
          if (asyncPromiseHandlers) {
            this.#asyncPromiseHandlers = null;
            (isError
              ? asyncPromiseHandlers.reject
              : asyncPromiseHandlers.resolve)(asyncWasmReturnValue);
            handled = true;
          }
        }
        if (isError && !handled) {
          // If there was an error and it was not handled by now, we have no choice but to
          // rethrow that error into the global scope where it can be caught only by
          // `onerror` or `onunhandledpromiserejection`.
          throw asyncWasmReturnValue;
        }
      });
      reachedAfterCallback = true;
      if (!reachedCallback) {
        // A true async operation was begun; start a sleep.
        this.#state = UNWINDING;
        // TODO: reuse, don't alloc/free every sleep
        this.#currData = this.#allocateData();
        runAndAbortIfError(() => _asyncify_start_unwind(this.#currData!));
      }
    } else if (this.#state === REWINDING) {
      // Stop a resume.
      this.#state = NORMAL;
      runAndAbortIfError(_asyncify_stop_rewind);
      _free(this.#currData);
      this.#currData = null;
      // Call all sleep callbacks now that the sleep-resume is all done.
      this.#sleepCallbacks.forEach(callUserCallback);
    } else {
      abort(`invalid state: ${this.#state}`);
    }
    return this.#handleSleepReturnValue;
  }
  public handleAsync(startAsync: () => Promise<number>) {
    return this.handleSleep((wakeUp) => {
      // TODO: add error handling as a second param when handleSleep implements it.
      startAsync().then(wakeUp);
    });
  }
}

const runAndAbortIfError = (func: () => void) => {
  try {
    return func();
  } catch (e) {
    abort(e);
  }
};
