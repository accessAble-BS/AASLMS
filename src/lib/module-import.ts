import { generateId } from '@/lib/courses';
import { createBlock, createSlide, splitLines } from '@/lib/slides';
import type { BlockType, Module, Slide } from '@/lib/types';

const IMPORT_BLOCK_TYPES = new Set<BlockType>([
  'heading',
  'text',
  'list',
  'flip',
  'image',
  'video',
  'callout',
]);

type ParsedModule = {
  name: string;
  description: string;
  slides: Slide[];
};

export function parseModuleImport(text: string): ParsedModule[] {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const modules: ParsedModule[] = [];
  let currentModule: { name: string; description: string; slides: Slide[] } | null = null;
  let currentSlide: { layout: string; columns: { blocks: ReturnType<typeof createBlock>[] }[] } | null =
    null;
  let currentBlock: { type: BlockType; fields: Record<string, string> } | null = null;
  let multilineKey: string | null = null;
  let multilineLines: string[] = [];

  function flushBlock() {
    if (!currentBlock || !currentSlide) return;

    const columnIndex = Math.max(0, (Number(currentBlock.fields.column) || 1) - 1);
    const type = currentBlock.type;
    const fields = { ...currentBlock.fields };
    delete fields.column;

    if (type === 'list' && typeof fields.items === 'string') {
      (fields as Record<string, unknown>).items = splitLines(fields.items);
    }
    if (type === 'image' && fields.url) {
      (fields as Record<string, unknown>).imageUrl = fields.url;
      delete fields.url;
    }

    if (!IMPORT_BLOCK_TYPES.has(type)) {
      throw new Error(`Unknown block type: ${type}`);
    }

    while (currentSlide.columns.length <= columnIndex) {
      currentSlide.columns.push({ blocks: [] });
    }

    currentSlide.columns[columnIndex].blocks.push(createBlock(type, fields));
    currentBlock = null;
  }

  function flushSlide() {
    flushBlock();
    if (!currentSlide || !currentModule) return;

    const layout = String(currentSlide.layout || 'one').toLowerCase();
    const columnCount = layout === 'two' || layout === '2' ? 2 : 1;
    const slide = createSlide(columnCount as 1 | 2, currentModule.slides.length);

    for (let i = 0; i < columnCount; i += 1) {
      slide.columns[i].blocks = currentSlide.columns[i]?.blocks || [];
    }

    currentModule.slides.push(slide);
    currentSlide = null;
  }

  function flushModule() {
    flushSlide();
    if (!currentModule) return;

    if (!currentModule.name) {
      throw new Error('Each module must have a name.');
    }

    modules.push(currentModule);
    currentModule = null;
  }

  function storeField(key: string, value: string) {
    if (!currentBlock) return;
    currentBlock.fields[key] = value;
  }

  lines.forEach((rawLine) => {
    const line = rawLine.trimEnd();

    if (multilineKey) {
      if (/^\S/.test(line)) {
        storeField(multilineKey, multilineLines.join('\n').trim());
        multilineKey = null;
        multilineLines = [];
      } else {
        multilineLines.push(line.replace(/^\s{2}/, ''));
        return;
      }
    }

    if (!line || line.startsWith('#')) return;

    if (line === '=== MODULE ===') {
      flushModule();
      currentModule = { name: '', description: '', slides: [] };
      return;
    }

    if (line === '=== SLIDE ===') {
      flushSlide();
      if (!currentModule) {
        throw new Error('Found a slide before a module. Start with === MODULE ===');
      }
      currentSlide = { layout: 'one', columns: [{ blocks: [] }, { blocks: [] }] };
      return;
    }

    const blockMatch = line.match(/^\[block:(\w+)\]$/i);
    if (blockMatch) {
      flushBlock();
      currentBlock = { type: blockMatch[1].toLowerCase() as BlockType, fields: {} };
      return;
    }

    const listItemMatch = line.match(/^-\s+(.*)$/);
    if (listItemMatch && currentBlock?.type === 'list') {
      const items = currentBlock.fields.items
        ? `${currentBlock.fields.items}\n${listItemMatch[1]}`
        : listItemMatch[1];
      currentBlock.fields.items = items;
      return;
    }

    const keyValueMatch = line.match(/^([\w]+):\s*(.*)$/);
    if (keyValueMatch) {
      const key = keyValueMatch[1];
      const value = keyValueMatch[2];

      if (value === '|') {
        multilineKey = key;
        multilineLines = [];
        return;
      }

      if (currentBlock) {
        storeField(key, value);
      } else if (currentSlide && key === 'layout') {
        currentSlide.layout = value;
      } else if (currentModule && (key === 'name' || key === 'description')) {
        currentModule[key] = value;
      }
    }
  });

  if (multilineKey) {
    storeField(multilineKey, multilineLines.join('\n').trim());
  }

  flushModule();

  if (modules.length === 0) {
    throw new Error('No modules found. Start with === MODULE ===');
  }

  return modules;
}

export function buildImportedModules(parsedModules: ParsedModule[], startOrder: number): Module[] {
  return parsedModules.map((parsed, index) => ({
    id: generateId(),
    name: parsed.name.trim(),
    description: (parsed.description || '').trim(),
    order: startOrder + index,
    slides: parsed.slides.map((slide, slideIndex) => ({
      ...slide,
      order: slideIndex,
    })),
  }));
}
