import { assert, isSyncFunction } from "@core/unknownutil";
import createModule from "../build/release/wasm-wget/wasm-wget.mjs";

const { ccall } = await createModule();
assert(ccall, isSyncFunction);
const text = await ccall("printFetch", "string", ["string"], [
  "https://example.com",
], {
  async: true,
});

console.log(text);
