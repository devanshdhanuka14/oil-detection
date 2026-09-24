/** Captions for the four outline-building beats (spec 1 §4). */
export const OUTLINE_BEATS = [
  { title: 'comparison', caption: 'each pixel compared with the sea around it, not a fixed threshold' },
  { title: 'core', caption: 'very dark cores found first' },
  {
    title: 'flood',
    caption: 'each dark pixel joins the core it belongs to, so a slick touching a calm patch stays separate',
  },
  { title: 'trace', caption: 'outline, not a box' },
] as const;
