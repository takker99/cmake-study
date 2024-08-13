import "@kitsonk/xhr";
import { assert, isSyncFunction } from "@core/unknownutil";
import createModule from "../build/release/wasm-callback/wasm-async.mjs";

const { ccall } = await createModule();
assert(ccall, isSyncFunction);
ccall("printFetch", "number", ["string"], ["https://example.com"]);
