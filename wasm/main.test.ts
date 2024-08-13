import { assert, isSyncFunction } from "@core/unknownutil";
import { assertEquals } from "@std/assert";

const { instance } = await WebAssembly.instantiateStreaming(
  fetch(new URL("../build/release/wasm/wasm.wasm", import.meta.url)),
);

assert(instance.exports.add, isSyncFunction);
assert(instance.exports.sub, isSyncFunction);

Deno.test("add()", () => {
  assert(instance.exports.add, isSyncFunction);
  assertEquals(instance.exports.add(1, 2), 3);
});
Deno.test("sub()", () => {
  assert(instance.exports.sub, isSyncFunction);
  assertEquals(instance.exports.sub(2, 1), 1);
});
