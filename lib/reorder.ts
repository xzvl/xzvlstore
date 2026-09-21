type Sortable = { id: string; sort_order: number };

// Moves the visible product `fromId` to where `toId` sits among the visible
// products (`displayed`, in on-screen order), out of the full store-ordered list
// `all`.
//
// The visible products are re-arranged among the positions they already occupy
// in `all`, so products hidden by a filter/search keep their place. The
// sort_order values those positions already held are re-used (they're ascending),
// so the new order can never collide with a product that isn't on screen.
//
// Returns the new full list plus only the rows whose sort_order changed, or
// null when nothing would move.
export function reorderVisible<T extends Sortable>(
  all: T[],
  displayed: T[],
  fromId: string,
  toId: string
): { next: T[]; changed: { id: string; sort_order: number }[] } | null {
  const from = displayed.findIndex((p) => p.id === fromId);
  const to = displayed.findIndex((p) => p.id === toId);
  if (from < 0 || to < 0 || from === to) return null;

  const nextShown = [...displayed];
  const [moved] = nextShown.splice(from, 1);
  nextShown.splice(to, 0, moved);

  const shownIds = new Set(displayed.map((p) => p.id));
  const slots = all.flatMap((p, i) => (shownIds.has(p.id) ? [i] : []));

  const next = [...all];
  const changed: { id: string; sort_order: number }[] = [];
  slots.forEach((slot, i) => {
    const item = nextShown[i];
    const sortOrder = all[slot].sort_order;
    if (item.sort_order !== sortOrder) changed.push({ id: item.id, sort_order: sortOrder });
    next[slot] = { ...item, sort_order: sortOrder };
  });

  return changed.length === 0 ? null : { next, changed };
}
