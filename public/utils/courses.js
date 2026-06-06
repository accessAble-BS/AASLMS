/**
 * Course > Module data model
 *
 * Course (Firestore: courses/{courseId})
 *   - name, description, author, category, imageUrl (compressed JPEG data URL in Firestore)
 *   - updatedAt, embedToken (system-generated)
 *   - modules[] — ordered list of module wrappers
 *
 * Module (nested in course.modules[])
 *   - id, name, description, order
 *   - slides[] — { id, order, columnCount, columns: [{ blocks: [{ id, type, content }] }] }
 *
 * Workhub embed: /view?courseId={id}&moduleId={id}&token={embedToken}
 */

function generateEmbedToken() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

function createEmptyModule(name, description, order) {
  return {
    id: db.collection('courses').doc().id,
    name: name.trim(),
    description: description.trim(),
    order,
    slides: []
  };
}

function createCourseDocument({ name, description, author, category, imageUrl }) {
  return {
    name: name.trim(),
    description: description.trim(),
    author: author.trim(),
    category: category.trim(),
    imageUrl,
    modules: [],
    embedToken: generateEmbedToken(),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  };
}

function buildCourseUpdate({ name, description, author, category, imageUrl }) {
  const update = {
    name: name.trim(),
    description: description.trim(),
    author: author.trim(),
    category: category.trim(),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  };

  if (imageUrl) {
    update.imageUrl = imageUrl;
  }

  return update;
}

function getEmbedUrl(courseId, moduleId, embedToken) {
  const params = new URLSearchParams({ courseId, moduleId, token: embedToken });
  return `/view?${params.toString()}`;
}

function getAbsoluteEmbedUrl(courseId, moduleId, embedToken) {
  return `${window.location.origin}${getEmbedUrl(courseId, moduleId, embedToken)}`;
}

function getEmbedIframeCode(courseId, moduleId, embedToken) {
  const url = getAbsoluteEmbedUrl(courseId, moduleId, embedToken);
  return [
    '<div style="position:relative;width:100%;aspect-ratio:16/9;overflow:hidden;">',
    `  <iframe src="${url}" style="position:absolute;inset:0;width:100%;height:100%;border:0;" title="AAS LMS module" allowfullscreen loading="lazy"></iframe>`,
    '</div>'
  ].join('\n');
}

function prepareCourseImage(file) {
  const maxDimension = 640;
  const maxBytes = 400 * 1024;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      const img = new Image();

      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width >= height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);

        let quality = 0.85;
        let dataUrl = canvas.toDataURL('image/jpeg', quality);

        while (dataUrl.length > maxBytes && quality > 0.4) {
          quality -= 0.1;
          dataUrl = canvas.toDataURL('image/jpeg', quality);
        }

        if (dataUrl.length > maxBytes) {
          reject(new Error('Image is too large. Please choose a smaller image.'));
          return;
        }

        resolve(dataUrl);
      };

      img.onerror = () => reject(new Error('Invalid image file.'));
      img.src = event.target.result;
    };

    reader.onerror = () => reject(new Error('Could not read image file.'));
    reader.readAsDataURL(file);
  });
}
