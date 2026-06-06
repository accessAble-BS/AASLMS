const courseId = new URLSearchParams(window.location.search).get('id');
let course = null;

const courseInfoContainer = document.getElementById('courseInfoContainer');
const moduleListEl = document.getElementById('moduleList');
const emptyModulesEl = document.getElementById('emptyModules');
const editCourseModal = document.getElementById('editCourseModal');
const addModuleModal = document.getElementById('addModuleModal');
const editCourseForm = document.getElementById('editCourseForm');
const addModuleForm = document.getElementById('addModuleForm');
const editCourseError = document.getElementById('editCourseError');
const addModuleError = document.getElementById('addModuleError');
const editImageInput = document.getElementById('editCourseImage');
const editImagePreview = document.getElementById('editImagePreview');
const editCategoryList = document.getElementById('editCategoryList');
const submitEditCourseBtn = document.getElementById('submitEditCourseBtn');
const submitModuleBtn = document.getElementById('submitModuleBtn');

auth.onAuthStateChanged(async (user) => {
  if (!user) {
    window.location.href = '/';
    return;
  }

  if (!courseId) {
    window.location.href = '/dashboard';
    return;
  }

  await loadCourse();
});

document.getElementById('logoutBtn').addEventListener('click', async () => {
  try {
    await auth.signOut();
    window.location.href = '/';
  } catch (error) {
    console.error('Logout failed:', error);
  }
});

initModal(editCourseModal, { onClose: () => resetEditImagePreview() });
initModal(addModuleModal, {
  onClose: () => {
    addModuleForm.reset();
    addModuleError.classList.remove('show');
    addModuleError.textContent = '';
  }
});

document.getElementById('addModuleBtn').addEventListener('click', () => {
  addModuleError.classList.remove('show');
  addModuleError.textContent = '';
  openModal(addModuleModal);
});

editImageInput.addEventListener('change', () => {
  const file = editImageInput.files[0];
  if (!file) {
    resetEditImagePreview(true);
    return;
  }

  editImagePreview.src = URL.createObjectURL(file);
  editImagePreview.classList.remove('hidden');
});

editCourseForm.addEventListener('submit', handleEditCourse);
addModuleForm.addEventListener('submit', handleAddModule);
document.getElementById('importModulesBtn').addEventListener('click', handleImportModules);
document.getElementById('importFileInput').addEventListener('change', handleImportFile);

async function loadCourse() {
  courseInfoContainer.innerHTML = '<p class="loading-text">Loading course...</p>';
  moduleListEl.innerHTML = '';

  try {
    const doc = await db.collection('courses').doc(courseId).get();

    if (!doc.exists) {
      window.location.href = '/dashboard';
      return;
    }

    course = { id: doc.id, ...doc.data() };
    const courseName = course.name || 'Untitled course';
    document.title = `LMS - ${courseName}`;
    document.getElementById('courseHeaderTitle').textContent = courseName;

    await loadCategoryOptions();
    renderCourseInfo();
    renderModules();
  } catch (error) {
    console.error('Failed to load course:', error);
    courseInfoContainer.innerHTML = '<p class="error-text">Unable to load this course.</p>';
  }
}

function renderCourseInfo() {
  courseInfoContainer.innerHTML = '';
  courseInfoContainer.appendChild(
    buildCourseInfoCard(course, {
      onEdit: openEditCoursePanel,
      onDelete: handleDeleteCourse
    })
  );
}

function openEditCoursePanel() {
  document.getElementById('editCourseName').value = course.name || '';
  document.getElementById('editCourseDescription').value = course.description || '';
  document.getElementById('editCourseAuthor').value = course.author || '';
  document.getElementById('editCourseCategory').value = course.category || '';
  editImageInput.value = '';
  resetEditImagePreview(true);
  editCourseError.classList.remove('show');
  editCourseError.textContent = '';
  openModal(editCourseModal);
}

function renderModules() {
  const modules = getSortedModules(course);
  moduleListEl.innerHTML = '';

  if (modules.length === 0) {
    emptyModulesEl.classList.remove('hidden');
    return;
  }

  emptyModulesEl.classList.add('hidden');

  modules.forEach((module, index) => {
    const item = document.createElement('li');
    item.className = 'module-list-item';

    const order = document.createElement('span');
    order.className = 'module-order';
    order.textContent = String(index + 1);

    const content = document.createElement('div');
    content.className = 'module-content';

    const nameLink = document.createElement('a');
    nameLink.className = 'module-name module-name-link';
    nameLink.href = `/module?courseId=${encodeURIComponent(courseId)}&moduleId=${encodeURIComponent(module.id)}`;
    nameLink.textContent = module.name || 'Untitled module';

    const description = document.createElement('span');
    description.className = 'module-description';
    description.textContent = module.description || 'No description';

    content.append(nameLink, description);

    const meta = document.createElement('span');
    meta.className = 'module-meta';
    const slideCount = Array.isArray(module.slides) ? module.slides.length : 0;
    meta.textContent = `${slideCount} slide${slideCount === 1 ? '' : 's'}`;

    const actions = document.createElement('div');
    actions.className = 'module-list-actions';

    const viewLink = document.createElement('a');
    viewLink.className = 'btn btn-secondary btn-small';
    viewLink.href = getEmbedUrl(courseId, module.id, course.embedToken);
    viewLink.target = '_blank';
    viewLink.rel = 'noopener noreferrer';
    viewLink.textContent = 'View';

    const embedBtn = document.createElement('button');
    embedBtn.type = 'button';
    embedBtn.className = 'btn btn-secondary btn-small';
    embedBtn.textContent = 'Copy embed';
    embedBtn.addEventListener('click', () => copyEmbedCode(module));

    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'btn-icon btn-icon-danger';
    deleteBtn.setAttribute('aria-label', 'Delete module');
    deleteBtn.title = 'Delete module';
    deleteBtn.innerHTML = ICONS.delete;
    deleteBtn.addEventListener('click', () => handleDeleteModule(module));

    actions.append(viewLink, embedBtn, deleteBtn);
    item.append(order, content, meta, actions);
    moduleListEl.appendChild(item);
  });
}

async function copyEmbedCode(module) {
  const code = getEmbedIframeCode(courseId, module.id, course.embedToken);

  try {
    await navigator.clipboard.writeText(code);
    window.alert('Embed code copied to clipboard.');
  } catch (error) {
    window.prompt('Copy this embed code:', code);
  }
}

async function handleDeleteModule(module) {
  const confirmed = window.confirm(
    `Delete "${module.name}"? This will permanently remove the module and all of its slides.`
  );

  if (!confirmed) {
    return;
  }

  try {
    const modules = getSortedModules(course)
      .filter((item) => item.id !== module.id)
      .map((item, order) => ({ ...item, order }));

    await db.collection('courses').doc(courseId).update({
      modules,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    await loadCourse();
  } catch (error) {
    console.error('Failed to delete module:', error);
    window.alert('Could not delete this module. Please try again.');
  }
}

async function loadCategoryOptions() {
  const snapshot = await db.collection('courses').get();
  const categories = new Set();

  snapshot.docs.forEach((doc) => {
    const data = doc.data();
    if (data.category) {
      categories.add(data.category);
    }
  });

  editCategoryList.innerHTML = '';
  Array.from(categories)
    .sort((a, b) => a.localeCompare(b))
    .forEach((category) => {
      const option = document.createElement('option');
      option.value = category;
      editCategoryList.appendChild(option);
    });
}

async function handleEditCourse(e) {
  e.preventDefault();
  editCourseError.classList.remove('show');
  editCourseError.textContent = '';

  const name = document.getElementById('editCourseName').value;
  const description = document.getElementById('editCourseDescription').value;
  const author = document.getElementById('editCourseAuthor').value;
  const category = document.getElementById('editCourseCategory').value;
  const imageFile = editImageInput.files[0];

  submitEditCourseBtn.disabled = true;
  submitEditCourseBtn.textContent = 'Saving...';

  try {
    let imageUrl = null;
    if (imageFile) {
      imageUrl = await prepareCourseImage(imageFile);
    }

    const update = buildCourseUpdate({ name, description, author, category, imageUrl });
    await db.collection('courses').doc(courseId).update(update);

    closeModal(editCourseModal);
    resetEditImagePreview();
    await loadCourse();
  } catch (error) {
    console.error('Failed to update course:', error);
    showPanelError(editCourseError, error.message || 'Could not save changes. Please try again.');
  } finally {
    submitEditCourseBtn.disabled = false;
    submitEditCourseBtn.textContent = 'Save Changes';
  }
}

async function handleDeleteCourse() {
  const confirmed = window.confirm(
    `Delete "${course.name}"? This will permanently remove the course and all of its modules.`
  );

  if (!confirmed) {
    return;
  }

  try {
    await db.collection('courses').doc(courseId).delete();
    window.location.href = '/dashboard';
  } catch (error) {
    console.error('Failed to delete course:', error);
    window.alert('Could not delete this course. Please try again.');
  }
}

async function handleAddModule(e) {
  e.preventDefault();
  addModuleError.classList.remove('show');
  addModuleError.textContent = '';

  const name = document.getElementById('moduleName').value.trim();
  const description = document.getElementById('moduleDescription').value.trim();

  if (!name) {
    showPanelError(addModuleError, 'Please enter a module name.');
    return;
  }

  if (!description) {
    showPanelError(addModuleError, 'Please enter a module description.');
    return;
  }

  submitModuleBtn.disabled = true;
  submitModuleBtn.textContent = 'Creating...';

  try {
    const modules = getSortedModules(course);
    const newModule = createEmptyModule(name, description, modules.length);
    modules.push(newModule);

    await db.collection('courses').doc(courseId).update({
      modules,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    addModuleForm.reset();
    closeModal(addModuleModal);
    await loadCourse();
  } catch (error) {
    console.error('Failed to add module:', error);
    showPanelError(addModuleError, 'Could not create the module. Please try again.');
  } finally {
    submitModuleBtn.disabled = false;
    submitModuleBtn.textContent = 'Create Module';
  }
}

function resetEditImagePreview(keepCurrent) {
  editImageInput.value = '';
  if (keepCurrent && course?.imageUrl) {
    editImagePreview.src = course.imageUrl;
    editImagePreview.classList.remove('hidden');
    return;
  }

  editImagePreview.classList.add('hidden');
  editImagePreview.removeAttribute('src');
}

function showPanelError(element, message) {
  element.textContent = message;
  element.classList.add('show');
}

function handleImportFile(event) {
  const file = event.target.files[0];
  if (!file) {
    return;
  }

  const reader = new FileReader();
  reader.onload = (loadEvent) => {
    document.getElementById('importText').value = loadEvent.target.result;
  };
  reader.readAsText(file);
  event.target.value = '';
}

async function handleImportModules() {
  const importError = document.getElementById('importError');
  const importText = document.getElementById('importText').value.trim();
  const importBtn = document.getElementById('importModulesBtn');

  importError.classList.remove('show');
  importError.textContent = '';

  if (!importText) {
    showPanelError(importError, 'Paste or upload template content first.');
    return;
  }

  importBtn.disabled = true;
  importBtn.textContent = 'Importing...';

  try {
    const parsed = parseModuleImport(importText);
    const existing = getSortedModules(course);
    const imported = buildImportedModules(parsed, existing.length);
    const modules = [...existing, ...imported];

    await db.collection('courses').doc(courseId).update({
      modules,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    document.getElementById('importText').value = '';
    await loadCourse();
    window.alert(`Imported ${imported.length} module${imported.length === 1 ? '' : 's'} successfully.`);
  } catch (error) {
    console.error('Import failed:', error);
    showPanelError(importError, error.message || 'Could not import modules. Check the template format.');
  } finally {
    importBtn.disabled = false;
    importBtn.textContent = 'Import modules';
  }
}
