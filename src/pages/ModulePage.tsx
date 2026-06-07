import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { CourseInfoCard } from '@/components/CourseInfoCard';
import { Modal } from '@/components/Modal';
import { RouteLoading } from '@/components/RouteLoading';
import { SlideRender } from '@/features/slides/SlideRender';
import { useSlideStageFit } from '@/hooks/useSlideStageFit';
import { fetchCourse, getSortedModules, updateCourse } from '@/lib/courses';
import { prepareCourseImage } from '@/lib/images';
import {
  COMPONENT_TYPES,
  createBlock,
  createSlide,
  getBlockPreviewText,
  getComponentTypeLabel,
  getComponentTypeList,
  getLayoutLabel,
  getSlidePreviewText,
  getSortedSlides,
  LAYOUT_OPTIONS,
  linesToText,
  normalizeBlockContent,
  normalizeSlide,
  parseVideoEmbed,
  splitLines,
} from '@/lib/slides';
import type { Block, BlockContent, BlockType, Course, Slide } from '@/lib/types';

export function ModulePage() {
  const { courseId = '', moduleId = '' } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState<Course | null>(null);
  const [slides, setSlides] = useState<Slide[]>([]);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [layoutOpen, setLayoutOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [typeOpen, setTypeOpen] = useState(false);
  const [blockOpen, setBlockOpen] = useState(false);
  const [editingSlideDraft, setEditingSlideDraft] = useState<Slide | null>(null);
  const [pendingColumnIndex, setPendingColumnIndex] = useState<number | null>(null);
  const [pendingBlockType, setPendingBlockType] = useState<BlockType | null>(null);
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [blockFormError, setBlockFormError] = useState<string | null>(null);
  const [blockContent, setBlockContent] = useState<BlockContent>({});
  const [blockImageFile, setBlockImageFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  const module = course ? getSortedModules(course).find((m) => m.id === moduleId) : null;
  const activeSlide = slides[activeSlideIndex];

  useSlideStageFit(previewRef, Boolean(activeSlide), [activeSlideIndex, slides, activeSlide?.id]);

  useEffect(() => {
    void loadModule();
  }, [courseId, moduleId]);

  async function loadModule() {
    if (!courseId || !moduleId) {
      navigate('/dashboard', { replace: true });
      return;
    }

    setLoading(true);
    try {
      const data = await fetchCourse(courseId);
      if (!data) {
        navigate('/dashboard', { replace: true });
        return;
      }

      const mod = getSortedModules(data).find((m) => m.id === moduleId);
      if (!mod) {
        navigate(`/course/${courseId}`, { replace: true });
        return;
      }

      setCourse(data);
      setSlides(getSortedSlides(mod));
      setActiveSlideIndex(0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function persistSlides(nextSlides: Slide[]) {
    if (!course || !moduleId) return;
    const ordered = nextSlides.map((slide, order) => ({ ...normalizeSlide(slide), order }));
    const modules = getSortedModules(course).map((item) =>
      item.id === moduleId ? { ...item, slides: ordered } : item,
    );
    const updated = await updateCourse(course.id, {
      name: course.name,
      description: course.description,
      author: course.author,
      category: course.category,
      modules,
    });
    setCourse(updated);
    setSlides(ordered);
  }

  function openSlideEditor(slide: Slide) {
    setEditingSlideDraft(JSON.parse(JSON.stringify(normalizeSlide(slide))) as Slide);
    setEditorOpen(true);
  }

  function openBlockForm(type: BlockType, block: Block | null, columnIndex: number) {
    setPendingColumnIndex(columnIndex);
    setPendingBlockType(type);
    setEditingBlockId(block?.id ?? null);
    setBlockContent(block?.content ?? {});
    setBlockImageFile(null);
    setBlockFormError(null);
    setBlockOpen(true);
  }

  async function saveBlock(event: React.FormEvent) {
    event.preventDefault();
    if (!editingSlideDraft || pendingColumnIndex === null || !pendingBlockType) return;

    setBlockFormError(null);
    setSaving(true);

    try {
      const content = { ...blockContent };
      if (pendingBlockType === 'image') {
        if (blockImageFile) {
          content.imageUrl = await prepareCourseImage(blockImageFile);
        } else if (!content.imageUrl) {
          throw new Error('Please select an image.');
        }
      }
      if (pendingBlockType === 'list' && typeof content.items === 'string') {
        content.items = splitLines(content.items);
      }
      if (pendingBlockType === 'video' && !parseVideoEmbed(content.embedUrl)) {
        throw new Error('Please enter a valid YouTube or Vimeo URL.');
      }

      const blocks = editingSlideDraft.columns[pendingColumnIndex].blocks;
      const normalized = normalizeBlockContent(pendingBlockType, content);

      if (editingBlockId) {
        editingSlideDraft.columns[pendingColumnIndex].blocks = blocks.map((block) =>
          block.id === editingBlockId ? { ...block, type: pendingBlockType, content: normalized } : block,
        );
      } else {
        blocks.push(createBlock(pendingBlockType, normalized));
      }

      setEditingSlideDraft({ ...editingSlideDraft });
      setBlockOpen(false);
    } catch (err) {
      setBlockFormError(err instanceof Error ? err.message : 'Could not save block.');
    } finally {
      setSaving(false);
    }
  }

  async function saveSlideEditor() {
    if (!editingSlideDraft) return;
    const normalized = normalizeSlide(editingSlideDraft);
    const isNew = !slides.some((slide) => slide.id === normalized.id);
    let nextSlides: Slide[];

    if (isNew) {
      nextSlides = [...slides, normalized];
      setActiveSlideIndex(nextSlides.length - 1);
    } else {
      nextSlides = slides.map((slide) => (slide.id === normalized.id ? normalized : slide));
    }

    await persistSlides(nextSlides);
    setEditorOpen(false);
    setEditingSlideDraft(null);
  }

  async function moveSlide(index: number, direction: number) {
    const target = index + direction;
    if (target < 0 || target >= slides.length) return;
    const reordered = [...slides];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(target, 0, moved);
    if (activeSlideIndex === index) setActiveSlideIndex(target);
    else if (activeSlideIndex === target) setActiveSlideIndex(index);
    await persistSlides(reordered.map((slide, order) => ({ ...normalizeSlide(slide), order })));
  }

  async function deleteSlide(slideId: string) {
    if (!window.confirm('Delete this slide and all of its content blocks?')) return;
    const next = slides
      .filter((slide) => slide.id !== slideId)
      .map((slide, order) => ({ ...normalizeSlide(slide), order }));
    setActiveSlideIndex(Math.min(activeSlideIndex, Math.max(0, next.length - 1)));
    await persistSlides(next);
  }

  function moveBlock(columnIndex: number, blockIndex: number, direction: number) {
    if (!editingSlideDraft) return;
    const blocks = editingSlideDraft.columns[columnIndex].blocks;
    const target = blockIndex + direction;
    if (target < 0 || target >= blocks.length) return;
    const reordered = [...blocks];
    const [moved] = reordered.splice(blockIndex, 1);
    reordered.splice(target, 0, moved);
    editingSlideDraft.columns[columnIndex].blocks = reordered;
    setEditingSlideDraft({ ...editingSlideDraft });
  }

  function deleteBlock(columnIndex: number, blockId: string) {
    if (!editingSlideDraft || !window.confirm('Delete this content block?')) return;
    editingSlideDraft.columns[columnIndex].blocks = editingSlideDraft.columns[columnIndex].blocks.filter(
      (block) => block.id !== blockId,
    );
    setEditingSlideDraft({ ...editingSlideDraft });
  }

  if (loading || !course || !module) return <RouteLoading label="Loading module…" />;

  return (
    <>
      <p className="page-back">
        <Link to={`/course/${course.id}`}>← {course.name}</Link>
      </p>

      <CourseInfoCard course={course} />

      <div className="builder-layout">
        <div className="builder-grid">
        <aside className="builder-sidebar card">
          <div className="builder-sidebar-header">
            <h2>{module.name}</h2>
            <button type="button" className="btn btn-primary btn-small" onClick={() => setLayoutOpen(true)}>
              Add slide
            </button>
          </div>

          {slides.length === 0 ? (
            <p className="empty-state">No slides yet.</p>
          ) : (
            <ul className="builder-slide-list">
              {slides.map((slide, index) => {
                const normalized = normalizeSlide(slide);
                return (
                  <li key={slide.id} className={`slide-list-item${index === activeSlideIndex ? ' active' : ''}`}>
                    <button
                      type="button"
                      className="slide-list-main"
                      onClick={() => setActiveSlideIndex(index)}
                    >
                      <span className="slide-list-order">{index + 1}</span>
                      <span className="slide-list-copy">
                        <span className="slide-list-type">{getLayoutLabel(normalized.columnCount)}</span>
                        <span className="slide-list-preview">{getSlidePreviewText(normalized)}</span>
                      </span>
                    </button>
                    <div className="slide-list-actions">
                      <button type="button" className="btn-icon" onClick={() => openSlideEditor(normalized)}>
                        ✎
                      </button>
                      <button
                        type="button"
                        className="btn-icon"
                        disabled={index === 0}
                        onClick={() => void moveSlide(index, -1)}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        className="btn-icon"
                        disabled={index === slides.length - 1}
                        onClick={() => void moveSlide(index, 1)}
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        className="btn-icon btn-icon-danger"
                        onClick={() => void deleteSlide(slide.id)}
                      >
                        🗑
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </aside>

        <section className="builder-preview card">
          <div className="slide-preview-shell" ref={previewRef}>
            {activeSlide ? (
              <SlideRender slide={activeSlide} interactive />
            ) : (
              <p className="empty-state">Select or add a slide to preview it here.</p>
            )}
          </div>
          {slides.length > 0 && (
            <div className="slide-nav">
              <button
                type="button"
                className="btn btn-secondary btn-small"
                disabled={activeSlideIndex === 0}
                onClick={() => setActiveSlideIndex((i) => Math.max(0, i - 1))}
              >
                Previous
              </button>
              <span>
                {activeSlideIndex + 1} / {slides.length}
              </span>
              <button
                type="button"
                className="btn btn-secondary btn-small"
                disabled={activeSlideIndex >= slides.length - 1}
                onClick={() => setActiveSlideIndex((i) => Math.min(slides.length - 1, i + 1))}
              >
                Next
              </button>
            </div>
          )}
        </section>
        </div>
      </div>

      <Modal open={layoutOpen} title="Choose slide layout" onClose={() => setLayoutOpen(false)}>
        <div className="layout-grid">
          {LAYOUT_OPTIONS.map((layout) => (
            <button
              key={layout.id}
              type="button"
              className="layout-card"
              onClick={() => {
                setLayoutOpen(false);
                openSlideEditor(createSlide(layout.id, slides.length));
              }}
            >
              <span className={`layout-card-preview layout-preview-${layout.id}`} aria-hidden="true" />
              <span className="layout-card-label">{layout.label}</span>
              <span className="layout-card-description">{layout.description}</span>
            </button>
          ))}
        </div>
      </Modal>

      <Modal open={editorOpen} title="Build slide" onClose={() => setEditorOpen(false)} wide>
        {editingSlideDraft && (
          <>
            <div
              className={`slide-editor-columns slide-editor-columns-${editingSlideDraft.columnCount === 2 ? 2 : 1}`}
            >
              {Array.from(
                { length: editingSlideDraft.columnCount === 2 ? 2 : 1 },
                (_, columnIndex) => {
                  const blocks = editingSlideDraft.columns[columnIndex]?.blocks || [];
                  return (
                    <section key={columnIndex} className="slide-editor-column">
                      <div className="slide-editor-column-header">
                        <h3>{editingSlideDraft.columnCount === 2 ? `Column ${columnIndex + 1}` : 'Content'}</h3>
                        <button
                          type="button"
                          className="btn btn-secondary btn-small"
                          onClick={() => {
                            setPendingColumnIndex(columnIndex);
                            setTypeOpen(true);
                          }}
                        >
                          Add block
                        </button>
                      </div>
                      {blocks.length === 0 ? (
                        <p className="slide-column-empty">No blocks yet</p>
                      ) : (
                        <ul className="block-editor-list">
                          {blocks.map((block, blockIndex) => (
                            <li key={block.id} className="block-editor-item">
                              <div className="block-editor-info">
                                <span className="block-editor-type">{getComponentTypeLabel(block.type)}</span>
                                <span className="block-editor-preview">{getBlockPreviewText(block)}</span>
                              </div>
                              <div className="block-editor-actions">
                                <button
                                  type="button"
                                  className="btn-icon"
                                  onClick={() => openBlockForm(block.type, block, columnIndex)}
                                >
                                  ✎
                                </button>
                                <button
                                  type="button"
                                  className="btn-icon"
                                  disabled={blockIndex === 0}
                                  onClick={() => moveBlock(columnIndex, blockIndex, -1)}
                                >
                                  ↑
                                </button>
                                <button
                                  type="button"
                                  className="btn-icon"
                                  disabled={blockIndex === blocks.length - 1}
                                  onClick={() => moveBlock(columnIndex, blockIndex, 1)}
                                >
                                  ↓
                                </button>
                                <button
                                  type="button"
                                  className="btn-icon btn-icon-danger"
                                  onClick={() => deleteBlock(columnIndex, block.id)}
                                >
                                  🗑
                                </button>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </section>
                  );
                },
              )}
            </div>
            <button type="button" className="btn btn-primary" onClick={() => void saveSlideEditor()}>
              Save slide
            </button>
          </>
        )}
      </Modal>

      <Modal open={typeOpen} title="Choose block type" onClose={() => setTypeOpen(false)}>
        <div className="slide-type-grid">
          {getComponentTypeList().map((type) => (
            <button
              key={type.id}
              type="button"
              className="slide-type-card"
              onClick={() => {
                setTypeOpen(false);
                if (pendingColumnIndex !== null) {
                  openBlockForm(type.id, null, pendingColumnIndex);
                }
              }}
            >
              <span className="slide-type-label">{type.label}</span>
              <span className="slide-type-description">{type.description}</span>
            </button>
          ))}
        </div>
      </Modal>

      <Modal
        open={blockOpen}
        title={
          pendingBlockType
            ? `${editingBlockId ? 'Edit' : 'Add'} ${getComponentTypeLabel(pendingBlockType)}`
            : 'Block'
        }
        onClose={() => setBlockOpen(false)}
      >
        {pendingBlockType && (
          <form onSubmit={(e) => void saveBlock(e)}>
            {blockFormError && <div className="alert alert-error">{blockFormError}</div>}
            {COMPONENT_TYPES[pendingBlockType].fields.map((field) => (
              <div key={field.key} className="form-field">
                <label htmlFor={`block-field-${field.key}`}>{field.label}</label>
                {field.type === 'textarea' || field.type === 'lines' ? (
                  <textarea
                    id={`block-field-${field.key}`}
                    rows={field.rows || 4}
                    placeholder={field.placeholder}
                    required={field.required}
                    value={
                      field.type === 'lines'
                        ? linesToText(blockContent[field.key])
                        : String(blockContent[field.key] ?? '')
                    }
                    onChange={(e) =>
                      setBlockContent((prev) => ({ ...prev, [field.key]: e.target.value }))
                    }
                  />
                ) : field.type === 'select' ? (
                  <select
                    id={`block-field-${field.key}`}
                    required={field.required}
                    value={String(blockContent[field.key] ?? field.options?.[0]?.value ?? '')}
                    onChange={(e) =>
                      setBlockContent((prev) => ({ ...prev, [field.key]: e.target.value }))
                    }
                  >
                    {field.options?.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                ) : field.type === 'image' ? (
                  <>
                    {blockContent.imageUrl ? (
                      <img
                        className="image-preview"
                        src={String(blockContent.imageUrl)}
                        alt="Current image"
                      />
                    ) : null}
                    <input
                      id={`block-field-${field.key}`}
                      type="file"
                      accept="image/*"
                      onChange={(e) => setBlockImageFile(e.target.files?.[0] ?? null)}
                    />
                  </>
                ) : (
                  <input
                    id={`block-field-${field.key}`}
                    type="text"
                    placeholder={field.placeholder}
                    required={field.required}
                    value={String(blockContent[field.key] ?? '')}
                    onChange={(e) =>
                      setBlockContent((prev) => ({ ...prev, [field.key]: e.target.value }))
                    }
                  />
                )}
              </div>
            ))}
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving…' : editingBlockId ? 'Save changes' : 'Save block'}
            </button>
          </form>
        )}
      </Modal>
    </>
  );
}
