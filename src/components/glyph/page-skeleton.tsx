/** Lightweight placeholder shown while a client-only page boundary loads. */
export function PageSkeleton() {
  return (
    <div className="animate-pulse space-y-5" aria-busy="true" aria-label="Loading">
      <div className="h-11 w-64 rounded-xl bg-white/5" />
      <div className="h-32 rounded-2xl bg-white/5" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="h-40 rounded-2xl bg-white/5" />
        ))}
      </div>
    </div>
  );
}
