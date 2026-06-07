export function prepareCourseImage(file: File): Promise<string> {
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
        canvas.getContext('2d')!.drawImage(img, 0, 0, width, height);

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
      img.src = event.target?.result as string;
    };

    reader.onerror = () => reject(new Error('Could not read image file.'));
    reader.readAsDataURL(file);
  });
}
