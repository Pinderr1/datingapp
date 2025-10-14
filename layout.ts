export const HEADER_HEIGHT = 72;

export const SPACING = {
  XS: 4,
  SM: 8,
  MD: 12,
  LG: 16,
  XL: 20,
  XXL: 32,
} as const;

export const FONT_SIZES = {
  SM: 14,
  MD: 16,
  LG: 20,
} as const;

export const BUTTON_STYLE = {
  paddingHorizontal: 24,
  paddingVertical: 14,
  borderRadius: 30,
} as const;

export type SpacingKey = keyof typeof SPACING;
export type FontSizeKey = keyof typeof FONT_SIZES;
