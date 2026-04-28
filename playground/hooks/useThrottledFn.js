// playground/hooks/useThrottledFn.js
// rAF + time-budget throttler. Returns a stable function ref that calls `fn`
// at most once per `intervalMs`, always on a rAF tick (never during a layout
// pass). The returned function takes no args by design — the throttled
// consumer should read its inputs from a ref it owns.

const { useEffect, useRef } = window.React;

export function useThrottledRAF(fn, intervalMs) {
  const fnRef     = useRef(fn);
  const lastRef   = useRef(0);
  const rafRef    = useRef(0);
  const aliveRef  = useRef(true);

  // Keep the latest fn without retriggering the rAF loop.
  fnRef.current = fn;

  useEffect(() => {
    aliveRef.current = true;
    function loop(t) {
      if (!aliveRef.current) return;
      if (t - lastRef.current >= intervalMs) {
        lastRef.current = t;
        try { fnRef.current(); } catch (e) { console.error('[throttledRAF]', e); }
      }
      rafRef.current = requestAnimationFrame(loop);
    }
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      aliveRef.current = false;
      cancelAnimationFrame(rafRef.current);
    };
  }, [intervalMs]);
}
