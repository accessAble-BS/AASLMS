import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Modal } from '@/components/Modal';
import { RouteLoading } from '@/components/RouteLoading';
import { BRAND_LOGO_URL } from '@/lib/brand';
import { createCourse, fetchCourses, formatDate, truncateText } from '@/lib/courses';
import type { Course } from '@/lib/types';
import { prepareCourseImage } from '@/lib/images';
import { useRoles } from '@/hooks/useRoles';

export function CataloguePage() {
  const { canEditLms, isLearnerOnly } = useRoles();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);

  useEffect(() => {
    void loadCourses();
  }, []);

  async function loadCourses() {
    setLoading(true);
    setError(null);
    try {
      setCourses(await fetchCourses());
    } catch (err) {
      setError('Unable to load courses. Please refresh the page.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const categories = useMemo(() => {
    const set = new Set<string>();
    courses.forEach((course) => {
      if (course.category) set.add(course.category);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [courses]);

  const filtered = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return courses.filter((course) => {
      if (activeCategory !== 'all' && course.category !== activeCategory) return false;
      if (!query) return true;
      const haystack = [course.name, course.description, course.author, course.category]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [courses, activeCategory, searchQuery]);

  const grouped = useMemo(() => {
    return filtered.reduce<Record<string, Course[]>>((groups, course) => {
      const category = course.category || 'Uncategorised';
      if (!groups[category]) groups[category] = [];
      groups[category].push(course);
      return groups;
    }, {});
  }, [filtered]);

  async function handleCreateCourse(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const name = String(formData.get('name') || '');
    const description = String(formData.get('description') || '');
    const author = String(formData.get('author') || '');
    const category = String(formData.get('category') || '');

    if (!imageFile) {
      setFormError('Please select a course image.');
      return;
    }

    setSubmitting(true);
    try {
      const imageUrl = await prepareCourseImage(imageFile);
      await createCourse({ name, description, author, category, imageUrl });
      form.reset();
      setImageFile(null);
      setImagePreview(null);
      setModalOpen(false);
      await loadCourses();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not create the course.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <RouteLoading label="Loading courses…" />;

  return (
    <>
      {isLearnerOnly && (
        <p className="catalogue-hint">You have read-only access. Contact an administrator to edit courses.</p>
      )}
      <div className="catalogue-toolbar">
        <div className="catalogue-search">
          <label htmlFor="courseSearch">Search courses</label>
          <input
            id="courseSearch"
            type="search"
            placeholder="Search by name, author, category…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        {canEditLms && (
          <button type="button" className="btn btn-primary" onClick={() => setModalOpen(true)}>
            Add course
          </button>
        )}
      </div>

      <div className="category-filter" id="categoryFilter">
        <button
          type="button"
          className={`category-chip${activeCategory === 'all' ? ' active' : ''}`}
          onClick={() => setActiveCategory('all')}
        >
          All
        </button>
        {categories.map((category) => (
          <button
            key={category}
            type="button"
            className={`category-chip${activeCategory === category ? ' active' : ''}`}
            onClick={() => setActiveCategory(category)}
          >
            {category}
          </button>
        ))}
      </div>

      {error && <p className="error-text">{error}</p>}

      {filtered.length === 0 ? (
        <p className="empty-state" id="emptyState">
          No courses match your filters yet.
        </p>
      ) : activeCategory === 'all' && !searchQuery.trim() ? (
        Object.keys(grouped)
          .sort((a, b) => a.localeCompare(b))
          .map((category) => (
            <section key={category} className="course-category-section">
              <h2>{category}</h2>
              <div className="course-gallery">
                {grouped[category].map((course) => (
                  <CourseCard key={course.id} course={course} canEdit={canEditLms} />
                ))}
              </div>
            </section>
          ))
      ) : (
        <div className="course-gallery">
          {filtered.map((course) => (
            <CourseCard key={course.id} course={course} canEdit={canEditLms} />
          ))}
        </div>
      )}

      {canEditLms && (
      <Modal open={modalOpen} title="Add course" onClose={() => setModalOpen(false)}>
        <form onSubmit={(e) => void handleCreateCourse(e)}>
          {formError && <div className="alert alert-error">{formError}</div>}
          <div className="form-field">
            <label htmlFor="courseName">Course name</label>
            <input id="courseName" name="name" required />
          </div>
          <div className="form-field">
            <label htmlFor="courseDescription">Description</label>
            <textarea id="courseDescription" name="description" rows={4} required />
          </div>
          <div className="form-field">
            <label htmlFor="courseAuthor">Author</label>
            <input id="courseAuthor" name="author" required />
          </div>
          <div className="form-field">
            <label htmlFor="courseCategory">Category</label>
            <input id="courseCategory" name="category" list="categoryList" required />
            <datalist id="categoryList">
              {categories.map((category) => (
                <option key={category} value={category} />
              ))}
            </datalist>
          </div>
          <div className="form-field">
            <label htmlFor="courseImage">Cover image</label>
            <input
              id="courseImage"
              type="file"
              accept="image/*"
              required
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null;
                setImageFile(file);
                setImagePreview(file ? URL.createObjectURL(file) : null);
              }}
            />
            {imagePreview ? (
              <img className="image-preview" src={imagePreview} alt="Course preview" />
            ) : null}
          </div>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Creating…' : 'Create course'}
          </button>
        </form>
      </Modal>
      )}
    </>
  );
}

function CourseCard({ course, canEdit }: { course: Course; canEdit: boolean }) {
  const modules = Array.isArray(course.modules) ? course.modules.length : 0;

  const body = (
    <>
      <img
        className="course-card-image"
        src={course.imageUrl || BRAND_LOGO_URL}
        alt={`${course.name} cover image`}
      />
      <div className="course-card-body">
        <h3 className="course-card-title">{course.name || 'Untitled course'}</h3>
        <p className="course-card-description">
          {truncateText(course.description || '', 120)}
        </p>
        <div className="course-card-meta">
          <span>Author: {course.author || 'Unknown'}</span>
          <span className="course-card-category">{course.category || 'Uncategorised'}</span>
          <span>Updated: {formatDate(course.updatedAt)}</span>
          <span>
            {modules} module{modules === 1 ? '' : 's'}
          </span>
        </div>
      </div>
    </>
  );

  if (!canEdit) {
    return <article className="course-card course-card--readonly">{body}</article>;
  }

  return (
    <Link to={`/course/${course.id}`} className="course-card course-card-link">
      {body}
    </Link>
  );
}
