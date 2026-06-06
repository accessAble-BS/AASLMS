const params = new URLSearchParams(window.location.search);
const courseId = params.get('courseId');
const moduleId = params.get('moduleId');

let course = null;
let module = null;
let slides = [];
let activeSlideIndex = 0;

let editingSlide = null;
let editingSlideDraft = null;
let pendingColumnIndex = null;
let pendingBlockType = null;
let editingBlockId = null;

const courseInfoContainer = document.getElementById('courseInfoContainer');
const slideListEl = document.getElementById('slideList');
const emptySlidesEl = document.getElementById('emptySlides');
const slidePreviewEl = document.getElementById('slidePreview');
const slideNavEl = document.getElementById('slideNav');
const slideCounterEl = document.getElementById('slideCounter');

const layoutModal = document.getElementById('layoutModal');
const layoutGrid = document.getElementById('layoutGrid');
const slideEditorModal = document.getElementById('slideEditorModal');
const slideEditorColumns = document.getElementById('slideEditorColumns');
const componentTypeModal = document.getElementById('componentTypeModal');
const componentTypeGrid = document.getElementById('componentTypeGrid');
const blockFormModal = document.getElementById('blockFormModal');
const blockForm = document.getElementById('blockForm');
const blockFormFields = document.getElementById('blockFormFields');
const blockFormHeading = document.getElementById('blockFormHeading');
const blockFormError = document.getElementById('blockFormError');
const submitBlockBtn = document.getElementById('submitBlockBtn');

auth.onAuthStateChanged(async (user) => {
  if (!user) {
    window.location.href = '/';
    return;
  }

  if (!courseId || !moduleId) {
    window.location.href = '/dashboard';
    return;
  }

  await loadModule();
});

document.getElementById('logoutBtn').addEventListener('click', async () => {
  try {
    await auth.signOut();
    window.location.href = '/';
  } catch (error) {
    console.error('Logout failed:', error);
  }
});

initModal(layoutModal);
initModal(slideEditorModal);
initModal(componentTypeModal);
initModal(blockFormModal, {
  onClose: () => {
    pendingBlockType = null;
    editingBlockId = null;
    blockForm.reset();
    blockFormError.classList.remove('show');
    blockFormError.textContent = '';
  }
});

document.getElementById('addSlideBtn').addEventListener('click', openLayoutModal);
document.getElementById('prevSlideBtn').addEventListener('click', () => navigateSlide(-1));
document.getElementById('nextSlideBtn').addEventListener('click', () => navigateSlide(1));
document.getElementById('saveSlideEditorBtn').addEventListener('click', saveSlideEditor);
blockForm.addEventListener('submit', handleSaveBlock);

function openLayoutModal() {
  layoutGrid.innerHTML = '';

  LAYOUT_OPTIONS.forEach((layout) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'layout-card';

    const label = document.createElement('span');
    label.className = 'layout-card-label';
    label.textContent = layout.label;

    const description = document.createElement('span');
    description.className = 'layout-card-description';
    description.textContent = layout.description;

    const preview = document.createElement('span');
    preview.className = `layout-card-preview layout-preview-${layout.id}`;
    preview.setAttribute('aria-hidden', 'true');

    button.append(preview, label, description);
    button.addEventListener('click', () => {
      closeModal(layoutModal);
      const slide = createSlide(layout.id, slides.length);
      openSlideEditor(slide, true);
    });

    layoutGrid.appendChild(button);
  });

  openModal(layoutModal);
}

function openSlideEditor(slide, isNew = false) {
  editingSlide = slide;
  editingSlideDraft = JSON.parse(JSON.stringify(normalizeSlide(slide)));

  document.getElementById('slideEditorHeading').textContent = isNew
    ? 'Build slide'
    : `Edit slide ${activeSlideIndex + 1}`;

  renderSlideEditor();
  openModal(slideEditorModal);
}

function renderSlideEditor() {
  const columnCount = editingSlideDraft.columnCount === 2 ? 2 : 1;
  slideEditorColumns.className = `slide-editor-columns slide-editor-columns-${columnCount}`;
  slideEditorColumns.innerHTML = '';

  for (let columnIndex = 0; columnIndex < columnCount; columnIndex += 1) {
    const columnPanel = document.createElement('section');
    columnPanel.className = 'slide-editor-column';

    const header = document.createElement('div');
    header.className = 'slide-editor-column-header';

    const title = document.createElement('h3');
    title.textContent = columnCount === 2 ? `Column ${columnIndex + 1}` : 'Content';

    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'btn btn-secondary btn-small';
    addBtn.textContent = 'Add block';
    addBtn.addEventListener('click', () => openComponentTypeModal(columnIndex));

    header.append(title, addBtn);

    const blockList = document.createElement('ul');
    blockList.className = 'block-editor-list';

    const blocks = editingSlideDraft.columns[columnIndex]?.blocks || [];

    if (blocks.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'slide-column-empty';
      empty.textContent = 'No blocks yet';
      columnPanel.append(header, empty);
    } else {
      blocks.forEach((block, blockIndex) => {
        blockList.appendChild(createBlockEditorItem(block, columnIndex, blockIndex, blocks.length));
      });
      columnPanel.append(header, blockList);
    }

    slideEditorColumns.appendChild(columnPanel);
  }
}

function createBlockEditorItem(block, columnIndex, blockIndex, totalBlocks) {
  const item = document.createElement('li');
  item.className = 'block-editor-item';

  const info = document.createElement('div');
  info.className = 'block-editor-info';

  const type = document.createElement('span');
  type.className = 'block-editor-type';
  type.textContent = getComponentTypeLabel(block.type);

  const preview = document.createElement('span');
  preview.className = 'block-editor-preview';
  preview.textContent = getBlockPreviewText(block);

  info.append(type, preview);

  const actions = document.createElement('div');
  actions.className = 'block-editor-actions';
  actions.appendChild(createActionButton('Edit', ICONS.edit, () => openBlockForm(block.type, block, columnIndex)));
  actions.appendChild(createActionButton('Move up', '↑', () => moveBlock(columnIndex, blockIndex, -1), blockIndex === 0));
  actions.appendChild(createActionButton('Move down', '↓', () => moveBlock(columnIndex, blockIndex, 1), blockIndex === totalBlocks - 1));
  actions.appendChild(createActionButton('Delete', ICONS.delete, () => deleteBlock(columnIndex, block.id), false, true));

  item.append(info, actions);
  return item;
}

function createActionButton(label, icon, onClick, disabled = false, danger = false) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `btn-icon slide-list-icon${danger ? ' btn-icon-danger' : ''}`;
  button.setAttribute('aria-label', label);
  button.title = label;
  button.disabled = disabled;

  if (icon.startsWith('<')) {
    button.innerHTML = icon;
  } else {
    button.textContent = icon;
  }

  button.addEventListener('click', onClick);
  return button;
}

function openComponentTypeModal(columnIndex) {
  pendingColumnIndex = columnIndex;
  componentTypeGrid.innerHTML = '';

  getComponentTypeList().forEach((type) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'slide-type-card';

    const label = document.createElement('span');
    label.className = 'slide-type-label';
    label.textContent = type.label;

    const description = document.createElement('span');
    description.className = 'slide-type-description';
    description.textContent = type.description;

    button.append(label, description);
    button.addEventListener('click', () => {
      closeModal(componentTypeModal);
      openBlockForm(type.id, null, columnIndex);
    });

    componentTypeGrid.appendChild(button);
  });

  openModal(componentTypeModal);
}

function openBlockForm(type, block, columnIndex) {
  pendingColumnIndex = columnIndex;
  pendingBlockType = type;
  editingBlockId = block?.id || null;

  blockFormHeading.textContent = block
    ? `Edit ${getComponentTypeLabel(type)}`
    : `Add ${getComponentTypeLabel(type)}`;
  submitBlockBtn.textContent = block ? 'Save Changes' : 'Save Block';
  blockFormError.classList.remove('show');
  blockFormError.textContent = '';

  buildBlockFormFields(type, block?.content || {});
  openModal(blockFormModal);
}

function buildBlockFormFields(type, content) {
  blockFormFields.innerHTML = '';
  const meta = COMPONENT_TYPES[type];
  if (!meta) {
    return;
  }

  meta.fields.forEach((field) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'form-field';

    const label = document.createElement('label');
    label.htmlFor = `block-field-${field.key}`;
    label.textContent = field.label;
    wrapper.appendChild(label);

    let input;

    if (field.type === 'textarea' || field.type === 'lines') {
      input = document.createElement('textarea');
      input.rows = field.rows || 4;
      input.placeholder = field.placeholder || '';
      input.value = field.type === 'lines' ? linesToText(content[field.key]) : (content[field.key] || '');
    } else if (field.type === 'select') {
      input = document.createElement('select');
      field.options.forEach((option) => {
        const optionEl = document.createElement('option');
        optionEl.value = option.value;
        optionEl.textContent = option.label;
        input.appendChild(optionEl);
      });
      input.value = content[field.key] || field.options[0].value;
    } else if (field.type === 'image') {
      input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      if (field.required && !content.imageUrl) {
        input.required = true;
      }

      if (content.imageUrl) {
        const preview = document.createElement('img');
        preview.className = 'image-preview';
        preview.src = content.imageUrl;
        preview.alt = 'Current image';
        wrapper.appendChild(preview);
      }
    } else {
      input = document.createElement('input');
      input.type = 'text';
      input.placeholder = field.placeholder || '';
      input.value = content[field.key] || '';
    }

    input.id = `block-field-${field.key}`;
    input.name = field.key;
    if (field.required && field.type !== 'image') {
      input.required = true;
    }

    wrapper.appendChild(input);
    blockFormFields.appendChild(wrapper);
  });
}

async function handleSaveBlock(event) {
  event.preventDefault();
  blockFormError.classList.remove('show');
  blockFormError.textContent = '';

  const type = pendingBlockType;
  if (type === null || pendingColumnIndex === null || !editingSlideDraft) {
    return;
  }

  submitBlockBtn.disabled = true;
  submitBlockBtn.textContent = 'Saving...';

  try {
    const content = await collectBlockFormContent(type);
    const blocks = editingSlideDraft.columns[pendingColumnIndex].blocks;

    if (editingBlockId) {
      editingSlideDraft.columns[pendingColumnIndex].blocks = blocks.map((block) => (
        block.id === editingBlockId
          ? { ...block, type, content: normalizeBlockContent(type, content) }
          : block
      ));
    } else {
      blocks.push(createBlock(type, content));
    }

    closeModal(blockFormModal);
    pendingBlockType = null;
    editingBlockId = null;
    blockForm.reset();
    renderSlideEditor();
  } catch (error) {
    showBlockFormError(error.message || 'Could not save the block.');
  } finally {
    submitBlockBtn.disabled = false;
    submitBlockBtn.textContent = editingBlockId ? 'Save Changes' : 'Save Block';
  }
}

async function collectBlockFormContent(type) {
  const meta = COMPONENT_TYPES[type];
  const content = {};
  let existingBlock = null;

  if (editingBlockId) {
    const blocks = editingSlideDraft.columns[pendingColumnIndex]?.blocks || [];
    existingBlock = blocks.find((block) => block.id === editingBlockId);
  }

  for (const field of meta.fields) {
    const input = document.getElementById(`block-field-${field.key}`);
    if (!input) {
      continue;
    }

    if (field.type === 'image') {
      const file = input.files[0];
      if (file) {
        content.imageUrl = await prepareCourseImage(file);
      } else {
        content.imageUrl = existingBlock?.content?.imageUrl || '';
      }

      if (field.required && !content.imageUrl) {
        throw new Error('Please select an image.');
      }
      continue;
    }

    if (field.type === 'lines') {
      content[field.key] = splitLines(input.value);
      if (field.required && content[field.key].length === 0) {
        throw new Error(`Please add at least one ${field.label.toLowerCase()}.`);
      }
      continue;
    }

    content[field.key] = input.value.trim();

    if (field.required && !content[field.key]) {
      throw new Error(`Please complete the ${field.label.toLowerCase()} field.`);
    }
  }

  if (type === 'video' && !parseVideoEmbed(content.embedUrl)) {
    throw new Error('Please enter a valid YouTube or Vimeo URL.');
  }

  return content;
}

function moveBlock(columnIndex, blockIndex, direction) {
  const blocks = editingSlideDraft.columns[columnIndex].blocks;
  const targetIndex = blockIndex + direction;
  if (targetIndex < 0 || targetIndex >= blocks.length) {
    return;
  }

  const reordered = [...blocks];
  const [moved] = reordered.splice(blockIndex, 1);
  reordered.splice(targetIndex, 0, moved);
  editingSlideDraft.columns[columnIndex].blocks = reordered;
  renderSlideEditor();
}

function deleteBlock(columnIndex, blockId) {
  const confirmed = window.confirm('Delete this content block?');
  if (!confirmed) {
    return;
  }

  editingSlideDraft.columns[columnIndex].blocks = editingSlideDraft.columns[columnIndex].blocks
    .filter((block) => block.id !== blockId);
  renderSlideEditor();
}

async function saveSlideEditor() {
  const normalized = normalizeSlide(editingSlideDraft);
  const isNew = !slides.some((slide) => slide.id === normalized.id);

  if (isNew) {
    slides.push(normalized);
    activeSlideIndex = slides.length - 1;
  } else {
    slides = slides.map((slide) => (slide.id === normalized.id ? normalized : slide));
  }

  await persistSlides();
  closeModal(slideEditorModal);
  editingSlide = null;
  editingSlideDraft = null;
  renderSlideList();
  renderPreview();
}

async function loadModule() {
  courseInfoContainer.innerHTML = '<p class="loading-text">Loading module...</p>';

  try {
    const doc = await db.collection('courses').doc(courseId).get();
    if (!doc.exists) {
      window.location.href = '/dashboard';
      return;
    }

    course = { id: doc.id, ...doc.data() };
    module = getSortedModules(course).find((item) => item.id === moduleId);

    if (!module) {
      window.location.href = `/course?id=${encodeURIComponent(courseId)}`;
      return;
    }

    slides = getSortedSlides(module);
    const moduleName = module.name || 'Untitled module';

    document.title = `LMS - ${moduleName}`;
    document.getElementById('moduleHeaderTitle').textContent = moduleName;
    document.getElementById('backToCourseLink').href = `/course?id=${encodeURIComponent(courseId)}`;
    document.getElementById('backToCourseLink').textContent = `← ${course.name || 'Course'}`;

    renderCourseInfo();
    renderSlideList();
    renderPreview();
  } catch (error) {
    console.error('Failed to load module:', error);
    courseInfoContainer.innerHTML = '<p class="error-text">Unable to load this module.</p>';
  }
}

function renderCourseInfo() {
  courseInfoContainer.innerHTML = '';
  courseInfoContainer.appendChild(buildCourseInfoCard(course));
}

function renderSlideList() {
  slideListEl.innerHTML = '';

  if (slides.length === 0) {
    emptySlidesEl.classList.remove('hidden');
    return;
  }

  emptySlidesEl.classList.add('hidden');

  slides.forEach((slide, index) => {
    const normalized = normalizeSlide(slide);
    const item = document.createElement('li');
    item.className = `slide-list-item${index === activeSlideIndex ? ' active' : ''}`;

    const main = document.createElement('button');
    main.type = 'button';
    main.className = 'slide-list-main';

    const order = document.createElement('span');
    order.className = 'slide-list-order';
    order.textContent = String(index + 1);

    const layout = document.createElement('span');
    layout.className = 'slide-list-type';
    layout.textContent = getLayoutLabel(normalized.columnCount);

    const preview = document.createElement('span');
    preview.className = 'slide-list-preview';
    preview.textContent = getSlidePreviewText(normalized);

    main.append(order, layout, preview);
    main.addEventListener('click', () => {
      activeSlideIndex = index;
      renderSlideList();
      renderPreview();
    });

    const actions = document.createElement('div');
    actions.className = 'slide-list-actions';
    actions.appendChild(createActionButton('Edit slide', ICONS.edit, () => openSlideEditor(normalized)));
    actions.appendChild(createActionButton('Move up', '↑', () => moveSlide(index, -1), index === 0));
    actions.appendChild(createActionButton('Move down', '↓', () => moveSlide(index, 1), index === slides.length - 1));
    actions.appendChild(createActionButton('Delete slide', ICONS.delete, () => deleteSlide(normalized.id), false, true));

    item.append(main, actions);
    slideListEl.appendChild(item);
  });
}

function renderPreview() {
  if (slides.length === 0) {
    slidePreviewEl.innerHTML = '<p class="empty-state">Select or add a slide to preview it here.</p>';
    slidePreviewEl.className = 'slide-preview-shell';
    slideNavEl.classList.add('hidden');
    return;
  }

  if (activeSlideIndex >= slides.length) {
    activeSlideIndex = slides.length - 1;
  }

  slidePreviewEl.className = 'slide-preview-shell';
  renderSlide(slides[activeSlideIndex], slidePreviewEl, { interactive: true });

  slideNavEl.classList.remove('hidden');
  slideCounterEl.textContent = `${activeSlideIndex + 1} / ${slides.length}`;
  document.getElementById('prevSlideBtn').disabled = activeSlideIndex === 0;
  document.getElementById('nextSlideBtn').disabled = activeSlideIndex === slides.length - 1;
}

function navigateSlide(direction) {
  const nextIndex = activeSlideIndex + direction;
  if (nextIndex < 0 || nextIndex >= slides.length) {
    return;
  }

  activeSlideIndex = nextIndex;
  renderSlideList();
  renderPreview();
}

async function moveSlide(index, direction) {
  const targetIndex = index + direction;
  if (targetIndex < 0 || targetIndex >= slides.length) {
    return;
  }

  const reordered = [...slides];
  const [moved] = reordered.splice(index, 1);
  reordered.splice(targetIndex, 0, moved);
  slides = reordered.map((slide, order) => ({ ...normalizeSlide(slide), order }));

  if (activeSlideIndex === index) {
    activeSlideIndex = targetIndex;
  } else if (activeSlideIndex === targetIndex) {
    activeSlideIndex = index;
  }

  await persistSlides();
  renderSlideList();
  renderPreview();
}

async function deleteSlide(slideId) {
  const confirmed = window.confirm('Delete this slide and all of its content blocks?');
  if (!confirmed) {
    return;
  }

  slides = slides
    .filter((slide) => slide.id !== slideId)
    .map((slide, order) => ({ ...normalizeSlide(slide), order }));

  if (activeSlideIndex >= slides.length) {
    activeSlideIndex = Math.max(0, slides.length - 1);
  }

  await persistSlides();
  renderSlideList();
  renderPreview();
}

async function persistSlides() {
  const modules = getSortedModules(course).map((item) => (
    item.id === moduleId ? { ...item, slides } : item
  ));

  await db.collection('courses').doc(courseId).update({
    modules,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  });

  module = modules.find((item) => item.id === moduleId);
  course.modules = modules;
}

function showBlockFormError(message) {
  blockFormError.textContent = message;
  blockFormError.classList.add('show');
}
