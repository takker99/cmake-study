// deno-lint-ignore prefer-const
export let onAbort: (what: unknown) => void = () => {};
export let ABORT = false;
export let EXITSTATUS = 0;
// deno-lint-ignore prefer-const
export let readyPromiseReject: (reason: WebAssembly.RuntimeError) => void =
  () => {};

export const abort = (what: unknown): never => {
  onAbort(what);
  let whatStr = `Aborted(${what})`;
  // TODO(sbc): Should we remove printing and leave it up to whoever
  // catches the exception?
  console.error(whatStr);
  ABORT = true;
  EXITSTATUS = 1;
  if (whatStr.includes("RuntimeError: unreachable")) {
    whatStr +=
      '. "unreachable" may be due to ASYNCIFY_STACK_SIZE not being large enough (try increasing it)';
  }
  // Use a wasm runtime error, because a JS error might be seen as a foreign
  // exception, which means we'd run destructors on it. We need the error to
  // simply make the program stop.
  // FIXME This approach does not work in Wasm EH because it currently does not assume
  // all RuntimeErrors are from traps; it decides whether a RuntimeError is from
  // a trap or not based on a hidden field within the object. So at the moment
  // we don't have a way of throwing a wasm trap from JS. TODO Make a JS API that
  // allows this in the wasm spec.
  // Suppress closure compiler warning here. Closure compiler's builtin extern
  // definition for WebAssembly.RuntimeError claims it takes no arguments even
  // though it can.
  // TODO(https://github.com/google/closure-compiler/pull/3913): Remove if/when upstream closure gets fixed.
  const e = new WebAssembly.RuntimeError(whatStr);
  readyPromiseReject(e);
  // Throw the error whether or not MODULARIZE is set because abort is used
  // in code paths apart from instantiation where an exception is expected
  // to be thrown when abort is called.
  throw e;
};
