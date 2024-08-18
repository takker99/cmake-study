const shown: Record<string, boolean> = {};

export const warnOnce = (text: string) => {
  if (shown[text]) return;
  shown[text] = true;
  console.error(text);
};
