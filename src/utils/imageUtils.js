const getBackendBaseUrl = () => {
  const envBase = import.meta.env.VITE_API_BASE_URL;
  if (envBase && envBase.startsWith('http')) {
    return envBase.replace(/\/api\/?$/, '');
  }
  if (import.meta.env.VITE_API_TARGET) {
    return import.meta.env.VITE_API_TARGET;
  }
  return 'http://192.168.68.150:8000';
};

const DEFAULT_FOOD_IMAGE = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop&q=80';

export const getImageUrl = (input) => {
  if (!input) {
    return DEFAULT_FOOD_IMAGE;
  }

  let rawImg = null;

  // 1. If input is a food/dish object
  if (typeof input === 'object' && input !== null && !Array.isArray(input)) {
    const foodId = input.id || input.food_id;
    if (foodId) {
      try {
        const saved = JSON.parse(localStorage.getItem('foodie_dish_images') || '{}');
        const savedImg = saved[foodId] || saved[String(foodId)] || saved[Number(foodId)];
        if (savedImg) rawImg = savedImg;
      } catch (e) {}
    }

    if (!rawImg) {
      const imgArray = Array.isArray(input.images) ? input.images : (Array.isArray(input.food_images) ? input.food_images : null);
      if (imgArray && imgArray.length > 0) {
        const primary = imgArray.find(i => typeof i === 'object' && i?.is_primary) || imgArray[0];
        rawImg = typeof primary === 'string' ? primary : (primary?.image_url || primary?.image || primary?.image_path || primary?.url);
      }
    }

    if (!rawImg) {
      rawImg = input.image_url || input.image || input.image_path || input.img || input.photo || input.url || input.src || '';
    }
  } else if (Array.isArray(input) && input.length > 0) {
    const primary = input.find(i => typeof i === 'object' && i?.is_primary) || input[0];
    rawImg = typeof primary === 'string' ? primary : (primary?.image_url || primary?.image || primary?.image_path || primary?.url);
  } else if (typeof input === 'string') {
    if (input.startsWith('[') || input.startsWith('{')) {
      try {
        const parsed = JSON.parse(input);
        return getImageUrl(parsed);
      } catch (e) {
        rawImg = input;
      }
    } else {
      rawImg = input;
    }
  }

  if (typeof rawImg !== 'string' || rawImg.trim() === '' || rawImg === 'null' || rawImg === 'undefined' || rawImg === '[object Object]') {
    return DEFAULT_FOOD_IMAGE;
  }

  const trimmed = rawImg.trim();

  if (/^https?:\/\//i.test(trimmed) || /^data:image\//i.test(trimmed) || /^blob:/i.test(trimmed)) {
    return trimmed;
  }

  let cleanPath = trimmed.startsWith('/') ? trimmed.slice(1) : trimmed;

  if (cleanPath.startsWith('static/') || cleanPath.startsWith('assets/') || cleanPath.startsWith('images/')) {
    return `/${cleanPath}`;
  }

  if (!cleanPath.startsWith('media/')) {
    cleanPath = `media/${cleanPath}`;
  }

  return `${getBackendBaseUrl()}/${cleanPath}`;
};

export const compressImageFile = (file, maxWidth = 600, maxHeight = 400, quality = 0.75) => {
  return new Promise((resolve, reject) => {
    if (!file || !file.type?.startsWith('image/')) {
      return reject(new Error('Please select a valid image file.'));
    }
    const reader = new FileReader();
    reader.onerror = (err) => reject(err);
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = (err) => reject(err);
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const mimeType = file.type || 'image/jpeg';

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              const dataUrl = canvas.toDataURL(mimeType, quality);
              return resolve({ file, dataUrl, previewUrl: dataUrl });
            }
            const compressedFile = new File([blob], file.name || 'dish.jpg', {
              type: mimeType,
              lastModified: Date.now()
            });
            const dataUrl = canvas.toDataURL(mimeType, quality);
            const previewUrl = URL.createObjectURL(blob);
            resolve({
              file: compressedFile,
              blob: blob,
              dataUrl: dataUrl,
              previewUrl: previewUrl
            });
          },
          mimeType,
          quality
        );
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
};

export default getImageUrl;
