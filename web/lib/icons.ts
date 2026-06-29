// little emoji to keep things homey. falls back to the category icon, then a dot.
const CATEGORY: Record<string, string> = {
  "sports-active": "🏃",
  entertainment: "🎬",
  "outdoors-adventure": "⛰️",
  "creative-chill": "🎨",
  culture: "🏛️",
};

const SUBCATEGORY: Record<string, string> = {
  padel: "🏓",
  "box-cricket": "🏏",
  futsal: "⚽",
  tennis: "🎾",
  squash: "🎾",
  swimming: "🏊",
  bowling: "🎳",
  karting: "🏎️",
  trampoline: "🤸",
  climbing: "🧗",
  skating: "⛸️",
  paintball: "🔫",
  cinemas: "🎬",
  arcades: "🕹️",
  "escape-rooms": "🗝️",
  vr: "🥽",
  "laser-tag": "🎯",
  billiards: "🎱",
  "mini-golf": "⛳",
  "theme-parks": "🎢",
  hikes: "🥾",
  beaches: "🏖️",
  boating: "⛵",
  "adventure-parks": "🪂",
  camping: "🏕️",
  "pottery-art": "🏺",
  "paint-cafe": "🖌️",
  "board-game-cafe": "🎲",
  "music-rooms": "🎸",
  "cooking-classes": "🍳",
  "bookstore-cafe": "📚",
  shisha: "💨",
  "museums-galleries": "🏛️",
  heritage: "🕌",
  theatre: "🎭",
};

export function categoryIcon(slug: string): string {
  return CATEGORY[slug] ?? "•";
}

export function subcategoryIcon(slug: string, categorySlug?: string): string {
  return SUBCATEGORY[slug] ?? (categorySlug ? categoryIcon(categorySlug) : "•");
}
