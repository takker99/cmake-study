// @deno-types=https://cdn.jsdelivr.net/npm/binaryen@117.0.0/index.d.ts
import binaryen from "https://cdn.jsdelivr.net/npm/binaryen@117.0.0/index.min.js";

const module = binaryen.readBinary(await Deno.readFile(Deno.args[0]));
console.log(module.emitText());
