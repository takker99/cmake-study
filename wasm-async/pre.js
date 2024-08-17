// @ts-check
/// <reference types="./pre.d.ts" />

/**
 * @param {number} pathptr
 * @param {number} bufferptr
 * @param {number} sizeptr
 * @param {number} errorptr
 * @return {number}
 */
// deno-lint-ignore no-unused-vars
const read_data_impl = (pathptr, bufferptr, sizeptr, errorptr) => {
  const path = UTF8ToString(pathptr);
  return Asyncify.handleAsync(async () => {
    try {
      console.debug("start fetch");
      const res = await fetch(path);
      console.debug("end fetch");
      if (res.ok) {
        const buffer = new Uint8Array(await res.arrayBuffer());

        const bufferPtr = _malloc(buffer.length);
        console.debug("allocated buffer", bufferPtr);
        HEAPU8.set(buffer, bufferPtr);
        HEAPU32[bufferptr >> 2] = bufferPtr;
        HEAP32[sizeptr >> 2] = buffer.length;
        HEAP32[errorptr >> 2] = 0;
        return 0;
      }
      HEAP32[errorptr >> 2] = res.status;
      return 0;
    } catch (_) {
      console.error(_);
      HEAP32[errorptr >> 2] = 1;
      return 0;
    }
  }) ?? 0;
};
