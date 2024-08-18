import { assert } from "./assert.ts";

const MAX_UINT8 = (2 ** 8) - 1;

const MAX_UINT16 = (2 ** 16) - 1;

const MAX_UINT32 = (2 ** 32) - 1;

const MAX_UINT53 = (2 ** 53) - 1;

const MAX_UINT64 = (2 ** 64) - 1;

const MIN_INT8 = -(2 ** (8 - 1)) + 1;

const MIN_INT16 = -(2 ** (16 - 1)) + 1;

const MIN_INT32 = -(2 ** (32 - 1)) + 1;

const MIN_INT53 = -(2 ** (53 - 1)) + 1;

const MIN_INT64 = -(2 ** (64 - 1)) + 1;

const checkInt = (
  value: number,
  bits: number,
  min: number,
  max: number,
) => {
  assert(
    Number.isInteger(Number(value)),
    `attempt to write non-integer (${value}) into integer heap`,
  );
  assert(
    value <= max,
    `value (${value}) too large to write as ${bits}-bit value`,
  );
  assert(
    value >= min,
    `value (${value}) too small to write as ${bits}-bit value`,
  );
};

export const checkInt1 = (value: number) => checkInt(value, 1, -1, 1);

export const checkInt8 = (value: number) =>
  checkInt(value, 8, MIN_INT8, MAX_UINT8);

export const checkInt16 = (value: number) =>
  checkInt(value, 16, MIN_INT16, MAX_UINT16);

export const checkInt32 = (value: number) =>
  checkInt(value, 32, MIN_INT32, MAX_UINT32);

export const checkInt53 = (value: number) =>
  checkInt(value, 53, MIN_INT53, MAX_UINT53);

export const checkInt64 = (value: bigint) => {
  assert(
    Number.isInteger(value),
    `attempt to write non-integer (${value}) into integer heap`,
  );
  assert(
    value <= MAX_UINT64,
    `value (${value}) too large to write as 64-bit value`,
  );
  assert(
    value >= MIN_INT64,
    `value (${value}) too small to write as 64-bit value`,
  );
}
