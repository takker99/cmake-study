import { abort } from "./abort.ts";

declare const HEAPU8: Int8Array;
declare const _emscripten_notify_memory_growth: (index: number) => void;

export const fd_close = (_fd: number) => {
  if (!HEAPU8.byteLength) _emscripten_notify_memory_growth(0);
  abort("fd_close called without SYSCALLS_REQUIRE_FILESYSTEM");
};
