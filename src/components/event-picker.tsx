"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function EventPicker({ events, current }: { events: { id: string; name: string }[]; current: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  if (events.length <= 1) return null;
  return (
    <select
      aria-label="選擇活動場次"
      className="input w-auto max-w-full py-1 text-sm"
      value={current}
      onChange={(e) => {
        const next = new URLSearchParams(params);
        next.set("event", e.target.value);
        router.push(`${pathname}?${next}`);
      }}
    >
      {events.map((e) => (
        <option key={e.id} value={e.id}>
          {e.name}
        </option>
      ))}
    </select>
  );
}
