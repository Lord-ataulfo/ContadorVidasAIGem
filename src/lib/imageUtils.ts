/**
 * Resizes a base64 image to a maximum width or height while maintaining aspect ratio.
 * Also compresses the image to ensure it fits within Firestore's 1MB limit.
 */
export const resizeImage = (base64Str: string, maxWidth = 800, maxHeight = 800, quality = 0.7): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      // Calculate new dimensions
      if (width > height) {
        if (width > maxWidth) {
          height *= maxWidth / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width *= maxHeight / height;
          height = maxHeight;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      
      // Convert to base64 with compression
      const resizedBase64 = canvas.toDataURL('image/jpeg', quality);
      resolve(resizedBase64);
    };
    img.onerror = (error) => reject(error);
  });
};

/**
 * Checks if a base64 string is within a certain size limit in bytes.
 */
export const isBase64SizeValid = (base64Str: string, maxBytes = 800000): boolean => {
  // Rough estimation: base64 is ~4/3 the size of the binary data
  const stringLength = base64Str.length - (base64Str.indexOf(',') + 1);
  const sizeInBytes = (stringLength * 3) / 4;
  return sizeInBytes <= maxBytes;
};
