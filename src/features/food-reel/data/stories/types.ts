/** One milestone on a dish's timeline, e.g. { when: 'Đầu thế kỷ XX', what: '…' }. */
export interface StoryMilestone {
  when: string;
  what: string;
}

/** An ingredient or detail of the dish and what it stands for. */
export interface StorySymbol {
  name: string;
  meaning: string;
}

/**
 * Editorial story for one dish (Vietnamese). Well-documented history is stated
 * plainly; legends and contested origins are marked as such ("tương truyền",
 * "có nhiều giả thuyết") rather than presented as fact.
 */
export interface DishStory {
  /** Place the dish belongs to, e.g. 'Hà Nội · Nam Định' or 'Osaka, Nhật Bản'. */
  homeland: string;
  /** When it took shape, e.g. 'Đầu thế kỷ XX'. */
  era: string;
  /** One sentence on what the dish means (≤ 160 characters). */
  tagline: string;
  /** 3 paragraphs: where and how the dish was born and evolved. */
  origin: string[];
  /** 3–5 milestones, oldest first. */
  timeline: StoryMilestone[];
  /** 2–3 paragraphs: cultural meaning, place in daily life and rituals. */
  meaning: string[];
  /** 3–5 ingredients/details and their meaning. */
  symbols: StorySymbol[];
  /** 2 paragraphs: how to enjoy it the way locals do. */
  tasting: string[];
  /** 3 short surprising facts. */
  facts: string[];
  /** A real proverb, folk verse or well-known saying about the dish, if one exists. */
  saying?: { text: string; by: string };
  /** A real overview article for further reading. */
  reference?: { label: string; url: string };
}
