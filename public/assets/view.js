const params = new URLSearchParams(window.location.search);
const courseId = params.get('courseId');
const moduleId = params.get('moduleId');
const token = params.get('token');

let slides = [];
let activeSlideIndex = 0;
let isComplete = false;

const viewerLoading = document.getElementById('viewerLoading');
const viewerContent = document.getElementById('viewerContent');
const viewerError = document.getElementById('viewerError');
const viewerSlide = document.getElementById('viewerSlide');
const viewerComplete = document.getElementById('viewerComplete');
const viewerNav = document.getElementById('viewerNav');
const viewerSlideCounter = document.getElementById('viewerSlideCounter');
const viewerNextBtn = document.getElementById('viewerNextBtn');

if (!courseId || !moduleId || !token) {
  showViewerError('Invalid module link. Course, module, and access token are required.');
} else {
  loadViewer();
}

document.getElementById('viewerPrevBtn').addEventListener('click', () => navigateSlide(-1));
viewerNextBtn.addEventListener('click', () => navigateSlide(1));

const viewerResizeObserver = new ResizeObserver(() => scheduleFitViewerSlide());
viewerResizeObserver.observe(viewerSlide);

async function loadViewer() {
  try {
    const doc = await db.collection('courses').doc(courseId).get();

    if (!doc.exists) {
      showViewerError('This module could not be found.');
      return;
    }

    const course = doc.data();

    if (!course.embedToken || course.embedToken !== token) {
      showViewerError('Access denied. Invalid or expired module token.');
      return;
    }

    const modules = Array.isArray(course.modules) ? course.modules : [];
    const moduleData = modules.find((item) => item.id === moduleId);

    if (!moduleData) {
      showViewerError('This module could not be found.');
      return;
    }

    slides = getSortedSlides(moduleData);
    document.title = course.name || 'Course';

    viewerLoading.classList.add('hidden');

    if (slides.length === 0) {
      showViewerError('This module has no slides yet.');
      return;
    }

    viewerContent.classList.remove('hidden');
    renderSlideView();
  } catch (error) {
    console.error('Failed to load viewer:', error);
    showViewerError('Unable to load this module. Please try again later.');
  }
}

function renderSlideView() {
  if (isComplete) {
    viewerSlide.classList.add('hidden');
    viewerComplete.classList.remove('hidden');
    viewerSlideCounter.textContent = 'Complete';
    viewerNextBtn.classList.add('hidden');
    document.getElementById('viewerPrevBtn').textContent = '← Review last slide';
    document.getElementById('viewerPrevBtn').disabled = false;
    return;
  }

  viewerSlide.classList.remove('hidden');
  viewerComplete.classList.add('hidden');
  viewerNextBtn.classList.remove('hidden');

  if (activeSlideIndex >= slides.length) {
    activeSlideIndex = slides.length - 1;
  }

  renderSlide(slides[activeSlideIndex], viewerSlide, { interactive: true, viewer: true });
  scheduleFitViewerSlide();

  viewerSlide.querySelectorAll('img').forEach((img) => {
    if (!img.complete) {
      img.addEventListener('load', scheduleFitViewerSlide, { once: true });
    }
  });

  viewerSlideCounter.textContent = `${activeSlideIndex + 1} / ${slides.length}`;
  document.getElementById('viewerPrevBtn').textContent = '← Previous';
  document.getElementById('viewerPrevBtn').disabled = activeSlideIndex === 0;
  viewerNextBtn.textContent = activeSlideIndex === slides.length - 1 ? 'Finish' : 'Next →';
  viewerNextBtn.disabled = false;
}

function navigateSlide(direction) {
  if (isComplete) {
    if (direction < 0) {
      isComplete = false;
      renderSlideView();
    }
    return;
  }

  if (direction > 0 && activeSlideIndex === slides.length - 1) {
    isComplete = true;
    renderSlideView();
    return;
  }

  const nextIndex = activeSlideIndex + direction;
  if (nextIndex < 0 || nextIndex >= slides.length) {
    return;
  }

  activeSlideIndex = nextIndex;
  renderSlideView();
}

function showViewerError(message) {
  viewerLoading.classList.add('hidden');
  viewerContent.classList.add('hidden');
  viewerError.textContent = message;
  viewerError.classList.remove('hidden');
}

function scheduleFitViewerSlide() {
  requestAnimationFrame(() => {
    fitViewerSlide();
    requestAnimationFrame(fitViewerSlide);
  });
}

function fitViewerSlide() {
  const fit = viewerSlide.querySelector('.viewer-slide-fit');
  const scaleEl = viewerSlide.querySelector('.viewer-slide-scale');
  const slide = viewerSlide.querySelector('.slide-render-viewer');

  if (!fit || !scaleEl || !slide) {
    return;
  }

  scaleEl.style.transform = 'none';
  scaleEl.style.width = `${fit.clientWidth}px`;

  const availableWidth = fit.clientWidth;
  const availableHeight = fit.clientHeight;
  const contentWidth = slide.scrollWidth;
  const contentHeight = slide.scrollHeight;

  if (!availableWidth || !availableHeight || !contentWidth || !contentHeight) {
    return;
  }

  const scale = Math.min(1, availableWidth / contentWidth, availableHeight / contentHeight);
  scaleEl.style.transform = scale < 1 ? `scale(${scale})` : 'none';
  scaleEl.style.transformOrigin = 'center center';
}
