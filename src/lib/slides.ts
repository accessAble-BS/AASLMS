import { generateId } from '@/lib/courses';
import type { Block, BlockContent, BlockType, Module, Slide } from '@/lib/types';

export type ComponentField = {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'lines' | 'select' | 'image';
  required?: boolean;
  placeholder?: string;
  rows?: number;
  options?: { value: string; label: string }[];
};

export const COMPONENT_TYPES: Record<
  BlockType,
  { label: string; description: string; fields: ComponentField[] }
> = {
  heading: {
    label: 'Heading',
    description: 'Large title text',
    fields: [{ key: 'text', label: 'Heading text', type: 'text', required: true }],
  },
  text: {
    label: 'Text',
    description: 'Subheading and paragraph',
    fields: [
      { key: 'subheading', label: 'Subheading', type: 'text', placeholder: 'Optional' },
      { key: 'body', label: 'Body text', type: 'textarea', rows: 4, required: true },
    ],
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
          { value: 'numbered', label: 'Numbered list' },
        ],
      },
      {
        key: 'items',
        label: 'List items',
        type: 'lines',
        required: true,
        placeholder: 'One item per line',
      },
    ],
  },
  flip: {
    label: 'Flip card',
    description: 'Term on front, answer on back',
    fields: [
      { key: 'front', label: 'Front', type: 'textarea', rows: 3, required: true },
      { key: 'back', label: 'Back', type: 'textarea', rows: 3, required: true },
    ],
  },
  image: {
    label: 'Image',
    description: 'Image with optional caption',
    fields: [
      { key: 'imageFile', label: 'Image', type: 'image', required: true },
      { key: 'caption', label: 'Caption', type: 'text', placeholder: 'Optional' },
      { key: 'alt', label: 'Alt text', type: 'text', placeholder: 'Describe the image' },
    ],
  },
  video: {
    label: 'Video',
    description: 'YouTube or Vimeo embed',
    fields: [
      {
        key: 'embedUrl',
        label: 'Video URL',
        type: 'text',
        required: true,
        placeholder: 'https://www.youtube.com/watch?v=...',
      },
      { key: 'caption', label: 'Caption', type: 'text', placeholder: 'Optional' },
    ],
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
          { value: 'warning', label: 'Warning' },
        ],
      },
      { key: 'heading', label: 'Heading', type: 'text', required: true },
      { key: 'body', label: 'Message', type: 'textarea', rows: 3, required: true },
    ],
  },
};

export const LAYOUT_OPTIONS = [
  { id: 1 as const, label: 'Single column', description: 'One full-width content area' },
  { id: 2 as const, label: 'Two columns', description: 'Side-by-side content areas' },
];

export function splitLines(value: unknown): string[] {
  return String(value)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

export function linesToText(items: unknown): string {
  return Array.isArray(items) ? items.join('\n') : '';
}

export function createSlide(columnCount: 1 | 2, order: number): Slide {
  return {
    id: generateId(),
    order,
    columnCount,
    columns: [{ blocks: [] }, { blocks: [] }],
  };
}

export function createBlock(type: BlockType, content: BlockContent): Block {
  return {
    id: generateId(),
    type,
    content: normalizeBlockContent(type, content),
  };
}

export function normalizeBlockContent(type: BlockType, content: BlockContent): BlockContent {
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

export function normalizeSlide(slide: Partial<Slide> & { type?: BlockType; content?: BlockContent }): Slide {
  if (slide?.columns) {
    return {
      id: slide.id ?? generateId(),
      order: slide.order ?? 0,
      columnCount: slide.columnCount === 2 ? 2 : 1,
      columns: [
        { blocks: slide.columns[0]?.blocks || [] },
        { blocks: slide.columnCount === 2 ? slide.columns[1]?.blocks || [] : [] },
      ],
    };
  }

  if (slide?.type) {
    return {
      id: slide.id ?? generateId(),
      order: slide.order ?? 0,
      columnCount: 1,
      columns: [
        {
          blocks: [
            {
              id: `${slide.id}-legacy`,
              type: slide.type,
              content: normalizeBlockContent(slide.type, slide.content || {}),
            },
          ],
        },
        { blocks: [] },
      ],
    };
  }

  return createSlide(1, slide?.order ?? 0);
}

export function getComponentTypeList() {
  return Object.entries(COMPONENT_TYPES).map(([id, meta]) => ({ id: id as BlockType, ...meta }));
}

export function getComponentTypeLabel(type: string): string {
  return COMPONENT_TYPES[type as BlockType]?.label || type;
}

export function getLayoutLabel(columnCount: number): string {
  return columnCount === 2 ? 'Two columns' : 'Single column';
}

export function getSortedSlides(module: Pick<Module, 'slides'>): Slide[] {
  if (!Array.isArray(module?.slides)) return [];
  return [...module.slides].map(normalizeSlide).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

function countBlocks(slide: Slide): number {
  const normalized = normalizeSlide(slide);
  return normalized.columns.reduce((total, column) => total + column.blocks.length, 0);
}

export function getSlidePreviewText(slide: Slide): string {
  const normalized = normalizeSlide(slide);
  const firstBlock = normalized.columns[0]?.blocks?.[0];

  if (!firstBlock) {
    return `${getLayoutLabel(normalized.columnCount)} · empty`;
  }

  const blockPreview = getBlockPreviewText(firstBlock);
  const extra = countBlocks(normalized) > 1 ? ` +${countBlocks(normalized) - 1} more` : '';
  return `${blockPreview}${extra}`;
}

export function getBlockPreviewText(block: Block): string {
  const content = block.content || {};

  switch (block.type) {
    case 'heading':
      return String(content.text || 'Heading');
    case 'text':
      return String(content.subheading || String(content.body || '').slice(0, 40) || 'Text');
    case 'list':
      return String(content.heading || (Array.isArray(content.items) ? content.items[0] : '') || 'List');
    case 'flip':
      return String(content.front || 'Flip card');
    case 'image':
      return String(content.caption || 'Image');
    case 'video':
      return String(content.caption || 'Video');
    case 'callout':
      return String(content.heading || 'Callout');
    default:
      return getComponentTypeLabel(block.type);
  }
}

export function parseVideoEmbed(url: unknown): string | null {
  if (!url) return null;

  const trimmed = String(url).trim();
  const youtubePatterns = [
    /youtube\.com\/watch\?v=([\w-]+)/i,
    /youtu\.be\/([\w-]+)/i,
    /youtube\.com\/embed\/([\w-]+)/i,
  ];

  for (const pattern of youtubePatterns) {
    const match = trimmed.match(pattern);
    if (match) return `https://www.youtube.com/embed/${match[1]}`;
  }

  const vimeoMatch = trimmed.match(/vimeo\.com\/(?:video\/)?(\d+)/i);
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;

  if (/youtube\.com\/embed\//i.test(trimmed) || /player\.vimeo\.com\/video\//i.test(trimmed)) {
    return trimmed;
  }

  return null;
}
