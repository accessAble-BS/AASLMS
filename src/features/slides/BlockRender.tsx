import { useState } from 'react';
import { BRAND_LOGO_URL } from '@/lib/brand';
import { parseVideoEmbed } from '@/lib/slides';
import type { Block } from '@/lib/types';

type BlockRenderProps = {
  block: Block;
  interactive?: boolean;
};

export function BlockRender({ block, interactive = true }: BlockRenderProps) {
  const content = block.content || {};
  const [flipped, setFlipped] = useState(false);

  switch (block.type) {
    case 'heading':
      return (
        <div className={`slide-block slide-block-${block.type}`}>
          <p className="slide-block-heading">{String(content.text || '')}</p>
        </div>
      );
    case 'text':
      return (
        <div className={`slide-block slide-block-${block.type}`}>
          {content.subheading ? (
            <p className="slide-block-subheading">{String(content.subheading)}</p>
          ) : null}
          <p className="slide-text-body">{String(content.body || '')}</p>
        </div>
      );
    case 'list': {
      const items = Array.isArray(content.items) ? content.items : [];
      const ListTag = content.listType === 'numbered' ? 'ol' : 'ul';
      return (
        <div className={`slide-block slide-block-${block.type}`}>
          {content.heading ? (
            <p className="slide-block-subheading">{String(content.heading)}</p>
          ) : null}
          <ListTag className="slide-content-list">
            {items.map((item, index) => (
              <li key={index}>{String(item)}</li>
            ))}
          </ListTag>
        </div>
      );
    }
    case 'flip':
      return (
        <div className={`slide-block slide-block-${block.type}`}>
          <div
            className={`flip-card flip-card-compact${flipped ? ' flipped' : ''}`}
            tabIndex={interactive ? 0 : undefined}
            role={interactive ? 'button' : undefined}
            aria-label={interactive ? 'Flip card' : undefined}
            onClick={interactive ? () => setFlipped((value) => !value) : undefined}
            onKeyDown={
              interactive
                ? (event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      setFlipped((value) => !value);
                    }
                  }
                : undefined
            }
          >
            <div className="flip-card-inner">
              <div className="flip-card-face flip-card-front">{String(content.front || '')}</div>
              <div className="flip-card-face flip-card-back">{String(content.back || '')}</div>
            </div>
          </div>
          {interactive ? <p className="flip-card-hint">Click to flip</p> : null}
        </div>
      );
    case 'image':
      return (
        <div className={`slide-block slide-block-${block.type}`}>
          <img
            className="slide-image"
            src={String(content.imageUrl || BRAND_LOGO_URL)}
            alt={String(content.alt || content.caption || 'Slide image')}
          />
          {content.caption ? <p className="slide-caption">{String(content.caption)}</p> : null}
        </div>
      );
    case 'video': {
      const embedUrl = parseVideoEmbed(content.embedUrl);
      return (
        <div className={`slide-block slide-block-${block.type}`}>
          {embedUrl ? (
            <iframe
              className="slide-video"
              src={embedUrl}
              title={String(content.caption || 'Embedded video')}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <p className="slide-video-error">Invalid video URL.</p>
          )}
          {content.caption ? <p className="slide-caption">{String(content.caption)}</p> : null}
        </div>
      );
    }
    case 'callout':
      return (
        <div className={`slide-block slide-block-${block.type}`}>
          <div className={`slide-callout slide-callout-${String(content.style || 'note')}`}>
            <span className="slide-callout-label">
              {String(content.style || 'note').toUpperCase()}
            </span>
            <h3>{String(content.heading || '')}</h3>
            <p>{String(content.body || '')}</p>
          </div>
        </div>
      );
    default:
      return (
        <div className={`slide-block slide-block-${block.type}`}>
          <p>Unsupported block type.</p>
        </div>
      );
  }
}
