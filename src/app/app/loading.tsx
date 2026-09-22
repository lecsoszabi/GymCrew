/**
 * Tabváltáskor azonnal ez látszik, amíg a szerver válaszol. A Next előre
 * letölti, így a kattintás után nincs "fagyott" pillanat.
 */
export default function Loading() {
  return (
    <div className="space-y-7" role="status" aria-busy="true">
      <span className="sr-only">Betöltés…</span>
      <div>
        <div className="h-3 w-28 animate-pulse rounded-ui bg-surface-2" />
        <div className="mt-3 h-7 w-52 max-w-full animate-pulse rounded-ui bg-surface-2" />
        <div className="mt-3 h-4 w-72 max-w-full animate-pulse rounded-ui bg-surface-2" />
      </div>
      <div className="card h-44 animate-pulse" />
      <div className="card h-28 animate-pulse" />
    </div>
  );
}
