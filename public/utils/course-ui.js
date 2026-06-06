const ICONS = {
  edit: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 20h9"></path><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"></path></svg>`,
  delete: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M3 6h18"></path><path d="M8 6V4h8v2"></path><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path><path d="M10 11v6"></path><path d="M14 11v6"></path></svg>`,
  logout: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><path d="M16 17l5-5-5-5"></path><path d="M21 12H9"></path></svg>`
};

function createIconButton({ label, icon, variant, onClick }) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `btn-icon${variant === 'danger' ? ' btn-icon-danger' : ''}`;
  button.setAttribute('aria-label', label);
  button.title = label;
  button.innerHTML = icon;
  button.addEventListener('click', onClick);
  return button;
}

function formatDate(timestamp) {
  if (!timestamp) {
    return '—';
  }

  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

function buildCourseInfoCard(course, options = {}) {
  const { onEdit, onDelete } = options;
  const card = document.createElement('article');
  card.className = 'card course-info-card';

  const image = document.createElement('img');
  image.className = 'course-info-image';
  image.src = course.imageUrl || '/assets/brand/logo.png';
  image.alt = `${course.name || 'Course'} cover image`;

  const content = document.createElement('div');
  content.className = 'course-info-content';

  const heading = document.createElement('div');
  heading.className = 'course-info-heading';

  const title = document.createElement('h1');
  title.textContent = course.name || 'Untitled course';
  heading.appendChild(title);

  if (onEdit || onDelete) {
    const actions = document.createElement('div');
    actions.className = 'course-info-actions';

    if (onEdit) {
      actions.appendChild(createIconButton({
        label: 'Edit course',
        icon: ICONS.edit,
        onClick: onEdit
      }));
    }

    if (onDelete) {
      actions.appendChild(createIconButton({
        label: 'Delete course',
        icon: ICONS.delete,
        variant: 'danger',
        onClick: onDelete
      }));
    }

    heading.appendChild(actions);
  }

  const description = document.createElement('p');
  description.className = 'course-info-description';
  description.textContent = course.description || '';

  const meta = document.createElement('div');
  meta.className = 'course-info-meta';

  const author = document.createElement('span');
  author.textContent = `Author: ${course.author || 'Unknown'}`;

  const category = document.createElement('span');
  category.textContent = `Category: ${course.category || 'Uncategorised'}`;

  const updated = document.createElement('span');
  updated.textContent = `Updated: ${formatDate(course.updatedAt)}`;

  const modules = document.createElement('span');
  const count = getModuleCount(course);
  modules.textContent = `${count} module${count === 1 ? '' : 's'}`;

  meta.append(author, category, updated, modules);
  content.append(heading, description, meta);
  card.append(image, content);
  return card;
}

function getModuleCount(course) {
  return Array.isArray(course.modules) ? course.modules.length : 0;
}

function getSortedModules(course) {
  if (!Array.isArray(course.modules)) {
    return [];
  }

  return [...course.modules].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}
