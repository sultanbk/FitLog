export default function Loading() {
  return (
    <main className="fit-route-loading" role="status" aria-live="polite" aria-busy="true">
      <div className="fit-loading-card">
        <span className="fit-loading-mark" aria-hidden="true">
          <span />
        </span>
        <p className="fit-loading-title">Opening your space</p>
        <p className="fit-loading-caption">Getting your latest updates…</p>
        <span className="fit-loading-track" aria-hidden="true">
          <span />
        </span>
        <span className="fit-sr-only">Loading page</span>
      </div>
    </main>
  );
}
