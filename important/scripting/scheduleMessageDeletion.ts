export function scheduleMessageDeletion(
  target:
    | { delete: () => Promise<unknown> }
    | { deleteReply: () => Promise<unknown> }
    | null
    | undefined,
  durationMs?: number,
): void {
  if (!target || !durationMs || durationMs <= 0) return;

  setTimeout(() => {
    if ("deleteReply" in target && typeof target.deleteReply === "function") {
      target.deleteReply().catch(() => {});
    } else if ("delete" in target && typeof target.delete === "function") {
      target.delete().catch(() => {});
    }
  }, durationMs);
}
