import { BRAND_LOGO_URL } from '@/lib/brand';
import { formatDate, getModuleCount } from '@/lib/courses';
import type { Course } from '@/lib/types';

type CourseInfoCardProps = {
  course: Course;
  onEdit?: () => void;
  onDelete?: () => void;
};

export function CourseInfoCard({ course, onEdit, onDelete }: CourseInfoCardProps) {
  const count = getModuleCount(course);

  return (
    <article className="card course-info-card">
      <img
        className="course-info-image"
        src={course.imageUrl || BRAND_LOGO_URL}
        alt={`${course.name || 'Course'} cover image`}
      />
      <div className="course-info-content">
        <div className="course-info-heading">
          <h1>{course.name || 'Untitled course'}</h1>
          {(onEdit || onDelete) && (
            <div className="course-info-actions">
              {onEdit ? (
                <button type="button" className="btn-icon" aria-label="Edit course" onClick={onEdit}>
                  ✎
                </button>
              ) : null}
              {onDelete ? (
                <button
                  type="button"
                  className="btn-icon btn-icon-danger"
                  aria-label="Delete course"
                  onClick={onDelete}
                >
                  🗑
                </button>
              ) : null}
            </div>
          )}
        </div>
        <p className="course-info-description">{course.description || ''}</p>
        <div className="course-info-meta">
          <span>Author: {course.author || 'Unknown'}</span>
          <span>Category: {course.category || 'Uncategorised'}</span>
          <span>Updated: {formatDate(course.updatedAt)}</span>
          <span>
            {count} module{count === 1 ? '' : 's'}
          </span>
        </div>
      </div>
    </article>
  );
}
