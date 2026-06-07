import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SlideRender } from '@/features/slides/SlideRender';
import { useSlideStageFit } from '@/hooks/useSlideStageFit';
import { fetchCourseForEmbed } from '@/lib/courses';
import { getSortedSlides } from '@/lib/slides';
import type { Slide } from '@/lib/types';

export function ViewerPage() {
  const [params] = useSearchParams();
  const courseId = params.get('courseId') ?? '';
  const moduleId = params.get('moduleId') ?? '';
  const token = params.get('token') ?? '';

  const [slides, setSlides] = useState<Slide[]>([]);
  const [courseName, setCourseName] = useState('Course');
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const slideRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void loadViewer();
  }, [courseId, moduleId, token]);

  useSlideStageFit(slideRef, !loading && !error && !isComplete, [
    activeSlideIndex,
    isComplete,
    loading,
    error,
    slides,
  ]);

  useEffect(() => {
    document.title = courseName;
  }, [courseName]);

  async function loadViewer() {
    if (!courseId || !moduleId || !token) {
      setError('Invalid module link. Course, module, and access token are required.');
      setLoading(false);
      return;
    }

    try {
      const course = await fetchCourseForEmbed(courseId, token);
      if (!course) {
        setError('Access denied. Invalid or expired module token.');
        setLoading(false);
        return;
      }

      const moduleData = course.modules.find((item) => item.id === moduleId);
      if (!moduleData) {
        setError('This module could not be found.');
        setLoading(false);
        return;
      }

      const sorted = getSortedSlides(moduleData);
      if (sorted.length === 0) {
        setError('This module has no slides yet.');
        setLoading(false);
        return;
      }

      setCourseName(course.name || 'Course');
      setSlides(sorted);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setError('Unable to load this module. Please try again later.');
      setLoading(false);
    }
  }

  function navigateSlide(direction: number) {
    if (isComplete && direction < 0) {
      setIsComplete(false);
      return;
    }

    const nextIndex = activeSlideIndex + direction;
    if (nextIndex < 0) return;

    if (nextIndex >= slides.length) {
      setIsComplete(true);
      return;
    }

    setActiveSlideIndex(nextIndex);
    setIsComplete(false);
  }

  if (loading) {
    return (
      <div className="viewer-app">
        <div className="viewer-loading">Loading module…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="viewer-app">
        <div className="viewer-error">{error}</div>
      </div>
    );
  }

  return (
    <div className="viewer-app">
      <div className="viewer-content">
        <div className="viewer-slide-shell" ref={slideRef}>
          {isComplete ? (
            <div className="viewer-complete">
              <h2>Module complete</h2>
              <p>You have finished all slides in this module.</p>
            </div>
          ) : (
            <SlideRender slide={slides[activeSlideIndex]} viewer interactive />
          )}
        </div>

        <nav className="viewer-nav">
        <button
          type="button"
          className="btn btn-secondary btn-small"
          disabled={!isComplete && activeSlideIndex === 0}
          onClick={() => navigateSlide(-1)}
        >
          {isComplete ? '← Review last slide' : '← Previous'}
        </button>
        <span className="viewer-slide-counter">
          {isComplete ? 'Complete' : `${activeSlideIndex + 1} / ${slides.length}`}
        </span>
        {!isComplete && (
          <button
            type="button"
            className="btn btn-primary btn-small"
            onClick={() => navigateSlide(1)}
          >
            {activeSlideIndex >= slides.length - 1 ? 'Finish' : 'Next →'}
          </button>
        )}
        </nav>
      </div>
    </div>
  );
}
