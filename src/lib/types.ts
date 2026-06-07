export type BlockType =
  | 'heading'
  | 'text'
  | 'list'
  | 'flip'
  | 'image'
  | 'video'
  | 'callout';

export type BlockContent = Record<string, unknown>;

export type Block = {
  id: string;
  type: BlockType;
  content: BlockContent;
};

export type SlideColumn = {
  blocks: Block[];
};

export type Slide = {
  id: string;
  order: number;
  columnCount: 1 | 2;
  columns: SlideColumn[];
};

export type Module = {
  id: string;
  name: string;
  description: string;
  order: number;
  slides: Slide[];
};

export type Course = {
  id: string;
  name: string;
  description: string;
  author: string;
  category: string;
  imageUrl: string | null;
  embedToken: string;
  modules: Module[];
  updatedAt: string;
  createdAt: string;
};

export type CourseRow = {
  id: string;
  legacy_firestore_id: string | null;
  name: string;
  description: string;
  author: string;
  category: string;
  image_url: string | null;
  embed_token: string;
  modules: Module[] | null;
  updated_at: string;
  created_at: string;
};
