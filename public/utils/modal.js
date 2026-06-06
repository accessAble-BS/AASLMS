function openModal(modalEl) {
  modalEl.classList.remove('hidden');
  document.body.classList.add('modal-open');

  const focusTarget = modalEl.querySelector('form input, form textarea, form select');
  if (focusTarget) {
    focusTarget.focus();
  }
}

function closeModal(modalEl) {
  modalEl.classList.add('hidden');

  if (!document.querySelector('.modal:not(.hidden)')) {
    document.body.classList.remove('modal-open');
  }
}

function initModal(modalEl, { onClose } = {}) {
  modalEl._onClose = onClose || null;

  modalEl.querySelectorAll('[data-modal-close]').forEach((el) => {
    el.addEventListener('click', () => {
      closeModal(modalEl);
      if (modalEl._onClose) {
        modalEl._onClose();
      }
    });
  });
}

document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') {
    return;
  }

  const openModalEl = document.querySelector('.modal:not(.hidden)');
  if (!openModalEl) {
    return;
  }

  closeModal(openModalEl);
  if (openModalEl._onClose) {
    openModalEl._onClose();
  }
});
