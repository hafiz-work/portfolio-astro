// Ringgit formatting for the Showcase pages - integer sen in, one locale and spacing out.

const TWO_DP = new Intl.NumberFormat("ms-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** 123450 -> "1,234.50" (for cells under an "RM" heading). */
export const ringgit = (sen: number) => TWO_DP.format(sen / 100);

/** 123450 -> "RM 1,234.50". */
export const rm = (sen: number) => `RM ${ringgit(sen)}`;
