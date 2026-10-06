import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import PageHeader from '../../components/layout/PageHeader';
import DishCard from '../../components/menu/DishCard';
import AddDishModal from '../../components/menu/AddDishModal';
import AddCategoryModal from '../../components/menu/AddCategoryModal';
import EditDishModal from '../../components/menu/EditDishModal';
import RenameCategoryModal from '../../components/menu/RenameCategoryModal';
import ConfirmModal from '../../components/common/ConfirmModal';
import Button from '../../components/common/Button';
import Loader from '../../components/common/Loader';
import EmptyState from '../../components/common/EmptyState';
import SearchBar from '../../components/common/SearchBar';
import Pagination from '../../components/common/Pagination';
import { productService, clearStaticProductCache } from '../../services/productService';
import { menuService } from '../../services/menuService';
import { useAuth } from '../../hooks/useAuth';
import { FiPlus, FiArrowLeft, FiGrid, FiLayers, FiEdit2, FiTrash2, FiCheckCircle } from 'react-icons/fi';
import { getFrontendCategoryName, normalizeCategoryName, isDishInCategory } from '../../utils/categoryUtils';

const ITEMS_PER_PAGE = 8;

export const MenuEditor = () => {
  const { menuId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [allMenus, setAllMenus] = useState([]);
  const [menu, setMenu] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(menuId || 'all');
  const [dishes, setDishes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [foodTypeFilter, setFoodTypeFilter] = useState('all'); // 'all' | 'veg' | 'non-veg' | 'vegan' | 'offers'
  const [currentPage, setCurrentPage] = useState(1);

  // Modals
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [comboMode, setComboMode] = useState(false);
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [editingDish, setEditingDish] = useState(null);
  const [deletingDishId, setDeletingDishId] = useState(null);
  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [targetCategoryToRename, setTargetCategoryToRename] = useState(null);
  const [deletingCategory, setDeletingCategory] = useState(null);

  // Reset to page 1 on filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search, foodTypeFilter, selectedCategory]);

  const fetchDetails = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const [menuData, dishData] = await Promise.all([
        menuService.getMenus(),
        productService.getProducts()
      ]);
      setAllMenus(menuData || []);
      setDishes(dishData || []);

      if (menuId && menuId !== 'all') {
        const matchedMenu = (menuData || []).find((m) =>
          String(m.id) === String(menuId) ||
          normalizeCategoryName(m.name) === normalizeCategoryName(menuId)
        );
        if (matchedMenu) {
          setMenu(matchedMenu);
          setSelectedCategory(matchedMenu.name);
        } else {
          setSelectedCategory(menuId);
        }
      } else {
        setSelectedCategory('all');
        setMenu(null);
      }
    } catch (e) {
      console.error("Error loading menu details:", e);
    }
    if (showLoading) setLoading(false);
  };

  const fetchDetailsSilently = async () => {
    try {
      const [menuData, dishData] = await Promise.all([
        menuService.getMenus(true),
        productService.getProducts(true)
      ]);
      setAllMenus(menuData || []);
      setDishes(dishData || []);
    } catch (e) {
      console.error("Error polling menu details:", e);
    }
  };

  useEffect(() => {
    fetchDetails();

    const handleSync = () => {
      fetchDetailsSilently();
    };

    const handleStorage = (e) => {
      if (
        e.key === 'foodie_inventory_sync_trigger' || 
        e.key === 'foodie_dish_stocks' ||
        e.key === 'foodie_products_updated' ||
        e.key === 'foodie_categories_updated'
      ) {
        fetchDetailsSilently();
      }
    };

    window.addEventListener('foodie_products_updated', handleSync);
    window.addEventListener('foodie_inventory_updated', handleSync);
    window.addEventListener('foodie_categories_updated', handleSync);
    window.addEventListener('foodie_orders_updated', handleSync);
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('foodie_products_updated', handleSync);
      window.removeEventListener('foodie_inventory_updated', handleSync);
      window.removeEventListener('foodie_categories_updated', handleSync);
      window.removeEventListener('foodie_orders_updated', handleSync);
      window.removeEventListener('storage', handleStorage);
    };
  }, [menuId]);

  const handleAddCategory = async (categoryData) => {
    if (!isAdmin) return;
    const created = await menuService.createMenu(categoryData);
    if (created && created.name) {
      setAllMenus(prev => {
        const norm = normalizeCategoryName(getFrontendCategoryName(created.name));
        const filtered = prev.filter(m => normalizeCategoryName(getFrontendCategoryName(m.name)) !== norm);
        return [...filtered, created];
      });
      setSelectedCategory(created.name);
    }
    await fetchDetails();
  };

  const handleAddDish = async (dishData) => {
    if (!isAdmin) return;
    const finalData = { ...dishData };
    if (comboMode || finalData.category === 'Combo Offer' || finalData.category === 'Combo Offers') {
      finalData.category = 'Combo Offer';
      try {
        const hasComboCat = (allMenus || []).some(m => {
          const norm = normalizeCategoryName(getFrontendCategoryName(m.name));
          return norm === 'combooffer' || norm === 'combooffers' || norm === 'combo';
        });
        if (!hasComboCat) {
          await menuService.createMenu({
            name: 'Combo Offer',
            description: 'Special Combo Offers & Deals',
            status: 'Active'
          });
        }
      } catch (e) {
        console.warn("Could not auto-create Combo Offer category:", e);
      }
    }
    await productService.createProduct(finalData);
    clearStaticProductCache();
    await fetchDetails();
  };

  const handleEditDish = async (id, dishData) => {
    if (!isAdmin) return;
    await productService.updateProduct(id, dishData);
    clearStaticProductCache();
    await fetchDetails();
  };

  const handleDeleteConfirm = async () => {
    if (!isAdmin) return;
    if (deletingDishId) {
      await productService.deleteProduct(deletingDishId);
      setDeletingDishId(null);
      fetchDetails();
    }
  };

  const handleRenameCategory = async (newName, newDescription) => {
    if (!isAdmin || !newName || !newName.trim()) return;
    const cleanNewName = newName.trim();
    const catToRename = targetCategoryToRename || currentCategoryObj || { name: currentCategoryName, originalName: currentCategoryName };

    try {
      setLoading(true);

      const oldNameNorm = normalizeCategoryName(catToRename?.name || currentCategoryName);
      const oldOrigNorm = normalizeCategoryName(catToRename?.originalName || currentCategoryName);

      // Save category description
      if (newDescription !== undefined) {
        try {
          const descMap = JSON.parse(localStorage.getItem('foodie_category_descriptions') || '{}');
          descMap[cleanNewName] = newDescription.trim();
          if (cleanNewName !== (catToRename?.name || currentCategoryName)) {
            delete descMap[catToRename?.name || currentCategoryName];
          }
          localStorage.setItem('foodie_category_descriptions', JSON.stringify(descMap));
        } catch (e) {}
      }

      // 1. Find all dishes belonging to this category
      const targetDishes = dishes.filter(d => {
        const dNorm = normalizeCategoryName(d.category);
        const dFeNorm = normalizeCategoryName(getFrontendCategoryName(d.category));
        return (catToRename?.id && Number(d.categoryId) === Number(catToRename.id)) ||
          dNorm === oldNameNorm || dFeNorm === oldNameNorm ||
          dNorm === oldOrigNorm || dFeNorm === oldOrigNorm;
      });

      // 2. Update category on backend if menu/category ID exists
      if (catToRename?.id && !isNaN(Number(catToRename.id))) {
        await menuService.updateMenu(catToRename.id, { 
          name: cleanNewName, 
          description: newDescription !== undefined ? newDescription.trim() : catToRename?.description, 
          status: 'Active' 
        });
      }

      // 3. Update category for each affected dish
      const savedCategories = JSON.parse(localStorage.getItem('foodie_dish_categories') || '{}');
      for (const d of targetDishes) {
        savedCategories[d.id] = cleanNewName;
        try {
          await productService.updateProduct(d.id, { category: cleanNewName });
        } catch (err) {
          console.error("Error updating product category:", err);
        }
      }
      localStorage.setItem('foodie_dish_categories', JSON.stringify(savedCategories));

      clearStaticProductCache();
      try {
        window.dispatchEvent(new CustomEvent('foodie_categories_updated'));
      } catch (e) {}
      setSelectedCategory(cleanNewName);
      await fetchDetails();
      navigate(`/admin/menus/${encodeURIComponent(cleanNewName)}`);
    } catch (e) {
      console.error("Error renaming category:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCategoryConfirm = async () => {
    if (!isAdmin || !deletingCategory) return;
    const catToDelete = deletingCategory;
    setDeletingCategory(null);
    try {
      setLoading(true);

      const targetId = catToDelete?.id || catToDelete?.name || currentCategoryName;
      const targetName = catToDelete?.name || catToDelete?.originalName || currentCategoryName;
      const oldNameNorm = normalizeCategoryName(targetName);
      const oldOrigNorm = normalizeCategoryName(catToDelete?.originalName || targetName);

      // 1. Delete category via menuService (handles backend DB and local storage persistence)
      await menuService.deleteMenu(targetId, targetName);

      // 2. Remove / reassign category for associated dishes in localStorage & backend
      const savedCategories = JSON.parse(localStorage.getItem('foodie_dish_categories') || '{}');
      const targetDishes = dishes.filter(d => {
        const dNorm = normalizeCategoryName(d.category);
        const dFeNorm = normalizeCategoryName(getFrontendCategoryName(d.category));
        return (catToDelete?.id && Number(d.categoryId) === Number(catToDelete.id)) ||
          dNorm === oldNameNorm || dFeNorm === oldNameNorm ||
          dNorm === oldOrigNorm || dFeNorm === oldOrigNorm;
      });

      for (const d of targetDishes) {
        delete savedCategories[d.id];
        delete savedCategories[String(d.id)];
        try {
          await productService.updateProduct(d.id, { category: 'Other' });
        } catch (err) {
          console.error("Error updating product category upon deletion:", err);
        }
      }
      localStorage.setItem('foodie_dish_categories', JSON.stringify(savedCategories));

      clearStaticProductCache();
      try {
        window.dispatchEvent(new CustomEvent('foodie_categories_updated'));
        window.dispatchEvent(new CustomEvent('foodie_products_updated'));
        localStorage.setItem('foodie_inventory_sync_trigger', Date.now().toString());
      } catch (e) {}

      setSelectedCategory('all');
      await fetchDetails();
      navigate('/admin/menus');
    } catch (e) {
      console.error("Error deleting category:", e);
    } finally {
      setLoading(false);
    }
  };

  // Derive unique categories from both menus and dishes
  const categoriesList = React.useMemo(() => {
    let deletedList = [];
    try {
      deletedList = JSON.parse(localStorage.getItem('foodie_deleted_categories') || '[]');
    } catch (e) {}

    const isDeleted = (name, origName, id) => {
      if (!deletedList || deletedList.length === 0) return false;
      const idStr = String(id !== undefined && id !== null ? id : '');
      const norm = normalizeCategoryName(name || '');
      const origNorm = normalizeCategoryName(origName || '');
      const feNorm = normalizeCategoryName(getFrontendCategoryName(name || ''));

      return deletedList.some(d => {
        const dStr = String(d);
        const dNorm = normalizeCategoryName(dStr);
        return dStr === idStr || dNorm === norm || dNorm === origNorm || dNorm === feNorm;
      });
    };

    const map = new Map();
    (allMenus || []).forEach(m => {
      const feName = getFrontendCategoryName(m.name);
      const norm = normalizeCategoryName(feName);
      if (!isDeleted(feName, m.name, m.id) && !map.has(norm)) {
        map.set(norm, { id: m.id, name: feName, originalName: m.name, description: m.description || '' });
      }
    });
    (dishes || []).forEach(d => {
      const cat = d.category || 'Other';
      const feName = getFrontendCategoryName(cat);
      const norm = normalizeCategoryName(feName);
      if (!isDeleted(feName, cat, d.categoryId) && !map.has(norm)) {
        map.set(norm, { id: norm, name: feName, originalName: cat });
      }
    });
    return Array.from(map.values());
  }, [allMenus, dishes]);

  const isAllSelected = !selectedCategory || selectedCategory === 'all' || selectedCategory === 'All';

  const currentCategoryObj = isAllSelected ? null : categoriesList.find(c =>
    String(c.id) === String(selectedCategory) ||
    normalizeCategoryName(c.name) === normalizeCategoryName(selectedCategory) ||
    normalizeCategoryName(c.originalName) === normalizeCategoryName(selectedCategory)
  );

  const currentCategoryName = isAllSelected ? 'All Categories' : (currentCategoryObj ? currentCategoryObj.name : selectedCategory);
  const currentNorm = normalizeCategoryName(currentCategoryName);

  // 1. Filter dishes that belong to selected category (or all if All)
  const menuDishes = dishes.filter((dish) => {
    if (isAllSelected) return true;
    return isDishInCategory(dish, currentCategoryObj || { name: currentCategoryName, originalName: currentCategoryName });
  });

  // Food type presence in current menu dishes
  const hasVegDishes = menuDishes.some(d => {
    const t = (d.foodType || d.type || 'veg').toLowerCase();
    return t === 'veg' || t === 'vegetarian';
  });

  const hasNonVegDishes = menuDishes.some(d => {
    const t = (d.foodType || d.type || '').toLowerCase();
    return t === 'non-veg' || t === 'nonveg' || t === 'non-vegetarian';
  });

  const hasVeganDishes = menuDishes.some(d => {
    const t = (d.foodType || d.type || '').toLowerCase();
    return t === 'vegan';
  });

  const hasOffersDishes = menuDishes.some(d => {
    return Boolean(d.hasDiscount || d.discountPercent > 0 || (d.discountPrice > 0 && d.discountPrice < d.price));
  });

  // Reset filter if selected food type has no dishes
  useEffect(() => {
    if (foodTypeFilter === 'veg' && !hasVegDishes) setFoodTypeFilter('all');
    else if (foodTypeFilter === 'non-veg' && !hasNonVegDishes) setFoodTypeFilter('all');
    else if (foodTypeFilter === 'vegan' && !hasVeganDishes) setFoodTypeFilter('all');
    else if (foodTypeFilter === 'offers' && !hasOffersDishes) setFoodTypeFilter('all');
  }, [hasVegDishes, hasNonVegDishes, hasVeganDishes, hasOffersDishes, foodTypeFilter]);

  // 2. Filter within menu dishes by Food Type / Offer and Search Term
  const filteredDishes = menuDishes.filter((dish) => {
    const dishFoodType = (dish.foodType || dish.type || 'veg').toLowerCase();
    let matchesFoodType = true;
    if (foodTypeFilter === 'veg') {
      matchesFoodType = dishFoodType === 'veg';
    } else if (foodTypeFilter === 'non-veg') {
      matchesFoodType = dishFoodType === 'non-veg';
    } else if (foodTypeFilter === 'vegan') {
      matchesFoodType = dishFoodType === 'vegan';
    } else if (foodTypeFilter === 'offers') {
      matchesFoodType = Boolean(dish.hasDiscount || dish.discountPercent > 0 || (dish.discountPrice > 0 && dish.discountPrice < dish.price));
    }

    const term = search.trim().toLowerCase();
    const matchesSearch = !term ||
      (dish.name && dish.name.toLowerCase().includes(term)) ||
      (dish.description && dish.description.toLowerCase().includes(term));

    return matchesFoodType && matchesSearch;
  });

  const totalPages = Math.ceil(filteredDishes.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedDishes = filteredDishes.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 150, behavior: 'smooth' });
  };

  const handleCategorySelect = (cat) => {
    if (cat === 'all') {
      setSelectedCategory('all');
      navigate('/admin/menus');
    } else {
      setSelectedCategory(cat.name);
      navigate(`/admin/menus/${cat.id}`);
    }
  };

  if (loading && dishes.length === 0) {
    return (
      <AdminLayout>
        <Loader />
      </AdminLayout>
    );
  }

  const hasCategories = categoriesList.length > 0;

  return (
    <AdminLayout>
      <PageHeader
        title={!hasCategories ? 'Add Category' : isAllSelected || !currentCategoryObj ? 'Add Menu' : `Add Menu — ${currentCategoryName}`}
        showBackButton
        backUrl="/admin/dashboard"
        actions={
          isAdmin && (
            <div className="d-flex align-items-center gap-2">
              <Button
                onClick={() => setIsAddCategoryOpen(true)}
                variant="outline"
                className="d-flex align-items-center gap-2 py-2 px-3 shadow-sm rounded-pill fw-bold"
              >
                <FiPlus /> Add Category
              </Button>

              {hasCategories && (
                <>
                  <Button
                    onClick={() => {
                      setIsAddOpen(true);
                      setComboMode(false);
                    }}
                    variant="outline"
                    className="d-flex align-items-center gap-2 py-2 px-3 shadow-sm rounded-pill fw-bold"
                  >
                    <FiPlus /> Add Dish
                  </Button>
                </>
              )}
            </div>
          )
        }
      />

      {/* Categories Selector Bar: Only Text, Highlighted When Active */}
      {hasCategories && (
        <div className="card rounded-3 border-0 shadow-sm p-3 mb-4 bg-white">
          <div className="d-flex align-items-center gap-2 flex-wrap">
            <span className="small fw-bold text-dark me-1" style={{ fontSize: '13px' }}>
              Categories:
            </span>

            <div className="d-flex align-items-center gap-2 overflow-auto py-1 flex-wrap" style={{ scrollbarWidth: 'thin' }}>
              {/* "All" Category Pill */}
              <button
                type="button"
                onClick={() => handleCategorySelect('all')}
                className={`btn btn-sm d-flex align-items-center gap-2 rounded-pill px-3.5 py-1.5 fw-bold transition-all border ${isAllSelected
                  ? 'bg-danger text-white border-danger shadow-sm'
                  : 'bg-light text-dark border-light-subtle shadow-xs'
                  }`}
                style={{ fontSize: '13px', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}
              >
                <span>All Categories</span>
                <span
                  className={`badge rounded-pill ms-1 ${isAllSelected ? 'bg-white text-danger fw-bold' : 'bg-white text-secondary border'
                    }`}
                  style={{ fontSize: '10px', padding: '2px 6px' }}
                >
                  {categoriesList.length}
                </span>
              </button>

              {/* Dynamic Category Text Pills */}
              {categoriesList.map((cat) => {
                const isSelected = !isAllSelected && (
                  String(cat.id) === String(selectedCategory) ||
                  normalizeCategoryName(cat.name) === currentNorm ||
                  normalizeCategoryName(cat.originalName) === currentNorm
                );

                const countInCat = dishes.filter(d => isDishInCategory(d, cat)).length;

                return (
                  <button
                    key={cat.id || cat.name}
                    type="button"
                    onClick={() => handleCategorySelect(cat)}
                    className={`btn btn-sm d-flex align-items-center gap-2 rounded-pill px-3.5 py-1.5 fw-bold transition-all border ${isSelected
                      ? 'bg-danger text-white border-danger shadow-sm'
                      : 'bg-light text-dark border-light-subtle shadow-xs'
                      }`}
                    style={{ fontSize: '13px', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}
                  >
                    <span>{cat.name}</span>
                    <span
                      className={`badge rounded-pill ms-1 ${isSelected ? 'bg-white text-danger fw-bold' : 'bg-white text-secondary border'
                        }`}
                      style={{ fontSize: '10px', padding: '2px 6px' }}
                    >
                      {countInCat}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Menu Info Banner: Only shown when category is selected and categories exist */}
      {hasCategories && !isAllSelected && currentCategoryObj && (
        <div className="card rounded-3 border-0 shadow-sm p-3 mb-4 bg-white">
          <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
            <div className="d-flex align-items-center gap-2 flex-wrap">
              <span
                className="badge bg-danger text-white fw-bold rounded-pill px-3 py-1.5 d-inline-flex align-items-center gap-1.5"
                style={{ fontSize: '12px' }}
              >
                <FiLayers className="me-1" />
                <span>Category: {currentCategoryName}</span>
              </span>
              <span className="badge bg-light text-dark border fw-semibold rounded-pill px-3 py-1.5" style={{ fontSize: '12px' }}>
                {menuDishes.length} Dishes in this Menu
              </span>
              <span className={`badge rounded-pill px-3 py-1.5 fw-semibold ${menu?.status === 'Active' ? 'bg-success-subtle text-success border border-success-subtle' : 'bg-secondary-subtle text-secondary'}`} style={{ fontSize: '12px' }}>
                Status: {menu?.status || 'Active'}
              </span>
            </div>

            {isAdmin && (
              <div className="d-flex align-items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setTargetCategoryToRename(currentCategoryObj || { name: currentCategoryName, originalName: currentCategoryName });
                    setIsRenameOpen(true);
                  }}
                  className="btn btn-sm btn-outline-danger d-flex align-items-center gap-1.5 py-1.5 px-3 rounded-pill fw-bold shadow-xs transition-all"
                  style={{ fontSize: '12px' }}
                  title={`Rename / Edit category "${currentCategoryName}"`}
                >
                  <FiEdit2 size={13} className="me-1" />
                  <span>Rename Category</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setDeletingCategory(currentCategoryObj || { name: currentCategoryName, originalName: currentCategoryName });
                  }}
                  className="btn btn-sm btn-outline-danger d-flex align-items-center gap-1.5 py-1.5 px-3 rounded-pill fw-bold shadow-xs transition-all bg-white text-danger border-danger"
                  style={{ fontSize: '12px' }}
                  title={`Delete category "${currentCategoryName}"`}
                >
                  <FiTrash2 size={13} className="me-1" />
                  <span>Delete Category</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Search and Food Type Filter Section */}
      {hasCategories && (dishes || []).length > 0 && menuDishes.length > 0 && (
        <div className="row g-3 align-items-center mb-4">
          <div className="col-12 col-md-6 col-lg-5">
            <SearchBar
              placeholder={`Search dishes in ${currentCategoryName}...`}
              value={search}
              onChange={setSearch}
              suggestions={(dishes || []).map(d => d.name)}
            />
          </div>
          <div className="col-12 col-md-6 col-lg-7 d-flex align-items-center gap-2">
            <span className="small fw-semibold text-secondary me-1 flex-shrink-0" style={{ fontSize: '13px' }}>Food Type:</span>

            <div className="d-flex align-items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setFoodTypeFilter('all')}
                className={`btn btn-sm rounded-pill px-3.5 py-1.5 fw-bold transition-all border ${foodTypeFilter === 'all'
                  ? 'bg-danger text-white border-danger shadow-sm'
                  : 'bg-white text-secondary border-light-subtle shadow-sm'
                  }`}
                style={{ fontSize: '12px', cursor: 'pointer' }}
              >
                All ({menuDishes.length})
              </button>

              {hasVegDishes && (
                <button
                  type="button"
                  onClick={() => setFoodTypeFilter('veg')}
                  className={`btn btn-sm d-flex align-items-center gap-2 rounded-pill px-3.5 py-1.5 fw-bold transition-all border ${foodTypeFilter === 'veg'
                    ? 'bg-success text-white border-success shadow-sm'
                    : 'bg-white text-secondary border-light-subtle shadow-sm'
                    }`}
                  style={{ fontSize: '12px', cursor: 'pointer' }}
                >
                  <span className="veg-badge me-1" style={{ backgroundColor: '#ffffff' }}></span>
                  <span>Veg</span>
                </button>
              )}

              {hasNonVegDishes && (
                <button
                  type="button"
                  onClick={() => setFoodTypeFilter('non-veg')}
                  className={`btn btn-sm d-flex align-items-center gap-2 rounded-pill px-3.5 py-1.5 fw-bold transition-all border ${foodTypeFilter === 'non-veg'
                    ? 'bg-danger text-white border-danger shadow-sm'
                    : 'bg-white text-secondary border-light-subtle shadow-sm'
                    }`}
                  style={{ fontSize: '12px', cursor: 'pointer' }}
                >
                  <span className="non-veg-badge me-1" style={{ backgroundColor: '#ffffff' }}></span>
                  <span>Non-Veg</span>
                </button>
              )}

              {hasVeganDishes && (
                <button
                  type="button"
                  onClick={() => setFoodTypeFilter('vegan')}
                  className={`btn btn-sm d-flex align-items-center gap-2 rounded-pill px-3.5 py-1.5 fw-bold transition-all border ${foodTypeFilter === 'vegan'
                    ? 'bg-success text-white border-success shadow-sm'
                    : 'bg-white text-secondary border-light-subtle shadow-sm'
                    }`}
                  style={{ fontSize: '12px', cursor: 'pointer' }}
                >
                  <span className="vegan-badge me-1" style={{ backgroundColor: '#ffffff' }}></span>
                  <span>Vegan</span>
                </button>
              )}

              {hasOffersDishes && (
                <button
                  type="button"
                  onClick={() => setFoodTypeFilter('offers')}
                  className={`btn btn-sm d-flex align-items-center gap-1 rounded-pill px-3.5 py-1.5 fw-bold transition-all border ${foodTypeFilter === 'offers'
                    ? 'bg-danger text-white border-danger shadow-sm'
                    : 'bg-white text-danger border-danger-subtle shadow-sm'
                    }`}
                  style={{ fontSize: '12px', cursor: 'pointer' }}
                >
                  <span>🔥 Offers</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Grid */}
      {filteredDishes.length === 0 ? (
        <EmptyState
          title={!hasCategories ? "No Categories Found" : isAllSelected ? "No Dishes in Menu" : `No Dishes in ${currentCategoryName}`}
          description={
            !hasCategories
              ? "You need to create at least one category before adding dishes to the menu."
              : search
              ? `No dishes matched "${search}" in this menu.`
              : isAllSelected
              ? "There are currently no dishes configured in the menu."
              : `There are currently no dishes configured in the ${currentCategoryName} category.`
          }
          icon={!hasCategories ? "bi-tags" : "bi-journal-x"}
        />
      ) : (
        <>
          <div className="row g-4">
            {paginatedDishes.map((dish) => (
              <div key={dish.id} className="col-12 col-sm-6 col-md-4 col-lg-3">
                <DishCard
                  dish={dish}
                  onEdit={() => setEditingDish(dish)}
                  onDelete={() => setDeletingDishId(dish.id)}
                  isAdmin={isAdmin}
                />
              </div>
            ))}
          </div>

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        </>
      )}

      {/* Add Category Modal */}
      {isAdmin && isAddCategoryOpen && (
        <AddCategoryModal
          isOpen={isAddCategoryOpen}
          onClose={() => setIsAddCategoryOpen(false)}
          onAdd={handleAddCategory}
        />
      )}

      {/* Add Dish Modal with defaultCategory preselected */}
      {isAdmin && isAddOpen && (
        <AddDishModal
          isOpen={isAddOpen}
          defaultCategory={comboMode ? 'Combo Offer' : currentCategoryName}
          onClose={() => setIsAddOpen(false)}
          onAdd={handleAddDish}
        />
      )}

      {/* Edit Dish Modal */}
      {isAdmin && editingDish && (
        <EditDishModal
          isOpen={!!editingDish}
          dish={editingDish}
          onClose={() => setEditingDish(null)}
          onSave={handleEditDish}
        />
      )}

      {/* Rename / Edit Category Modal */}
      {isAdmin && isRenameOpen && (
        <RenameCategoryModal
          isOpen={isRenameOpen}
          currentCategoryName={targetCategoryToRename?.name || currentCategoryName}
          currentCategoryDescription={targetCategoryToRename?.description || currentCategoryObj?.description || ''}
          onClose={() => {
            setIsRenameOpen(false);
            setTargetCategoryToRename(null);
          }}
          onSave={handleRenameCategory}
        />
      )}

      {/* Delete Category Confirmation Modal */}
      {isAdmin && deletingCategory && (
        <ConfirmModal
          isOpen={!!deletingCategory}
          title="Delete Category"
          message={`Are you sure you want to delete category "${deletingCategory.name}"? Dishes in this category will be moved to "Other". This action cannot be undone.`}
          confirmText="Delete Category"
          onConfirm={handleDeleteCategoryConfirm}
          onClose={() => setDeletingCategory(null)}
        />
      )}

      {/* Delete Dish Confirmation */}
      {isAdmin && deletingDishId && (
        <ConfirmModal
          isOpen={!!deletingDishId}
          title="Delete Dish"
          message="Are you sure you want to delete this dish from the menu? This action cannot be undone."
          onConfirm={handleDeleteConfirm}
          onClose={() => setDeletingDishId(null)}
        />
      )}
    </AdminLayout>
  );
};
export default MenuEditor;
