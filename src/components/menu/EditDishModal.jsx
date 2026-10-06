import React, { useState, useEffect, useRef } from 'react';
import api from '../../services/api';
import { getFrontendCategoryName } from '../../utils/categoryUtils';
import { compressImageFile } from '../../utils/imageUtils';
import { extractApiErrorMessage } from '../../utils/errorUtils';
import { menuService } from '../../services/menuService';
import Modal from '../common/Modal';
import Input from '../common/Input';
import Select from '../common/Select';
import Button from '../common/Button';

export const EditDishModal = ({
  isOpen,
  dish,
  onClose,
  onSave,
  pricingOnly = false
}) => {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [discountPrice, setDiscountPrice] = useState('');
  const [discountPercent, setDiscountPercent] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [foodType, setFoodType] = useState('veg');
  const [stock, setStock] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [image, setImage] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imageMode, setImageMode] = useState('file'); // 'file' | 'url'
  const fileInputRef = useRef(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const [categories, setCategories] = useState([]);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const catList = await menuService.getMenus();
        const mapped = (catList || [])
          .filter(c => c.status !== 'Inactive' && c.is_active !== false)
          .map(c => {
            const label = getFrontendCategoryName(c.name);
            return { value: label, label };
          });
        const unique = [];
        const seen = new Set();
        for (const cat of mapped) {
          if (!seen.has(cat.value)) {
            seen.add(cat.value);
            unique.push(cat);
          }
        }
        setCategories([{ value: '', label: 'Select a category' }, ...unique]);
      } catch (e) {
        console.error("Failed to load categories:", e);
      }
    };
    if (isOpen) {
      loadCategories();
    }
  }, [isOpen]);

  const foodTypes = [
    { value: 'veg', label: 'Vegetarian (Veg)' },
    { value: 'non-veg', label: 'Non-Vegetarian (Non-Veg)' },
    { value: 'vegan', label: 'Vegan' }
  ];

  const handleImageModeSwitch = (mode) => {
    if (mode === imageMode) return;
    setImageMode(mode);
    setImage('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleImageFileChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setErrorMsg('Please select a valid image file (PNG, JPG, JPEG, WEBP).');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setErrorMsg('Image file size must be less than 5MB.');
        return;
      }
      try {
        const compressed = await compressImageFile(file);
        const actualFile = compressed.file || file;
        const dataUrl = typeof compressed === 'string' ? compressed : (compressed.dataUrl || compressed.previewUrl || '');
        setImageFile(actualFile);
        setImage(dataUrl);
        setErrorMsg('');
      } catch (err) {
        console.error("Error compressing image:", err);
        setErrorMsg('Failed to process image file. Please try again.');
      }
    }
  };

  const handleRemoveImage = () => {
    setImage('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  useEffect(() => {
    if (dish && isOpen) {
      setName(dish.name || '');
      setPrice(dish.price !== undefined ? String(dish.price) : '');
      setDiscountPrice(dish.discountPrice !== undefined && dish.discountPrice > 0 ? String(dish.discountPrice) : '');
      setDiscountPercent(dish.discountPercent !== undefined && dish.discountPercent > 0 ? String(dish.discountPercent) : '');
      setDescription(dish.description || '');
      setCategory(dish.category || 'Main Course');
      setFoodType((dish.foodType || dish.type || 'veg').toLowerCase());
      setStock(dish.stock !== undefined ? String(dish.stock) : '20');
      setCalories(dish.calories !== undefined && dish.calories !== null ? String(dish.calories) : '');
      setProtein(dish.protein !== undefined && dish.protein !== null ? String(dish.protein) : '');
      const initialImg = dish.image || '';
      setImage(initialImg);
      setImageFile(null);
      setImageMode(initialImg.startsWith('data:') ? 'file' : (initialImg ? 'url' : 'file'));
      setErrorMsg('');
    }
  }, [dish, isOpen]);

  const handlePriceChange = (val) => {
    setPrice(val);
    const origPrice = parseFloat(val);
    const pct = parseFloat(discountPercent);
    if (!isNaN(origPrice) && origPrice > 0 && !isNaN(pct) && pct > 0) {
      const clampedPct = Math.min(100, Math.max(0, pct));
      const calculatedDiscPrice = Math.max(0, Math.round(origPrice * (1 - clampedPct / 100)));
      setDiscountPrice(String(calculatedDiscPrice));
    } else if (!val || isNaN(origPrice) || origPrice <= 0) {
      if (pct) setDiscountPrice('');
    }
  };

  const handleDiscountPercentChange = (val) => {
    let sanitizedVal = val;
    if (val !== '' && !isNaN(val)) {
      const num = parseFloat(val);
      if (num > 100) {
        sanitizedVal = '100';
      } else if (num < 0) {
        sanitizedVal = '0';
      }
    }
    setDiscountPercent(sanitizedVal);
    const pct = parseFloat(sanitizedVal);
    const origPrice = parseFloat(price);
    if (!isNaN(pct) && pct > 0 && !isNaN(origPrice) && origPrice > 0) {
      const clampedPct = Math.min(100, Math.max(0, pct));
      const calculatedDiscPrice = Math.max(0, Math.round(origPrice * (1 - clampedPct / 100)));
      setDiscountPrice(String(calculatedDiscPrice));
    } else if (sanitizedVal === '' || isNaN(pct) || pct <= 0) {
      setDiscountPrice('');
    }
  };

  const handleDiscountPriceChange = (val) => {
    setDiscountPrice(val);
    const discPrice = parseFloat(val);
    const origPrice = parseFloat(price);
    if (!isNaN(discPrice) && discPrice >= 0 && !isNaN(origPrice) && origPrice > 0) {
      if (discPrice >= origPrice) {
        setDiscountPercent('0');
      } else {
        const calculatedPct = Math.min(100, Math.max(0, Math.round(((origPrice - discPrice) / origPrice) * 100)));
        setDiscountPercent(String(calculatedPct));
      }
    } else if (val === '' || isNaN(discPrice) || discPrice <= 0) {
      setDiscountPercent('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!name.trim()) {
      setErrorMsg('Dish name is required.');
      return;
    }
    if (!category) {
      setErrorMsg('Please select a category.');
      return;
    }
    const origPrice = parseFloat(price);
    if (isNaN(origPrice) || origPrice < 0) {
      setErrorMsg('Price must be a positive number.');
      return;
    }
    
    let discPrice = parseFloat(discountPrice) || 0;
    let discPct = parseFloat(discountPercent) || 0;

    if (discPct > 100) {
      setErrorMsg('Discount percentage cannot exceed 100%.');
      return;
    }
    if (discPct < 0) {
      setErrorMsg('Discount percentage cannot be negative.');
      return;
    }

    if (discPct > 0 && discPrice === 0) {
      discPrice = Math.max(0, Math.round(origPrice * (1 - discPct / 100)));
    } else if (discPrice > 0 && origPrice > 0 && !discPct) {
      discPct = Math.min(100, Math.max(0, Math.round(((origPrice - discPrice) / origPrice) * 100)));
    }

    if (discPrice > 0 && discPrice > origPrice) {
      setErrorMsg('Discount price cannot be greater than original price.');
      return;
    }

    const stockNum = stock && stock.trim() !== '' ? parseInt(stock) : 100;
    if (isNaN(stockNum) || stockNum < 0) {
      setErrorMsg('Stock quantity must be a positive integer.');
      return;
    }

    let calNum = null;
    if (calories && calories.trim() !== '') {
      calNum = parseInt(calories);
      if (isNaN(calNum) || calNum < 0) {
        setErrorMsg('Calories must be a positive integer.');
        return;
      }
    }

    let protNum = null;
    if (protein && protein.trim() !== '') {
      protNum = parseInt(protein);
      if (isNaN(protNum) || protNum < 0) {
        setErrorMsg('Protein must be a positive integer.');
        return;
      }
    }

    setLoading(true);
    try {
      await onSave(dish.id, {
        name: name.trim(),
        price: origPrice,
        discountPrice: discPrice,
        discountPercent: discPct,
        description: description.trim(),
        category,
        type: foodType,
        foodType: foodType,
        stock: stockNum,
        calories: calNum,
        protein: protNum,
        image: image.trim(),
        imageFile: imageFile
      });
      setLoading(false);
      onClose();
    } catch (err) {
      console.error('Error updating dish:', err);
      const apiErr = extractApiErrorMessage(err, 'Unable to update dish. Please check the entered data.');
      setLoading(false);
      setErrorMsg(apiErr);
    }
  };

  const footerActions = (
    <>
      <Button variant="light" onClick={onClose} disabled={loading}>
        Cancel
      </Button>
      <Button variant="primary" onClick={handleSubmit} loading={loading}>
        Save Changes
      </Button>
    </>
  );

  return (
    <Modal isOpen={isOpen} title="Edit Dish Details" onClose={onClose} footerActions={footerActions}>
      <form onSubmit={handleSubmit}>
        {errorMsg && (
          <div className="alert alert-danger py-2 small fw-semibold mb-3">{errorMsg}</div>
        )}

        {!pricingOnly && (
          <Input 
            label="Dish Name" 
            placeholder="e.g. Garlic Bread sticks" 
            value={name} 
            onChange={(e) => setName(e.target.value)} 
            required 
          />
        )}
        
        <div className="row">
          <div className="col-4">
            <Input 
              label="Original Price (₹)" 
              type="number"
              placeholder="e.g. 199" 
              value={price} 
              onChange={(e) => handlePriceChange(e.target.value)} 
              required 
            />
          </div>
          <div className="col-4">
            <Input 
              label="Discount (%)" 
              type="number"
              min="0"
              max="100"
              placeholder="e.g. 25" 
              value={discountPercent} 
              onChange={(e) => handleDiscountPercentChange(e.target.value)} 
            />
          </div>
          <div className="col-4">
            <Input 
              label="Discount Price (₹)" 
              type="number"
              placeholder="e.g. 149" 
              value={discountPrice} 
              onChange={(e) => handleDiscountPriceChange(e.target.value)} 
            />
          </div>
        </div>

        {!pricingOnly && (
          <>
            <Input 
              label="Stock Quantity (Optional)" 
              type="number"
              placeholder="e.g. 50" 
              value={stock} 
              onChange={(e) => setStock(e.target.value)} 
            />

            <div className="row">
              <div className="col-6">
                <Input 
                  label="Calories (kcal) (Optional)" 
                  type="number"
                  placeholder="Enter calories (kcal)" 
                  value={calories} 
                  onChange={(e) => setCalories(e.target.value)} 
                />
              </div>
              <div className="col-6">
                <Input 
                  label="Protein (g) (Optional)" 
                  type="number"
                  placeholder="Enter protein (g)" 
                  value={protein} 
                  onChange={(e) => setProtein(e.target.value)} 
                />
              </div>
            </div>

            <Select 
              label="Category"
              options={categories}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            />

            <Select 
              label="Food Type (Veg / Non-Veg / Vegan)"
              options={foodTypes}
              value={foodType}
              onChange={(e) => setFoodType(e.target.value)}
            />

            <div className="mb-3 text-start">
              <label className="form-label text-secondary small fw-semibold mb-1">Food Image</label>
              <div className="d-flex p-1 bg-light rounded-3 border mb-2" role="group">
                <button
                  type="button"
                  className={`btn btn-sm flex-fill rounded-2 fw-semibold transition-all ${imageMode === 'file' ? 'bg-danger text-white shadow-xs' : 'text-secondary border-0 bg-transparent'}`}
                  style={{ fontSize: '12px' }}
                  onClick={() => handleImageModeSwitch('file')}
                >
                  📁 Choose File
                </button>
                <button
                  type="button"
                  className={`btn btn-sm flex-fill rounded-2 fw-semibold transition-all ${imageMode === 'url' ? 'bg-danger text-white shadow-xs' : 'text-secondary border-0 bg-transparent'}`}
                  style={{ fontSize: '12px' }}
                  onClick={() => handleImageModeSwitch('url')}
                >
                  🔗 Image URL
                </button>
              </div>

              {imageMode === 'file' ? (
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="form-control form-control-sm border-light-subtle"
                  onChange={handleImageFileChange}
                />
              ) : (
                <input
                  type="text"
                  className="form-control form-control-sm border-light-subtle"
                  placeholder="Paste image URL (e.g. https://...)"
                  value={image}
                  onChange={(e) => {
                    setImage(e.target.value);
                    setImageFile(null);
                  }}
                />
              )}

              {image && (
                <div className="d-flex align-items-center gap-2 mt-2 p-2 bg-light rounded-3 border">
                  <img 
                    src={image} 
                    alt="Preview" 
                    className="rounded-2 border bg-white" 
                    style={{ width: '48px', height: '48px', objectFit: 'cover' }}
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                  <div className="flex-grow-1 overflow-hidden">
                    <div className="small fw-semibold text-truncate text-dark" style={{ fontSize: '12px' }}>
                      {imageMode === 'file' ? 'Uploaded Image Selected' : image}
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="btn btn-sm btn-link text-danger p-0 text-decoration-none small fw-semibold"
                      style={{ fontSize: '11px' }}
                    >
                      Remove Image
                    </button>
                  </div>
                </div>
              )}
            </div>

            <Input 
              label="Description" 
              placeholder="Detail recipe ingredients" 
              value={description} 
              onChange={(e) => setDescription(e.target.value)} 
            />
          </>
        )}
      </form>
    </Modal>
  );
};

export default EditDishModal;
