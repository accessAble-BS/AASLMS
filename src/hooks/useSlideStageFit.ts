import { useEffect, type RefObject } from 'react';
import { fitSlideStage } from '@/lib/slide-stage';

export function useSlideStageFit(
  containerRef: RefObject<HTMLElement | null>,
  enabled = true,
  deps: unknown[] = [],
): void {
  useEffect(() => {
    if (!enabled) return;

    const container = containerRef.current;
    if (!container) return;

    const schedule = () => requestAnimationFrame(() => fitSlideStage(container));

    schedule();
    const observer = new ResizeObserver(schedule);
    observer.observe(container);

    const onImageLoad = () => schedule();
    container.querySelectorAll('img').forEach((img) => {
      if (!img.complete) {
        img.addEventListener('load', onImageLoad, { once: true });
      }
    });

    return () => observer.disconnect();
  }, [containerRef, enabled, ...deps]);
}
