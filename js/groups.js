// Groups channels by similar content, using the topic categories YouTube attaches
// to each channel (e.g. "Technology", "Food", "Rock_music", "Role-playing_video_game").
// The fine-grained topics are folded into a fixed set of groups, and if there are
// still more than MAX_GROUPS in use, the smallest are merged into "Other".

export const MAX_GROUPS = 20;
export const OTHER = 'Other';

const MUSIC = 'Music';
const GAMING = 'Gaming';
const SPORTS = 'Sports';

const SPECIFIC = {
  // Music
  Christian_music: MUSIC, Classical_music: MUSIC, Country_music: MUSIC, Electronic_music: MUSIC,
  Hip_hop_music: MUSIC, Independent_music: MUSIC, Jazz: MUSIC, Music_of_Asia: MUSIC,
  Music_of_Latin_America: MUSIC, Pop_music: MUSIC, Reggae: MUSIC, Rhythm_and_blues: MUSIC,
  Rock_music: MUSIC, Soul_music: MUSIC,
  // Gaming
  'Action_game': GAMING, 'Action-adventure_game': GAMING, Casual_game: GAMING, Music_video_game: GAMING,
  Puzzle_video_game: GAMING, Racing_video_game: GAMING, 'Role-playing_video_game': GAMING,
  Simulation_video_game: GAMING, Sports_game: GAMING, Strategy_video_game: GAMING, Video_game_culture: GAMING,
  // Sports
  American_football: SPORTS, Association_football: SPORTS, Baseball: SPORTS, Basketball: SPORTS,
  Boxing: SPORTS, Cricket: SPORTS, Golf: SPORTS, Ice_hockey: SPORTS, Mixed_martial_arts: SPORTS,
  Motorsport: SPORTS, Professional_wrestling: SPORTS, Tennis: SPORTS, Volleyball: SPORTS,
  // Entertainment
  Film: 'Film & TV', Television_program: 'Film & TV', Humour: 'Comedy', Performing_arts: 'Performing arts',
  // Lifestyle
  Fashion: 'Fashion & beauty', Physical_attractiveness: 'Fashion & beauty', Fitness: 'Fitness',
  Food: 'Food & cooking', Hobby: 'Hobbies & DIY', Pet: 'Pets & animals', Technology: 'Technology',
  Tourism: 'Travel', Vehicle: 'Cars & vehicles',
  // Society
  Business: 'Business & finance', Health: 'Health', Military: 'Military', Politics: 'Politics & news',
  Religion: 'Religion',
};

// Broad parent topics: only used when a channel has nothing more specific.
const GENERIC = {
  Music: MUSIC, Gaming: GAMING, Sport: SPORTS,
  Knowledge: 'Education & knowledge', Entertainment: 'Entertainment',
  'Lifestyle_(sociology)': 'Lifestyle', Society: 'Society',
};

// "https://en.wikipedia.org/wiki/Rock_music" -> "Rock_music"
export function topicName(url) {
  try { return decodeURIComponent(String(url).split('/').pop()); } catch { return String(url); }
}

function rawGroups(topics = []) {
  const specific = new Set();
  const generic = new Set();
  for (const t of topics) {
    if (SPECIFIC[t]) specific.add(SPECIFIC[t]);
    else if (GENERIC[t]) generic.add(GENERIC[t]);
  }
  return [...(specific.size ? specific : generic)];
}

// channels: [{ id, topics }] -> Map(channelId -> [group, ...])
export function assignGroups(channels) {
  const raw = new Map(channels.map((c) => [c.id, rawGroups(c.topics)]));
  const sizes = new Map();
  for (const groups of raw.values()) for (const g of groups) sizes.set(g, (sizes.get(g) || 0) + 1);

  let keep = new Set(sizes.keys());
  const needsOther = [...raw.values()].some((g) => !g.length);
  if (keep.size + (needsOther ? 1 : 0) > MAX_GROUPS) {
    // Keep the biggest groups and leave room for "Other".
    keep = new Set([...sizes.entries()].sort((a, b) => b[1] - a[1]).slice(0, MAX_GROUPS - 1).map(([g]) => g));
  }

  const out = new Map();
  for (const [id, groups] of raw) {
    const kept = groups.filter((g) => keep.has(g));
    out.set(id, kept.length ? kept.sort() : [OTHER]);
  }
  return out;
}

// Group names in display order (largest first, "Other" last) with their channels.
export function groupsOf(channels) {
  const map = new Map();
  for (const c of channels) {
    for (const g of c.groups || []) {
      if (!map.has(g)) map.set(g, []);
      map.get(g).push(c);
    }
  }
  return [...map.entries()]
    .map(([name, list]) => ({ name, channels: list.sort((a, b) => a.title.localeCompare(b.title)) }))
    .sort((a, b) => (a.name === OTHER) - (b.name === OTHER) || b.channels.length - a.channels.length || a.name.localeCompare(b.name));
}
