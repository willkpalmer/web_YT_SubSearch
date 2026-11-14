// Overview of the content groups; each links to index.html?group=… for its channels and videos.
import * as store from './store.js';
import { refreshGroups } from './youtube.js';
import { groupsOf } from './groups.js';
import { el, statusOf } from './common.js';

const $ = (id) => document.getElementById(id);

async function render() {
  const [channels, videos, progress] = await Promise.all([
    store.getAll('channels'), store.getAll('videos'), store.getProgressMap(),
  ]);
  const counts = new Map(); // channelId -> { videos, unwatched }
  for (const v of videos) {
    if (v.isShort) continue;
    const s = counts.get(v.channelId) || { videos: 0, unwatched: 0 };
    s.videos++;
    if (statusOf(progress.get(v.id), v) === 'unwatched') s.unwatched++;
    counts.set(v.channelId, s);
  }

  const groups = groupsOf(channels);
  const ungrouped = channels.filter((c) => !c.groups).length;
  $('groupStatus').textContent = ungrouped && channels.length
    ? `${ungrouped} channel${ungrouped === 1 ? '' : 's'} not grouped yet`
    : '';

  if (!channels.length) {
    $('groups').replaceChildren(el('div', { class: 'empty', style: 'grid-column: 1 / -1' },
      'No channels yet. Go to ', el('a', { href: 'settings.html' }, 'Settings'), ' to import your subscriptions.'));
    return;
  }
  if (!groups.length) {
    $('groups').replaceChildren(el('div', { class: 'empty', style: 'grid-column: 1 / -1' },
      'Channels haven’t been grouped yet. Click "Regroup now", or sync your channels.'));
    return;
  }

  $('groups').replaceChildren(...groups.map((g) => {
    let total = 0;
    let unwatched = 0;
    for (const c of g.channels) {
      total += counts.get(c.id)?.videos || 0;
      unwatched += counts.get(c.id)?.unwatched || 0;
    }
    return el('a', { class: 'group-card', href: `index.html?group=${encodeURIComponent(g.name)}` },
      el('h2', {}, g.name),
      el('div', { class: 'meta' },
        `${g.channels.length} channel${g.channels.length === 1 ? '' : 's'} · ${total.toLocaleString()} videos · ${unwatched.toLocaleString()} unwatched`),
      el('div', { class: 'avatars' }, ...g.channels.slice(0, 12).map((c) => (c.thumb
        ? el('img', { src: c.thumb, alt: '', title: c.title, loading: 'lazy' })
        : el('span', { class: 'avatar', title: c.title })))),
      el('div', { class: 'names' }, g.channels.map((c) => c.title).join(', ')));
  }));
}

$('regroupBtn').addEventListener('click', async () => {
  const btn = $('regroupBtn');
  btn.disabled = true;
  $('groupStatus').textContent = 'Grouping…';
  try {
    if (!store.getSettings().apiKey) throw new Error('Add your YouTube API key on the Settings page first.');
    await refreshGroups();
    await render();
  } catch (e) {
    $('groupStatus').textContent = `Grouping failed: ${e.message}`;
  } finally {
    btn.disabled = false;
  }
});

render();
