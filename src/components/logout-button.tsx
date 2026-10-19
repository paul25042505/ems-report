"use client";

const HEADER_STYLE = "shrink-0 rounded-md bg-red-900/60 px-3 py-1 text-sm font-semibold hover:bg-red-950";

export function LogoutButton({ className = HEADER_STYLE }: { className?: string }) {
  return (
    <button
      type="button"
      className={className}
      onClick={async () => {
        await fetch("/api/session", { method: "DELETE" });
        window.location.href = "/login";
      }}
    >
      登出
    </button>
  );
}
