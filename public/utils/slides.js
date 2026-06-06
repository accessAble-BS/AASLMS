/**
 * Slide = layout shell with 1–2 columns of stacked content blocks.
 *
 * Slide: { id, order, columnCount: 1|2, columns: [{ blocks: Block[] }, ...] }
 * Block:  { id, type, content }
 */

const COMPONENT_TYPES = {
  heading: {
    label: 'Heading',
    description: 'Large title text',
    fields: [
      { key: 'text', label: 'Heading text', type: 'text', required: true }
    ]
  },
  text: {
    label: 'Text',
    description: 'Subheading and paragraph',
    fields: [
      { key: 'subheading', label: 'Subheading', type: 'text', placeholder: 'Optional' },
      { key: 'body', label: 'Body text', type: 'textarea', rows: 4, required: true }
    ]
  },
  list: {
    label: 'List',
    description: 'Bullet or numbered list',
    fields: [
      { key: 'heading', label: 'Heading', type: 'text', placeholder: 'Optional' },
      {
        key: 'listType',
        label: 'List style',
        type: 'select',
        required: true,
        options: [
          { value: 'bullet', label: 'Bullet list' },
          { value: 'numbered', label: 'Numbered list' }
        ]
      },
      { key: 'items', label: 'List items', type: 'lines', required: true, placeholder: 'One item per line' }
    ]
  },
  flip: {
    label: 'Flip card',
    description: 'Term on front, answer on back',
    fields: [
      { key: 'front', label: 'Front', type: 'textarea', rows: 3, required: true },
      { key: 'back', label: 'Back', type: 'textarea', rows: 3, required: true }
    ]
  },
  image: {
    label: 'Image',
    description: 'Image with optional caption',
    fields: [
      { key: 'imageFile', label: 'Image', type: 'image', required: true },
      { key: 'caption', label: 'Caption', type: 'text', placeholder: 'Optional' },
      { key: 'alt', label: 'Alt text', type: 'text', placeholder: 'Describe the image' }
    ]
  },
  video: {
    label: 'Video',
    description: 'YouTube or Vimeo embed',
    fields: [
      { key: 'embedUrl', label: 'Video URL', type: 'text', required: true, placeholder: 'https://www.youtube.com/watch?v=...' },
      { key: 'caption', label: 'Caption', type: 'text', placeholder: 'Optional' }
    ]
  },
  callout: {
    label: 'Callout',
    description: 'Tip, note, or warning',
    fields: [
      {
        key: 'style',
        label: 'Type',
        type: 'select',
        required: true,
        options: [
          { value: 'tip', label: 'Tip' },
          { value: 'note', label: 'Note' },
          { value: 'warning', label: 'Warning' }
        ]
      },
      { key: 'heading', label: 'Heading', type: 'text', required: true },
      { key: 'body', label: 'Message', type: 'textarea', rows: 3, required: true }
    ]
  }
};

const LAYOUT_OPTIONS = [
  { id: 1, label: 'Single column', description: 'One full-width content area' },
  { id: 2, label: 'Two columns', description: 'Side-by-side content areas' }
];

function createSlide(columnCount, order) {
  return {
    id: db.collection('courses').doc().id,
    order,
    columnCount,
    columns: [
      { blocks: [] },
      { blocks: [] }
    ]
  };
}

function createBlock(type, content) {
  return {
    id: db.collection('courses').doc().id,
    type,
    content: normalizeBlockContent(type, content)
  };
}

function normalizeBlockContent(type, content) {
  const normalized = { ...content };

  if (type === 'list' && typeof normalized.items === 'string') {
    normalized.items = splitLines(normalized.items);
  }

  if (type === 'list' && !normalized.listType) {
    normalized.listType = 'bullet';
  }

  if (type === 'callout' && !normalized.style) {
    normalized.style = 'note';
  }

  if (type === 'image') {
    delete normalized.imageFile;
  }

  return normalized;
}

function normalizeSlide(slide) {
  if (slide?.columns) {
    return {
      ...slide,
      columnCount: slide.columnCount === 2 ? 2 : 1,
      columns: [
        { blocks: slide.columns[0]?.blocks || [] },
        { blocks: slide.columnCount === 2 ? (slide.columns[1]?.blocks || []) : [] }
      ]
    };
  }

  if (slide?.type) {
    return {
      id: slide.id,
      order: slide.order ?? 0,
      columnCount: 1,
      columns: [
        {
          blocks: [{
            id: `${slide.id}-legacy`,
            type: slide.type,
            content: normalizeBlockContent(slide.type, slide.content || {})
          }]
        },
        { blocks: [] }
      ]
    };
  }

  return createSlide(1, slide?.order ?? 0);
}

function splitLines(value) {
  return String(value)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function linesToText(items) {
  return Array.isArray(items) ? items.join('\n') : '';
}

function getComponentTypeList() {
  return Object.entries(COMPONENT_TYPES).map(([id, meta]) => ({ id, ...meta }));
}

function getComponentTypeLabel(type) {
  return COMPONENT_TYPES[type]?.label || type;
}

function getLayoutLabel(columnCount) {
  return columnCount === 2 ? 'Two columns' : 'Single column';
}

function getSortedSlides(module) {
  if (!Array.isArray(module?.slides)) {
    return [];
  }

  return [...module.slides]
    .map(normalizeSlide)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

function countBlocks(slide) {
  const normalized = normalizeSlide(slide);
  return normalized.columns.reduce((total, column) => total + column.blocks.length, 0);
}

function getSlidePreviewText(slide) {
  const normalized = normalizeSlide(slide);
  const firstBlock = normalized.columns[0]?.blocks?.[0];

  if (!firstBlock) {
    return `${getLayoutLabel(normalized.columnCount)} · empty`;
  }

  const content = firstBlock.content || {};
  const blockPreview = getBlockPreviewText(firstBlock);
  const extra = countBlocks(normalized) > 1 ? ` +${countBlocks(normalized) - 1} more` : '';
  return `${blockPreview}${extra}`;
}

function getBlockPreviewText(block) {
  const content = block.content || {};

  switch (block.type) {
    case 'heading':
      return content.text || 'Heading';
    case 'text':
      return content.subheading || content.body?.slice(0, 40) || 'Text';
    case 'list':
      return content.heading || content.items?.[0] || 'List';
    case 'flip':
      return content.front || 'Flip card';
    case 'image':
      return content.caption || 'Image';
    case 'video':
      return content.caption || 'Video';
    case 'callout':
      return content.heading || 'Callout';
    default:
      return getComponentTypeLabel(block.type);
  }
}

function parseVideoEmbed(url) {
  if (!url) {
    return null;
  }

  const trimmed = url.trim();
  const youtubePatterns = [
    /youtube\.com\/watch\?v=([\w-]+)/i,
    /youtu\.be\/([\w-]+)/i,
    /youtube\.com\/embed\/([\w-]+)/i
  ];

  for (const pattern of youtubePatterns) {
    const match = trimmed.match(pattern);
    if (match) {
      return `https://www.youtube.com/embed/${match[1]}`;
    }
  }

  const vimeoMatch = trimmed.match(/vimeo\.com\/(?:video\/)?(\d+)/i);
  if (vimeoMatch) {
    return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  }

  if (/youtube\.com\/embed\//i.test(trimmed) || /player\.vimeo\.com\/video\//i.test(trimmed)) {
    return trimmed;
  }

  return null;
}

function renderBlock(block, container, options = {}) {
  const { interactive = true } = options;
  const content = block.content || {};
  const wrapper = document.createElement('div');
  wrapper.className = `slide-block slide-block-${block.type}`;

  switch (block.type) {
    case 'heading': {
      const heading = document.createElement('p');
      heading.className = 'slide-block-heading';
      heading.textContent = content.text || '';
      wrapper.appendChild(heading);
      break;
    }
    case 'text': {
      if (content.subheading) {
        const sub = document.createElement('p');
        sub.className = 'slide-block-subheading';
        sub.textContent = content.subheading;
        wrapper.appendChild(sub);
      }

      const body = document.createElement('p');
      body.className = 'slide-text-body';
      body.textContent = content.body || '';
      wrapper.appendChild(body);
      break;
    }
    case 'list': {
      if (content.heading) {
        const heading = document.createElement('p');
        heading.className = 'slide-block-subheading';
        heading.textContent = content.heading;
        wrapper.appendChild(heading);
      }

      const list = document.createElement(content.listType === 'numbered' ? 'ol' : 'ul');
      list.className = 'slide-content-list';
      (content.items || []).forEach((item) => {
        const li = document.createElement('li');
        li.textContent = item;
        list.appendChild(li);
      });
      wrapper.appendChild(list);
      break;
    }
    case 'flip': {
      const flipCard = document.createElement('div');
      flipCard.className = 'flip-card flip-card-compact';

      if (interactive) {
        flipCard.tabIndex = 0;
        flipCard.setAttribute('role', 'button');
        flipCard.setAttribute('aria-label', 'Flip card');
        flipCard.addEventListener('click', () => flipCard.classList.toggle('flipped'));
        flipCard.addEventListener('keydown', (event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            flipCard.classList.toggle('flipped');
          }
        });
      }

      const inner = document.createElement('div');
      inner.className = 'flip-card-inner';

      const front = document.createElement('div');
      front.className = 'flip-card-face flip-card-front';
      front.textContent = content.front || '';

      const back = document.createElement('div');
      back.className = 'flip-card-face flip-card-back';
      back.textContent = content.back || '';

      inner.append(front, back);
      flipCard.appendChild(inner);

      if (interactive) {
        const hint = document.createElement('p');
        hint.className = 'flip-card-hint';
        hint.textContent = 'Click to flip';
        wrapper.append(flipCard, hint);
      } else {
        wrapper.appendChild(flipCard);
      }
      break;
    }
    case 'image': {
      const image = document.createElement('img');
      image.className = 'slide-image';
      image.src = content.imageUrl || '/assets/brand/logo.png';
      image.alt = content.alt || content.caption || 'Slide image';
      wrapper.appendChild(image);

      if (content.caption) {
        const caption = document.createElement('p');
        caption.className = 'slide-caption';
        caption.textContent = content.caption;
        wrapper.appendChild(caption);
      }
      break;
    }
    case 'video': {
      const embedUrl = parseVideoEmbed(content.embedUrl);
      if (embedUrl) {
        const frame = document.createElement('iframe');
        frame.className = 'slide-video';
        frame.src = embedUrl;
        frame.title = content.caption || 'Embedded video';
        frame.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
        frame.allowFullscreen = true;
        wrapper.appendChild(frame);
      } else {
        const error = document.createElement('p');
        error.className = 'slide-video-error';
        error.textContent = 'Invalid video URL.';
        wrapper.appendChild(error);
      }

      if (content.caption) {
        const caption = document.createElement('p');
        caption.className = 'slide-caption';
        caption.textContent = content.caption;
        wrapper.appendChild(caption);
      }
      break;
    }
    case 'callout': {
      const callout = document.createElement('div');
      callout.className = `slide-callout slide-callout-${content.style || 'note'}`;

      const label = document.createElement('span');
      label.className = 'slide-callout-label';
      label.textContent = (content.style || 'note').toUpperCase();

      const heading = document.createElement('h3');
      heading.textContent = content.heading || '';

      const body = document.createElement('p');
      body.textContent = content.body || '';

      callout.append(label, heading, body);
      wrapper.appendChild(callout);
      break;
    }
    default: {
      const fallback = document.createElement('p');
      fallback.textContent = 'Unsupported block type.';
      wrapper.appendChild(fallback);
    }
  }

  container.appendChild(wrapper);
}

function renderSlide(slide, container, options = {}) {
  const { viewer = false } = options;
  const normalized = normalizeSlide(slide);
  container.innerHTML = '';

  if (!viewer) {
    container.className = 'slide-preview';
  }

  const wrapper = document.createElement('article');
  wrapper.className = `slide-render slide-layout-${normalized.columnCount}${viewer ? ' slide-render-viewer' : ''}`;

  const columnsEl = document.createElement('div');
  columnsEl.className = 'slide-columns';

  const columnCount = normalized.columnCount === 2 ? 2 : 1;

  for (let i = 0; i < columnCount; i += 1) {
    const columnEl = document.createElement('div');
    columnEl.className = 'slide-column';

    const blocks = normalized.columns[i]?.blocks || [];
    if (blocks.length === 0 && !viewer) {
      const empty = document.createElement('p');
      empty.className = 'slide-column-empty';
      empty.textContent = 'Empty column';
      columnEl.appendChild(empty);
    } else if (blocks.length > 0) {
      blocks.forEach((block) => renderBlock(block, columnEl, options));
    }

    columnsEl.appendChild(columnEl);
  }

  wrapper.appendChild(columnsEl);

  if (viewer) {
    const fit = document.createElement('div');
    fit.className = 'viewer-slide-fit';
    const scale = document.createElement('div');
    scale.className = 'viewer-slide-scale';
    scale.appendChild(wrapper);
    fit.appendChild(scale);
    container.appendChild(fit);
  } else {
    container.appendChild(wrapper);
  }
}
