import { supabase } from '@/lib/supabase';
import type { Course, CourseRow, Module } from '@/lib/types';

export function generateId(): string {
  return crypto.randomUUID();
}

export function generateEmbedToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export function mapRowToCourse(row: CourseRow): Course {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    author: row.author,
    category: row.category,
    imageUrl: row.image_url,
    embedToken: row.embed_token,
    modules: Array.isArray(row.modules) ? row.modules : [],
    updatedAt: row.updated_at,
    createdAt: row.created_at,
  };
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function getSortedModules(course: Pick<Course, 'modules'>): Module[] {
  if (!Array.isArray(course.modules)) return [];
  return [...course.modules].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

export function getModuleCount(course: Pick<Course, 'modules'>): number {
  return Array.isArray(course.modules) ? course.modules.length : 0;
}

export function getEmbedUrl(courseId: string, moduleId: string, embedToken: string): string {
  const params = new URLSearchParams({ courseId, moduleId, token: embedToken });
  return `/view?${params.toString()}`;
}

export function getAbsoluteEmbedUrl(courseId: string, moduleId: string, embedToken: string): string {
  return `${window.location.origin}${getEmbedUrl(courseId, moduleId, embedToken)}`;
}

export function getEmbedIframeCode(courseId: string, moduleId: string, embedToken: string): string {
  const url = getAbsoluteEmbedUrl(courseId, moduleId, embedToken);
  return [
    '<div style="position:relative;width:100%;aspect-ratio:16/9;overflow:hidden;">',
    `  <iframe src="${url}" style="position:absolute;inset:0;width:100%;height:100%;border:0;" title="AAS LMS module" allowfullscreen loading="lazy"></iframe>`,
    '</div>',
  ].join('\n');
}

export function createEmptyModule(name: string, description: string, order: number): Module {
  return {
    id: generateId(),
    name: name.trim(),
    description: description.trim(),
    order,
    slides: [],
  };
}

export async function fetchCourses(): Promise<Course[]> {
  const { data, error } = await supabase
    .from('lms_courses')
    .select('*')
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return (data as CourseRow[]).map(mapRowToCourse);
}

export async function fetchCourse(courseId: string): Promise<Course | null> {
  const { data, error } = await supabase
    .from('lms_courses')
    .select('*')
    .or(`id.eq.${courseId},legacy_firestore_id.eq.${courseId}`)
    .maybeSingle();

  if (error) throw error;
  return data ? mapRowToCourse(data as CourseRow) : null;
}

export async function fetchCourseForEmbed(
  courseId: string,
  token: string,
): Promise<Pick<Course, 'id' | 'name' | 'modules' | 'embedToken'> | null> {
  const { data, error } = await supabase.rpc('get_lms_course_for_embed', {
    p_course_id: courseId,
    p_token: token,
  });

  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return null;

  return {
    id: row.id,
    name: row.name,
    modules: Array.isArray(row.modules) ? row.modules : [],
    embedToken: row.embed_token,
  };
}

export async function createCourse(input: {
  name: string;
  description: string;
  author: string;
  category: string;
  imageUrl: string;
}): Promise<Course> {
  const row = {
    name: input.name.trim(),
    description: input.description.trim(),
    author: input.author.trim(),
    category: input.category.trim(),
    image_url: input.imageUrl,
    embed_token: generateEmbedToken(),
    modules: [],
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase.from('lms_courses').insert(row).select('*').single();
  if (error) throw error;
  return mapRowToCourse(data as CourseRow);
}

export async function updateCourse(
  courseId: string,
  input: {
    name: string;
    description: string;
    author: string;
    category: string;
    imageUrl?: string | null;
    modules?: Module[];
  },
): Promise<Course> {
  const row: Record<string, unknown> = {
    name: input.name.trim(),
    description: input.description.trim(),
    author: input.author.trim(),
    category: input.category.trim(),
    updated_at: new Date().toISOString(),
  };

  if (input.imageUrl !== undefined) {
    row.image_url = input.imageUrl;
  }
  if (input.modules !== undefined) {
    row.modules = input.modules;
  }

  const { data, error } = await supabase
    .from('lms_courses')
    .update(row)
    .eq('id', courseId)
    .select('*')
    .single();

  if (error) throw error;
  return mapRowToCourse(data as CourseRow);
}

export async function deleteCourse(courseId: string): Promise<void> {
  const { error } = await supabase.from('lms_courses').delete().eq('id', courseId);
  if (error) throw error;
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trim()}...`;
}
