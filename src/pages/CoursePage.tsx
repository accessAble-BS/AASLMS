import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { CourseInfoCard } from '@/components/CourseInfoCard';
import { Modal } from '@/components/Modal';
import { RouteLoading } from '@/components/RouteLoading';
import {
  createEmptyModule,
  deleteCourse,
  fetchCourse,
  getAbsoluteEmbedUrl,
  getEmbedIframeCode,
  getSortedModules,
  updateCourse,
} from '@/lib/courses';
import { buildImportedModules, parseModuleImport } from '@/lib/module-import';
import { prepareCourseImage } from '@/lib/images';
import { fetchCourseProgressSummary } from '@/lib/progress';
import type { LearnerProgressRow } from '@/lib/progress';
import { useRoles } from '@/hooks/useRoles';
import type { Course } from '@/lib/types';

export function CoursePage() {
  const { courseId = '' } = useParams();
  const navigate = useNavigate();
  const { canEditLms } = useRoles();
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [progressRows, setProgressRows] = useState<LearnerProgressRow[]>([]);
  const [progressLoading, setProgressLoading] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [addModuleOpen, setAddModuleOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  useEffect(() => {
    void loadCourse();
  }, [courseId]);

  useEffect(() => {
    if (!canEditLms || !course) return;
    void loadProgress(course);
  }, [canEditLms, course?.id]);

  async function loadProgress(c: Course) {
    setProgressLoading(true);
    const totalModules = Array.isArray(c.modules) ? c.modules.length : 0;
    const { rows } = await fetchCourseProgressSummary(c.id, totalModules);
    setProgressRows(rows);
    setProgressLoading(false);
  }

  async function loadCourse() {
    if (!courseId) {
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
      setCourse(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteCourse() {
    if (!course || !window.confirm('Delete this course and all its modules?')) return;
    await deleteCourse(course.id);
    navigate('/dashboard', { replace: true });
  }

  async function handleEditCourse(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!course) return;
    setFormError(null);

    const formData = new FormData(event.currentTarget);
    setSubmitting(true);
    try {
      let imageUrl: string | undefined;
      if (imageFile) {
        imageUrl = await prepareCourseImage(imageFile);
      }

      const updated = await updateCourse(course.id, {
        name: String(formData.get('name') || ''),
        description: String(formData.get('description') || ''),
        author: String(formData.get('author') || ''),
        category: String(formData.get('category') || ''),
        imageUrl: imageUrl ?? course.imageUrl,
      });
      setCourse(updated);
      setEditOpen(false);
      setImageFile(null);
      setImagePreview(null);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not update course.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAddModule(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!course) return;
    setFormError(null);

    const formData = new FormData(event.currentTarget);
    const modules = getSortedModules(course);
    const next = createEmptyModule(
      String(formData.get('name') || ''),
      String(formData.get('description') || ''),
      modules.length,
    );

    setSubmitting(true);
    try {
      const updated = await updateCourse(course.id, {
        name: course.name,
        description: course.description,
        author: course.author,
        category: course.category,
        modules: [...modules, next],
      });
      setCourse(updated);
      setAddModuleOpen(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not add module.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleImportFile(event: React.ChangeEvent<HTMLInputElement>) {
    if (!course) return;
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = parseModuleImport(text);
      const modules = getSortedModules(course);
      const imported = buildImportedModules(parsed, modules.length);
      const updated = await updateCourse(course.id, {
        name: course.name,
        description: course.description,
        author: course.author,
        category: course.category,
        modules: [...modules, ...imported],
      });
      setCourse(updated);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Import failed.');
    }
  }

  async function handleDeleteModule(moduleId: string) {
    if (!course || !window.confirm('Delete this module?')) return;
    const modules = getSortedModules(course).filter((m) => m.id !== moduleId);
    const updated = await updateCourse(course.id, {
      name: course.name,
      description: course.description,
      author: course.author,
      category: course.category,
      modules,
    });
    setCourse(updated);
  }

  function copyEmbed(moduleId: string) {
    if (!course) return;
    const code = getEmbedIframeCode(course.id, moduleId, course.embedToken);
    void navigator.clipboard.writeText(code);
    alert('Embed code copied to clipboard.');
  }

  if (loading || !course) return <RouteLoading label="Loading course…" />;

  const modules = getSortedModules(course);

  return (
    <>
      <p className="page-back">
        <Link to="/dashboard">← Course catalogue</Link>
      </p>

      <CourseInfoCard
        course={course}
        onEdit={() => setEditOpen(true)}
        onDelete={() => void handleDeleteCourse()}
      />

      <section className="module-section">
        <div className="module-section-header">
          <h2>Modules</h2>
          <div className="module-section-actions">
            <label className="btn btn-secondary btn-small">
              Import modules
              <input type="file" accept=".txt,text/plain" hidden onChange={(e) => void handleImportFile(e)} />
            </label>
            <button type="button" className="btn btn-primary btn-small" onClick={() => setAddModuleOpen(true)}>
              Add module
            </button>
          </div>
        </div>

        {modules.length === 0 ? (
          <p className="empty-state">No modules yet. Add one manually or import from a template file.</p>
        ) : (
          <ul className="module-list">
            {modules.map((module, index) => {
              const slideCount = Array.isArray(module.slides) ? module.slides.length : 0;
              return (
              <li key={module.id} className="module-list-item">
                <span className="module-order">{index + 1}</span>
                <div className="module-content">
                  <span className="module-name">{module.name}</span>
                  <span className="module-description">{module.description || 'No description'}</span>
                </div>
                <span className="module-meta">
                  {slideCount} slide{slideCount === 1 ? '' : 's'}
                </span>
                <div className="module-list-actions">
                  <Link
                    to={`/module/${course.id}/${module.id}`}
                    className="btn btn-secondary btn-small"
                  >
                    Edit content
                  </Link>
                  <a
                    href={getAbsoluteEmbedUrl(course.id, module.id, course.embedToken)}
                    className="btn btn-secondary btn-small"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    View
                  </a>
                  <button
                    type="button"
                    className="btn btn-secondary btn-small"
                    onClick={() => copyEmbed(module.id)}
                  >
                    Copy embed
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-small btn-icon-danger"
                    onClick={() => void handleDeleteModule(module.id)}
                  >
                    Delete
                  </button>
                </div>
              </li>
            );
            })}
          </ul>
        )}
      </section>

      {canEditLms && (
        <section className="module-section progress-section">
          <div className="module-section-header">
            <h2>Learner progress</h2>
          </div>
          {progressLoading ? (
            <p className="empty-state">Loading progress…</p>
          ) : progressRows.length === 0 ? (
            <p className="empty-state">No completions yet.</p>
          ) : (
            <div className="progress-table-wrap">
              <table className="progress-table">
                <thead>
                  <tr>
                    <th>Learner</th>
                    <th>Modules completed</th>
                    <th>Last activity</th>
                  </tr>
                </thead>
                <tbody>
                  {progressRows.map((row) => (
                    <tr key={row.user_id}>
                      <td>{row.email}</td>
                      <td>
                        {row.completed_modules} / {row.total_modules}
                      </td>
                      <td>{row.last_activity ? new Date(row.last_activity).toLocaleDateString() : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      <Modal open={editOpen} title="Edit course" onClose={() => setEditOpen(false)}>
        <form onSubmit={(e) => void handleEditCourse(e)}>
          {formError && <div className="alert alert-error">{formError}</div>}
          <div className="form-field">
            <label htmlFor="editCourseName">Course name</label>
            <input id="editCourseName" name="name" defaultValue={course.name} required />
          </div>
          <div className="form-field">
            <label htmlFor="editCourseDescription">Description</label>
            <textarea
              id="editCourseDescription"
              name="description"
              rows={4}
              defaultValue={course.description}
              required
            />
          </div>
          <div className="form-field">
            <label htmlFor="editCourseAuthor">Author</label>
            <input id="editCourseAuthor" name="author" defaultValue={course.author} required />
          </div>
          <div className="form-field">
            <label htmlFor="editCourseCategory">Category</label>
            <input id="editCourseCategory" name="category" defaultValue={course.category} required />
          </div>
          <div className="form-field">
            <label htmlFor="editCourseImage">Replace cover image (optional)</label>
            <input
              id="editCourseImage"
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null;
                setImageFile(file);
                setImagePreview(file ? URL.createObjectURL(file) : null);
              }}
            />
            {imagePreview ? (
              <img className="image-preview" src={imagePreview} alt="New cover preview" />
            ) : course.imageUrl ? (
              <img className="image-preview" src={course.imageUrl} alt="Current cover" />
            ) : null}
          </div>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Saving…' : 'Save changes'}
          </button>
        </form>
      </Modal>

      <Modal open={addModuleOpen} title="Add module" onClose={() => setAddModuleOpen(false)}>
        <form onSubmit={(e) => void handleAddModule(e)}>
          {formError && <div className="alert alert-error">{formError}</div>}
          <div className="form-field">
            <label htmlFor="moduleName">Module name</label>
            <input id="moduleName" name="name" required />
          </div>
          <div className="form-field">
            <label htmlFor="moduleDescription">Description</label>
            <textarea id="moduleDescription" name="description" rows={3} />
          </div>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Adding…' : 'Add module'}
          </button>
        </form>
      </Modal>
    </>
  );
}
