/** CubPay's two interlocking routes: a purely decorative brand mark. */
export function BrandMark() {
  return (
    <span className="brand-mark" aria-hidden="true">
      <svg viewBox="0 0 32 32" fill="none">
        <path
          d="M23 8H13a8 8 0 0 0 0 16h3"
          stroke="currentColor"
          strokeWidth="3"
        />
        <path
          d="M9 24h10a8 8 0 0 0 0-16h-3"
          stroke="currentColor"
          strokeWidth="3"
          opacity=".5"
        />
        <path
          d="m20 5 3 3-3 3M12 21l-3 3 3 3"
          stroke="currentColor"
          strokeWidth="2"
        />
      </svg>
    </span>
  );
}
export function NavIcon({ name }: { name: string }) {
  const paths: Record<string, string> = {
    overview: "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z",
    orders: "M3 7h17m-4-4 4 4-4 4M21 17H4m4-4-4 4 4 4",
    companies:
      "M4 21V7l8-4 8 4v14M2 21h20M8 9h1m6 0h1M8 13h1m6 0h1M10 21v-5h4v5",
    batches: "m12 3 9 5-9 5-9-5 9-5ZM3 12l9 5 9-5M3 16l9 5 9-5",
    ledger: "M4 4h7a3 3 0 0 1 3 3v14a4 4 0 0 0-4-2H4V4ZM14 7h6v12h-2",
    activity: "M3 12h4l3-8 4 16 3-8h4",
  };
  return (
    <svg
      className="nav-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name] || paths.overview} />
    </svg>
  );
}
