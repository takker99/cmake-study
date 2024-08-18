import { stringToUTF8Array } from "./stringToUTF8Array.ts";

declare const HEAPU8: Int8Array;

export const stringToUTF8 = (
  str: string,
  outPtr: number,
  maxBytesToWrite: number,
): number => stringToUTF8Array(str, HEAPU8, outPtr, maxBytesToWrite);
