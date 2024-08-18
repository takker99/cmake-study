import { abort } from "./abort.ts";

/** In `STRICT` mode, we only define `assert()` when `ASSERTIONS` is set.
 * i.e. we don't define it at all in release modes.  This matches the behaviour of `MINIMAL_RUNTIME`.
 *
 * TODO(sbc): Make this the default even without `STRICT` enabled.
 */
export const assert = (condition: boolean, text?: string): true | never =>
  condition ||
  abort(`Assertion failed${text ? `: ${text}` : ""}`);