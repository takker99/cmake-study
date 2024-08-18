export const ptrToString = (ptr: number): `0x${string}` => {
  // With CAN_ADDRESS_2GB or MEMORY64, pointers are already unsigned.
  ptr >>>= 0;
  return `0x${ptr.toString(16).padStart(8, "0")}`;
};
