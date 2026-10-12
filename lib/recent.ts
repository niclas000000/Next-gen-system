/** Recently visited items for the command palette — per browser, best effort. */
export interface RecentItem {
  label: string
  sub?: string
  href: string
  kind: 'case' | 'document'
}

const KEY = 'nexus-recent'

export function readRecent(): RecentItem[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]') as RecentItem[]
  } catch {
    return []
  }
}

export function pushRecent(item: RecentItem) {
  try {
    const list = [item, ...readRecent().filter((r) => r.href !== item.href)].slice(0, 6)
    localStorage.setItem(KEY, JSON.stringify(list))
  } catch {}
}
