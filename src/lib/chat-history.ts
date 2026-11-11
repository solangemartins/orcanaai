import type { UIMessage } from "ai";

export type HistoryRow = {
  id: string; sdk_id: string; role: string; parts: unknown; created_at: string; reply_to_sdk_id?: string | null;
};

export function restoreChatHistory(rows: HistoryRow[]): UIMessage[] {
  const sorted = [...rows].sort((a, b) => a.created_at.localeCompare(b.created_at) ||
    (a.role === b.role ? a.id.localeCompare(b.id) : a.role === "user" ? -1 : 1));
  const seen = new Set<string>();
  return sorted.flatMap((row) => {
    const id = row.sdk_id || row.id;
    if (seen.has(id) || !Array.isArray(row.parts) || !["user", "assistant", "system"].includes(row.role)) return [];
    seen.add(id);
    return [{ id, role: row.role as UIMessage["role"], parts: row.parts as UIMessage["parts"] }];
  });
}

export function assistantTimestamp(userTimestamp: string, now = Date.now()): string {
  return new Date(Math.max(now, new Date(userTimestamp).getTime() + 1)).toISOString();
}