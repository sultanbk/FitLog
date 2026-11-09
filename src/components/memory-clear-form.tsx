"use client";

export function MemoryClearForm() {
  return <form action="/api/food-memory" method="post" onSubmit={(event) => { if (!window.confirm("Delete all remembered foods? This cannot be undone.")) event.preventDefault(); }}><input type="hidden" name="action" value="clear"/><button className="rounded-xl border border-red-200 px-4 py-2 text-sm font-medium text-red-700">Clear all memories</button></form>;
}
