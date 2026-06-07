export const SLIDE_REF_WIDTH = 1280;
export const SLIDE_REF_HEIGHT = 720;

/** Scale a 16:9 slide stage to fill the largest rect that fits inside `container`. */
export function fitSlideStage(container: HTMLElement | null): void {
  if (!container) return;
  requestAnimationFrame(() => {
    fitSlideStageNow(container);
    requestAnimationFrame(() => fitSlideStageNow(container));
  });
}

function fitSlideStageNow(container: HTMLElement): void {
  const fit = container.querySelector('.slide-stage-fit') as HTMLElement | null;
  const stage = container.querySelector('.slide-stage-scale') as HTMLElement | null;
  if (!fit || !stage) return;

  stage.style.transform = 'none';
  stage.style.width = `${SLIDE_REF_WIDTH}px`;
  stage.style.height = `${SLIDE_REF_HEIGHT}px`;

  const availableWidth = fit.clientWidth;
  const availableHeight = fit.clientHeight;
  if (!availableWidth || !availableHeight) return;

  const slide = stage.querySelector('.slide-canvas') as HTMLElement | null;
  let contentScale = 1;
  if (slide) {
    const widthRatio = SLIDE_REF_WIDTH / slide.scrollWidth;
    const heightRatio = SLIDE_REF_HEIGHT / slide.scrollHeight;
    if (widthRatio < 1 || heightRatio < 1) {
      contentScale = Math.min(widthRatio, heightRatio);
    }
  }

  const viewportScale = Math.min(
    availableWidth / SLIDE_REF_WIDTH,
    availableHeight / SLIDE_REF_HEIGHT,
  );

  stage.style.transform = `scale(${viewportScale * contentScale})`;
  stage.style.transformOrigin = 'center center';
}
