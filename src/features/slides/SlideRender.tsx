import { BlockRender } from '@/features/slides/BlockRender';
import { normalizeSlide } from '@/lib/slides';
import type { Slide } from '@/lib/types';

type SlideRenderProps = {
  slide: Slide;
  viewer?: boolean;
  interactive?: boolean;
};

export function SlideRender({ slide, viewer = false, interactive = true }: SlideRenderProps) {
  const normalized = normalizeSlide(slide);
  const columnCount = normalized.columnCount === 2 ? 2 : 1;

  const content = (
    <article
      className={`slide-render slide-canvas slide-layout-${normalized.columnCount}${viewer ? ' slide-render-viewer' : ''}`}
    >
      <div className="slide-columns">
        {Array.from({ length: columnCount }, (_, index) => {
          const blocks = normalized.columns[index]?.blocks || [];
          return (
            <div key={index} className="slide-column">
              {blocks.length === 0 && !viewer ? (
                <p className="slide-column-empty">Empty column</p>
              ) : (
                blocks.map((block) => (
                  <BlockRender key={block.id} block={block} interactive={interactive} />
                ))
              )}
            </div>
          );
        })}
      </div>
    </article>
  );

  return (
    <div className="slide-stage-fit">
      <div className="slide-stage-scale">{content}</div>
    </div>
  );
}
