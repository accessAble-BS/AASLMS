let allCourses = [];
let activeCategory = 'all';
let searchQuery = '';

const galleryEl = document.getElementById('courseGallery');
const emptyStateEl = document.getElementById('emptyState');
const categoryFilterEl = document.getElementById('categoryFilter');
const searchInput = document.getElementById('courseSearch');
const addCourseBtn = document.getElementById('addCourseBtn');
const addCourseModal = document.getElementById('addCourseModal');
const addCourseForm = document.getElementById('addCourseForm');
const addCourseError = document.getElementById('addCourseError');
const categoryList = document.getElementById('categoryList');
const imageInput = document.getElementById('courseImage');
const imagePreview = document.getElementById('imagePreview');
const submitCourseBtn = document.getElementById('submitCourseBtn');

auth.onAuthStateChanged(async (user) => {
  if (!user) {
    window.location.href = '/';
    return;
  }

  await loadCourses();
});

document.getElementById('logoutBtn').addEventListener('click', async () => {
  try {
    await auth.signOut();
    window.location.href = '/';
  } catch (error) {
    console.error('Logout failed:', error);
  }
});

searchInput.addEventListener('input', (e) => {
  searchQuery = e.target.value.trim().toLowerCase();
  renderCourses();
});

initModal(addCourseModal, { onClose: resetAddCourseForm });

addCourseBtn.addEventListener('click', () => {
  addCourseError.classList.remove('show');
  addCourseError.textContent = '';
  openModal(addCourseModal);
});

imageInput.addEventListener('change', () => {
  const file = imageInput.files[0];
  if (!file) {
    imagePreview.classList.add('hidden');
    imagePreview.removeAttribute('src');
    return;
  }

  imagePreview.src = URL.createObjectURL(file);
  imagePreview.classList.remove('hidden');
});

addCourseForm.addEventListener('submit', handleAddCourse);

async function loadCourses() {
  galleryEl.innerHTML = '<p class="loading-text">Loading courses...</p>';

  try {
    const snapshot = await db.collection('courses').orderBy('updatedAt', 'desc').get();
    allCourses = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data()
    }));

    updateCategoryOptions();
    renderCategoryFilter();
    renderCourses();
  } catch (error) {
    console.error('Failed to load courses:', error);
    galleryEl.innerHTML = '<p class="error-text">Unable to load courses. Please refresh the page.</p>';
  }
}

function getCategories() {
  const categories = new Set();
  allCourses.forEach((course) => {
    if (course.category) {
      categories.add(course.category);
    }
  });
  return Array.from(categories).sort((a, b) => a.localeCompare(b));
}

function updateCategoryOptions() {
  categoryList.innerHTML = '';
  getCategories().forEach((category) => {
    const option = document.createElement('option');
    option.value = category;
    categoryList.appendChild(option);
  });
}

function renderCategoryFilter() {
  const categories = getCategories();
  categoryFilterEl.innerHTML = '';

  const allChip = createCategoryChip('all', 'All', activeCategory === 'all');
  categoryFilterEl.appendChild(allChip);

  categories.forEach((category) => {
    categoryFilterEl.appendChild(
      createCategoryChip(category, category, activeCategory === category)
    );
  });
}

function createCategoryChip(value, label, isActive) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `category-chip${isActive ? ' active' : ''}`;
  button.dataset.category = value;
  button.textContent = label;
  button.addEventListener('click', () => {
    activeCategory = value;
    renderCategoryFilter();
    renderCourses();
  });
  return button;
}

function getFilteredCourses() {
  return allCourses.filter((course) => {
    const matchesCategory =
      activeCategory === 'all' || course.category === activeCategory;

    if (!matchesCategory) {
      return false;
    }

    if (!searchQuery) {
      return true;
    }

    const haystack = [
      course.name,
      course.description,
      course.author,
      course.category
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return haystack.includes(searchQuery);
  });
}

function renderCourses() {
  const filtered = getFilteredCourses();
  galleryEl.innerHTML = '';

  if (filtered.length === 0) {
    emptyStateEl.classList.remove('hidden');
    return;
  }

  emptyStateEl.classList.add('hidden');

  if (activeCategory === 'all' && !searchQuery) {
    const grouped = groupByCategory(filtered);
    Object.keys(grouped)
      .sort((a, b) => a.localeCompare(b))
      .forEach((category) => {
        const section = document.createElement('section');
        section.className = 'course-category-section';

        const heading = document.createElement('h2');
        heading.textContent = category;
        section.appendChild(heading);

        const grid = document.createElement('div');
        grid.className = 'course-gallery';
        grouped[category].forEach((course) => {
          grid.appendChild(createCourseCard(course));
        });

        section.appendChild(grid);
        galleryEl.appendChild(section);
      });
    return;
  }

  filtered.forEach((course) => {
    galleryEl.appendChild(createCourseCard(course));
  });
}

function groupByCategory(courses) {
  return courses.reduce((groups, course) => {
    const category = course.category || 'Uncategorised';
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(course);
    return groups;
  }, {});
}

function createCourseCard(course) {
  const card = document.createElement('a');
  card.className = 'course-card course-card-link';
  card.href = `/course?id=${encodeURIComponent(course.id)}`;

  const image = document.createElement('img');
  image.className = 'course-card-image';
  image.src = course.imageUrl || '/assets/brand/logo.png';
  image.alt = `${course.name} cover image`;

  const body = document.createElement('div');
  body.className = 'course-card-body';

  const title = document.createElement('h3');
  title.className = 'course-card-title';
  title.textContent = course.name || 'Untitled course';

  const description = document.createElement('p');
  description.className = 'course-card-description';
  description.textContent = truncateText(course.description || '', 120);

  const meta = document.createElement('div');
  meta.className = 'course-card-meta';

  const author = document.createElement('span');
  author.textContent = `Author: ${course.author || 'Unknown'}`;

  const category = document.createElement('span');
  category.className = 'course-card-category';
  category.textContent = course.category || 'Uncategorised';

  const updated = document.createElement('span');
  updated.textContent = `Updated: ${formatDate(course.updatedAt)}`;

  const moduleCount = document.createElement('span');
  const modules = Array.isArray(course.modules) ? course.modules.length : 0;
  moduleCount.textContent = `${modules} module${modules === 1 ? '' : 's'}`;

  meta.append(author, category, updated, moduleCount);
  body.append(title, description, meta);
  card.append(image, body);

  return card;
}

async function handleAddCourse(e) {
  e.preventDefault();
  addCourseError.classList.remove('show');
  addCourseError.textContent = '';

  const name = document.getElementById('courseName').value;
  const description = document.getElementById('courseDescription').value;
  const author = document.getElementById('courseAuthor').value;
  const category = document.getElementById('courseCategory').value;
  const imageFile = imageInput.files[0];

  if (!imageFile) {
    showFormError('Please select a course image.');
    return;
  }

  submitCourseBtn.disabled = true;
  submitCourseBtn.textContent = 'Creating...';

  try {
    const imageUrl = await prepareCourseImage(imageFile);
    const courseRef = db.collection('courses').doc();
    const courseData = createCourseDocument({
      name,
      description,
      author,
      category,
      imageUrl
    });

    await courseRef.set(courseData);

    resetAddCourseForm();
    closeModal(addCourseModal);
    await loadCourses();
  } catch (error) {
    console.error('Failed to create course:', error);
    showFormError(error.message || 'Could not create the course. Please try again.');
  } finally {
    submitCourseBtn.disabled = false;
    submitCourseBtn.textContent = 'Create Course';
  }
}

function resetAddCourseForm() {
  addCourseForm.reset();
  imagePreview.classList.add('hidden');
  imagePreview.removeAttribute('src');
  addCourseError.classList.remove('show');
  addCourseError.textContent = '';
}

function showFormError(message) {
  addCourseError.textContent = message;
  addCourseError.classList.add('show');
}

function truncateText(text, maxLength) {
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, maxLength).trim()}...`;
}

