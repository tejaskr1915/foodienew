import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import CustomerLayout from '../../components/layout/CustomerLayout';
import useProducts from '../../hooks/useProducts';
import useCategories from '../../hooks/useCategories';
import FoodCard from '../../components/customer/FoodCard';
import Loader from '../../components/common/Loader';
import Pagination from '../../components/common/Pagination';
import { useAuth } from '../../hooks/useAuth';
import EmptyState from '../../components/common/EmptyState';
import {
  FiGrid, FiPieChart, FiHeart, FiLayers, FiZap, FiActivity, FiCoffee, FiDisc, FiStar, FiPercent,
  FiChevronLeft, FiChevronRight
} from 'react-icons/fi';
import { filterAndSortProducts, normalizeFoodType } from '../../utils/filters';
import { normalizeCategoryName } from '../../utils/categoryUtils';
import { orderService, isOrderOwnedByCustomer, getCustomerPhone } from '../../services/orderService';
import { useCart } from '../../hooks/useCart';
import { useSearchParams } from 'react-router-dom';
import { tableService } from '../../services/tableService';
import { couponService } from '../../services/couponService';
import OrderTypeModal from '../../components/customer/OrderTypeModal';
import SearchBar from '../../components/common/SearchBar';

const ITEMS_PER_PAGE = 12;

export const Home = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tableParam = searchParams.get('table');
  const qrParam = searchParams.get('qr');
  const { products, loading } = useProducts();
  const { categories: rawCategories, categoryNames: allCategories } = useCategories(products);

  const categories = allCategories.filter(cat => {
    if (cat === 'All') return true;
    if (cat === 'Discount' || cat === 'Offers') return false;
    return products?.some(p => {
      const c1 = normalizeCategoryName(p.category);
      const c2 = normalizeCategoryName(cat);
      if (c1 === c2) return true;
      if (cat === 'Popular' && p.is_popular) return true;
      return false;
    });
  });

  const { user, isAuthenticated } = useAuth();
  const { tableContext, setTable } = useCart();

  useEffect(() => {
    const hasActiveSession = isAuthenticated || sessionStorage.getItem('foodie_order_type') || sessionStorage.getItem('foodie_table') || tableParam || qrParam;
    if (!hasActiveSession) {
      const searchStr = window.location.search || '';
      navigate(`/customer/welcome${searchStr}`, { replace: true });
    }
  }, [isAuthenticated, navigate, tableParam, qrParam]);

  useEffect(() => {
    const target = tableParam || qrParam;
    if (target) {
      const canon = tableService.getCanonicalTableNumber(target);
      setTable({ tableNumber: canon, tableId: canon, diners: 2 });
    }
  }, [tableParam, qrParam, setTable]);

  const [selectedCategories, setSelectedCategories] = useState(['All']);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('DEFAULT');
  const [selectedFoodType, setSelectedFoodType] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [activeOrders, setActiveOrders] = useState([]);
  const [customerOrders, setCustomerOrders] = useState([]);
  const [activeBanner, setActiveBanner] = useState(null);

  useEffect(() => {
    const fetchBanners = async () => {
      try {
        const coupons = await couponService.getCoupons();
        const activeCoupon = coupons.find(c => c.status === 'Active');
        if (activeCoupon) {
          setActiveBanner(activeCoupon);
        }
      } catch (e) {
        console.error("Failed to fetch coupons for banner:", e);
      }
    };
    fetchBanners();
  }, []);

  const isEmployee = user?.role === 'employee' || user?.role === 'admin';

  const [showOrderTypeModal, setShowOrderTypeModal] = useState(() => {
    const savedType = sessionStorage.getItem('foodie_order_type') || localStorage.getItem('foodie_order_type');
    const hasTable = tableParam || qrParam;
    return !savedType && !hasTable;
  });

  const handleSelectOrderType = (type) => {
    setShowOrderTypeModal(false);
    sessionStorage.setItem('foodie_order_type', type);
    localStorage.setItem('foodie_order_type', type);
    if (type === 'TAKEAWAY') {
      const takeawayContext = { tableNumber: 'Takeaway', tableId: 'Takeaway', orderType: 'TAKEAWAY' };
      setTable(takeawayContext);
    } else {
      const canon = tableContext?.tableNumber || 'T01';
      setTable({ tableNumber: canon, tableId: canon, diners: 2, orderType: 'DINE_IN' });
    }
  };

  const isAllSelected = selectedCategories.includes('All') || selectedCategories.length === 0;

  const handleToggleCategory = (cat) => {
    setSelectedFoodType(null);
    setCurrentPage(1);

    if (cat === 'All') {
      setSelectedCategories(['All']);
      return;
    }

    setSelectedCategories(prev => {
      const isSelected = prev.includes(cat);
      if (isSelected) {
        const next = prev.filter(c => c !== cat);
        return next.length === 0 ? ['All'] : next;
      } else {
        const next = prev.filter(c => c !== 'All').concat(cat);
        return next;
      }
    });
  };

  const primarySelectedCategory = selectedCategories.length === 1 ? selectedCategories[0] : (isAllSelected ? 'All' : null);

  const activeCategoryObj = primarySelectedCategory ? rawCategories.find(c =>
    c.name === primarySelectedCategory ||
    normalizeCategoryName(c.name) === normalizeCategoryName(primarySelectedCategory) ||
    normalizeCategoryName(c.originalName) === normalizeCategoryName(primarySelectedCategory)
  ) : null;

  const activeCategoryDescription = primarySelectedCategory ? (
    activeCategoryObj?.description || (
      primarySelectedCategory === 'All' ? 'Explore our complete menu of freshly prepared foods and chef specials.' :
        primarySelectedCategory === 'Popular' ? 'Our most ordered and highest rated dishes loved by foodies.' :
          primarySelectedCategory === 'Discount' ? 'Special discount offers and meal deals available today.' : ''
    )
  ) : (
    selectedCategories.length > 1 ? `Showing dishes from: ${selectedCategories.join(', ')}` : ''
  );

  const sliderRef = useRef(null);
  const [scrollLeftPos, setScrollLeftPos] = useState(0);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const firstSelectedCat = selectedCategories[0] || 'All';
  const currentCategoryIdx = categories.findIndex(
    c => c === firstSelectedCat || normalizeCategoryName(c) === normalizeCategoryName(firstSelectedCat)
  );
  const isFirstCategory = currentCategoryIdx <= 0;
  const isLastCategory = currentCategoryIdx >= categories.length - 1;

  const checkScroll = () => {
    if (sliderRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = sliderRef.current;
      setScrollLeftPos(scrollLeft);
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 5);
    }
  };

  useEffect(() => {
    checkScroll();
  }, [categories, selectedCategories]);

  const showLeftArrow = !isFirstCategory || scrollLeftPos > 15;
  const showRightArrow = !isLastCategory || canScrollRight;

  const handlePrevCategory = () => {
    if (!categories || categories.length <= 1) return;
    const currentIdx = categories.findIndex(
      c => c === firstSelectedCat || normalizeCategoryName(c) === normalizeCategoryName(firstSelectedCat)
    );
    const validIdx = currentIdx >= 0 ? currentIdx : 0;
    if (validIdx <= 0) return;

    const prevIdx = validIdx - 1;
    const prevCat = categories[prevIdx];
    handleToggleCategory(prevCat);

    const pill = document.getElementById(`customer-cat-pill-${prevIdx}`);
    if (pill) {
      pill.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    } else if (sliderRef.current) {
      sliderRef.current.scrollBy({ left: -140, behavior: 'smooth' });
    }
  };

  const handleNextCategory = () => {
    if (!categories || categories.length <= 1) return;
    const currentIdx = categories.findIndex(
      c => c === firstSelectedCat || normalizeCategoryName(c) === normalizeCategoryName(firstSelectedCat)
    );
    const validIdx = currentIdx >= 0 ? currentIdx : 0;
    if (validIdx >= categories.length - 1) return;

    const nextIdx = validIdx + 1;
    const nextCat = categories[nextIdx];
    handleToggleCategory(nextCat);

    const pill = document.getElementById(`customer-cat-pill-${nextIdx}`);
    if (pill) {
      pill.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    } else if (sliderRef.current) {
      sliderRef.current.scrollBy({ left: 140, behavior: 'smooth' });
    }
  };

  // Keyboard navigation for < / , / ArrowLeft and > / . / ArrowRight
  useEffect(() => {
    const handleKeyDown = (e) => {
      const activeEl = document.activeElement;
      const isInputFocused = activeEl && (
        activeEl.tagName === 'INPUT' ||
        activeEl.tagName === 'TEXTAREA' ||
        activeEl.tagName === 'SELECT' ||
        activeEl.isContentEditable
      );
      if (isInputFocused) return;

      if (e.key === '>' || e.key === '.' || e.key === 'ArrowRight') {
        e.preventDefault();
        handleNextCategory();
      } else if (e.key === '<' || e.key === ',' || e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrevCategory();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [categories, selectedCategories]);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategories, sortBy, selectedFoodType, search]);

  // Dynamic food type availability across current loaded menu
  // Old hasVeg code removed

  useEffect(() => {
    let isMounted = true;

    const fetchActiveOrders = async () => {
      if (isEmployee) {
        if (isMounted) setActiveOrders([]);
        return;
      }
      try {
        const INACTIVE_STATUSES = ['completed', 'cancelled', 'canceled', 'cancel', 'done', 'settled', 'delivered', 'rejected', 'void', 'voided'];

        const currentCustomer = JSON.parse(localStorage.getItem('foodie_auth_customer') || sessionStorage.getItem('foodie_auth_customer') || '{}').user || user;
        const activePhone = getCustomerPhone() || currentCustomer?.phone || user?.phone;

        const orders = await orderService.getOrders(activePhone || 'GUEST', false).catch(() => []);

        const activeList = (orders || []).filter(ord => {
          if (!ord || (!ord.id && !ord.order_id)) return false;
          const st = String(ord.status || '').toLowerCase().trim();
          return !INACTIVE_STATUSES.includes(st) && isOrderOwnedByCustomer(ord, currentCustomer);
        });

        // Sort active orders newest first
        activeList.sort((a, b) => {
          const timeA = Number(a.placedAt || a.rawCreatedAt) || (a.created_at ? new Date(a.created_at).getTime() : 0) || (a.createdAt ? new Date(a.createdAt).getTime() : 0);
          const timeB = Number(b.placedAt || b.rawCreatedAt) || (b.created_at ? new Date(b.created_at).getTime() : 0) || (b.createdAt ? new Date(b.createdAt).getTime() : 0);
          if (timeA && timeB && timeA !== timeB) return timeB - timeA;
          const idA = parseInt(String(a.backendNumericId || a.id).replace(/\D/g, ''), 10) || 0;
          const idB = parseInt(String(b.backendNumericId || b.id).replace(/\D/g, ''), 10) || 0;
          return idB - idA;
        });

        if (isMounted) {
          setActiveOrders(activeList);
        }
      } catch (err) {
        if (isMounted) setActiveOrders([]);
      }
    };

    fetchActiveOrders();

    const handleSync = () => fetchActiveOrders();
    window.addEventListener('foodie_orders_updated', handleSync);
    window.addEventListener('storage', handleSync);

    return () => {
      isMounted = false;
      window.removeEventListener('foodie_orders_updated', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, [user, isEmployee]);

  const handleFoodTypeClick = (type) => {
    setSelectedFoodType((prev) => (prev === type ? null : type));
    setCurrentPage(1);
  };

  const getCategoryIcon = (category) => {
    const norm = (category || '').toLowerCase();
    if (norm === 'all') return <FiGrid size={14} />;
    if (norm === 'popular') return <FiStar size={14} />;
    if (norm.includes('discount') || norm.includes('offer')) return <FiPercent size={14} />;
    if (norm.includes('burger')) return <FiDisc size={14} />;
    if (norm.includes('pizza')) return <FiPieChart size={14} />;
    if (norm.includes('biryani') || norm.includes('rice')) return <FiHeart size={14} />;
    if (norm.includes('indian') || norm.includes('meal') || norm.includes('thali') || norm.includes('combo')) return <FiLayers size={14} />;
    if (norm.includes('starter') || norm.includes('snack') || norm.includes('appetizer') || norm.includes('fry') || norm.includes('fries') || norm.includes('roll')) return <FiZap size={14} />;
    if (norm.includes('dessert') || norm.includes('sweet') || norm.includes('cake') || norm.includes('ice cream') || norm.includes('pastry')) return <FiActivity size={14} />;
    if (norm.includes('beverage') || norm.includes('drink') || norm.includes('coffee') || norm.includes('tea') || norm.includes('juice') || norm.includes('shake') || norm.includes('soda') || norm.includes('mocktail')) return <FiCoffee size={14} />;
    if (norm.includes('pasta') || norm.includes('noodle') || norm.includes('chinese') || norm.includes('asian') || norm.includes('momo')) return <FiDisc size={14} />;
    if (norm.includes('soup') || norm.includes('salad')) return <FiHeart size={14} />;
    return <FiGrid size={14} />;
  };

  // First filter by category and search (without foodType filter)
  const baseFilteredDishes = filterAndSortProducts(products, {
    selectedCategories,
    category: primarySelectedCategory || 'All',
    search: search,
    sortBy
  });

  // Dynamic food type availability across current loaded menu AFTER filtering by category/search
  const hasVeg = baseFilteredDishes.some(p => normalizeFoodType(p.foodType || p.type || (p.is_veg === false || p.is_veg === 'false' ? 'non-veg' : 'veg')) === 'veg');
  const hasNonVeg = baseFilteredDishes.some(p => normalizeFoodType(p.foodType || p.type || (p.is_veg === false || p.is_veg === 'false' ? 'non-veg' : 'veg')) === 'non-veg');
  const hasVegan = baseFilteredDishes.some(p => normalizeFoodType(p.foodType || p.type || (p.is_veg === false || p.is_veg === 'false' ? 'non-veg' : 'veg')) === 'vegan');

  // When selected food type is no longer available, reset it
  useEffect(() => {
    if (selectedFoodType === 'non-veg' && !hasNonVeg) setSelectedFoodType(null);
    if (selectedFoodType === 'veg' && !hasVeg) setSelectedFoodType(null);
    if (selectedFoodType === 'vegan' && !hasVegan) setSelectedFoodType(null);
  }, [hasVeg, hasNonVeg, hasVegan, selectedFoodType]);

  const effectiveSelectedFoodTypes = selectedFoodType ? [selectedFoodType] : [];

  const filteredDishes = filterAndSortProducts(baseFilteredDishes, {
    selectedCategories: ['All'], // Already filtered by categories
    category: 'All', // Already filtered by category
    search: '', // Already filtered by search
    sortBy,
    selectedFoodTypes: effectiveSelectedFoodTypes
  });

  const totalPages = Math.ceil(filteredDishes.length / ITEMS_PER_PAGE);
  const paginatedDishes = filteredDishes.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  if (loading && (!products || products.length === 0)) {
    return (
      <CustomerLayout>
        <Loader />
      </CustomerLayout>
    );
  }

  // If menu item count is zero and loading finished, show blank Menu page with "No Dishes Found"
  if (!loading && (!products || products.length === 0)) {
    return (
      <CustomerLayout>
        <main className="px-3 pt-5 text-center">
          <EmptyState
            title="No Dishes Found"
            description="We couldn't find any dishes available on the menu."
            icon="bi-emoji-frown"
          />
        </main>
      </CustomerLayout>
    );
  }

  return (
    <CustomerLayout>
      <main className="px-1 pt-2">
        {/* Admin/Employee Table Ordering Bar */}
        {isEmployee && (
          <div className="card rounded-4 border-0 shadow-sm p-3 mb-4 text-white text-start" style={{ background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)' }}>
            <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
              <div className="d-flex align-items-center gap-2 flex-wrap">
                <span className="badge bg-danger text-white fw-bold rounded-pill px-3 py-1.5" style={{ fontSize: '11px' }}>
                  Taking Order
                </span>
                <span className="fw-bold fs-6 text-white">
                  Table {tableContext?.tableNumber ? (String(tableContext.tableNumber).startsWith('T') ? tableContext.tableNumber : `T0${tableContext.tableNumber}`) : 'T01'}
                </span>
                {tableContext?.diners && (
                  <span className="badge bg-secondary rounded-pill small" style={{ fontSize: '10px' }}>
                    {tableContext.diners} Diners
                  </span>
                )}
                <span className="text-white-50 small ms-1" style={{ fontSize: '12px' }}>
                  Select items below to build customer order
                </span>
              </div>
              <div className="d-flex align-items-center gap-2 flex-wrap ms-auto">
                <button
                  type="button"
                  onClick={() => navigate('/admin/tables')}
                  className="btn btn-sm btn-outline-light rounded-pill px-3 py-1.5 fw-bold"
                  style={{ fontSize: '12px' }}
                >
                  ← Back to Tables
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/customer/cart')}
                  className="btn btn-sm btn-danger rounded-pill px-3.5 py-1.5 fw-bold shadow-sm"
                  style={{ fontSize: '12px' }}
                >
                  Review Order / Cart →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Top Campaign Banner (Flat ₹50 OFF) */}
        {activeBanner && (
          <div
            className="rounded-4 p-3 p-sm-4 mb-4 text-white text-start position-relative overflow-hidden shadow-sm"
            style={{
              background: 'linear-gradient(135deg, var(--primary-color) 0%, var(--primary-dark) 100%)',
            }}
          >
            <span
              className="badge bg-white text-danger fw-bold rounded-pill px-3 py-1.5 mb-3"
              style={{ fontSize: '10px', color: 'var(--primary-color)' }}
            >
              OFFER OF THE DAY
            </span>
            <h2 className="fw-bold mb-1">{activeBanner.type === 'percentage' ? `Flat ${activeBanner.discount}% OFF` : `Flat ₹${activeBanner.discount} OFF`}</h2>
            <p className="small mb-0 opacity-90">
              Use code: <strong className="text-white">{activeBanner.code}</strong> | {activeBanner.description}
            </p>
          </div>
        )}

        {/* Active Live Orders List Section (shows right AFTER Flat ₹50 OFF banner) */}
        {!isEmployee && activeOrders && activeOrders.length > 0 && (
          <div className="d-flex flex-column gap-3 mb-4">
            {activeOrders.map((ord) => {
              const st = String(ord.status || '').toLowerCase().trim();
              let stText = 'Order Placed';
              let stBg = 'bg-danger text-white';

              if (['preparing', 'cooking', 'accepted', 'in_kitchen'].includes(st)) {
                stText = 'Preparing';
                stBg = 'bg-warning text-dark';
              } else if (['ready', 'prepared', 'out_for_delivery', 'ready_for_pickup'].includes(st)) {
                stText = 'Ready for Pickup';
                stBg = 'bg-info text-dark';
              } else if (['serving', 'served'].includes(st)) {
                stText = 'Serving to Table';
                stBg = 'bg-primary text-white';
              }

              return (
                <div
                  key={ord.id}
                  className="card rounded-4 border-0 shadow-sm p-3.5 text-white text-start"
                  style={{ background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)' }}
                >
                  <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
                    <div>
                      <div className="d-flex align-items-center gap-2 mb-1 flex-wrap">
                        <span className="badge bg-danger text-white fw-bold rounded-pill px-2.5 py-1" style={{ fontSize: '10px' }}>
                          Live Order #{ord.id}
                        </span>
                        <span className={`badge rounded-pill px-2.5 py-1 fw-bold ${stBg}`} style={{ fontSize: '10px' }}>
                          {stText}
                        </span>
                        <span className="small text-white opacity-90 fw-semibold" style={{ fontSize: '12px' }}>
                          Table {ord.table || 'Takeaway'}
                        </span>
                        {ord.items && ord.items.length > 0 && (
                          <span className="small text-white opacity-80" style={{ fontSize: '11px' }}>
                            • {ord.items.length} {ord.items.length === 1 ? 'item' : 'items'}
                          </span>
                        )}
                      </div>
                      <div className="small text-white-50">
                        Total Paid: <strong className="text-white">₹{ord.total || ord.total_amount}</strong>
                      </div>
                    </div>

                    <div className="d-flex align-items-center gap-2 flex-wrap ms-auto">
                      <button
                        type="button"
                        onClick={() => navigate(`/customer/order-tracking/${ord.id}`, { state: { order: ord } })}
                        className="btn btn-sm btn-danger rounded-pill px-3.5 py-1.5 fw-bold shadow-sm"
                        style={{ fontSize: '12px' }}
                      >
                        Track Order →
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Sticky Frozen Filter Header Container */}
        <div
          className="sticky-filter-header mb-4 py-3 px-3 rounded-4 shadow-sm bg-white border border-light-subtle text-start"
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 90,
            backdropFilter: 'blur(10px)',
            backgroundColor: 'rgba(255, 255, 255, 0.98)'
          }}
        >
          {/* Section: Search Dishes */}
          <div className="mb-3 w-100">
            <SearchBar
              placeholder={(!products || products.length === 0) ? "No dishes available to search" : "Search dishes (e.g. idli, pizza, burger)..."}
              value={search}
              onChange={(val) => { setSearch(val); setCurrentPage(1); }}
              disabled={!products || products.length === 0}
              suggestions={(products || []).map(p => p.name)}
              className="w-100"
            />
          </div>

          {/* Section: Browse Categories & Sorting */}
          <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-2">
            <h6 className="fw-bold text-dark mb-0 ms-1" style={{ fontSize: '14px' }}>Browse Categories</h6>

            {filteredDishes && filteredDishes.length > 0 && (
              <select
                value={sortBy}
                onChange={(e) => { setSortBy(e.target.value); setCurrentPage(1); }}
                className="form-select form-select-sm rounded-pill border-light shadow-sm text-secondary fw-semibold px-3 py-1.5 ms-auto"
                style={{ maxWidth: '185px', fontSize: '11px', cursor: 'pointer', backgroundColor: '#f8fafc' }}
                aria-label="Filter and sort options"
              >
                <option value="DEFAULT">Sort: All</option>
                <option value="HIGHEST_DISCOUNT">Highest Discount</option>
                <option value="PRICE_LOW_HIGH">Price: Low to High</option>
                <option value="PRICE_HIGH_LOW">Price: High to Low</option>
                <option value="DISCOUNT_ANY">Discount</option>
              </select>
            )}
          </div>

          <div className="position-relative mb-2 w-100">
            <div
              ref={sliderRef}
              id="customer-category-slider"
              onScroll={checkScroll}
              className="category-slider d-flex flex-nowrap gap-2 overflow-auto pb-1 px-1"
              style={{ scrollBehavior: 'smooth' }}
            >
              {categories.map((cat, idx) => {
                const isChecked = cat === 'All'
                  ? isAllSelected
                  : selectedCategories.includes(cat);
                const catObj = rawCategories.find(c => c.name === cat || normalizeCategoryName(c.name) === normalizeCategoryName(cat));
                const desc = catObj?.description || '';
                return (
                  <button
                    id={`customer-cat-pill-${idx}`}
                    key={cat}
                    type="button"
                    onClick={() => handleToggleCategory(cat)}
                    title={desc ? `${cat}: ${desc}` : cat}
                    className={`btn btn-sm d-flex align-items-center gap-2 rounded-pill px-3 py-2 fw-semibold transition-all ${isChecked ? 'btn-danger text-white shadow-sm' : 'btn-light text-secondary border'
                      }`}
                    style={{ fontSize: '12px', whiteSpace: 'nowrap', flexShrink: 0, cursor: 'pointer' }}
                  >
                    <span className="d-inline-flex align-items-center">{getCategoryIcon(cat)}</span>
                    <span>{cat}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Category Description Notice */}
          {activeCategoryDescription && (
            <div className="d-flex align-items-center gap-2 px-3 py-2 mb-2 rounded-3 bg-light border border-light-subtle text-start">
              <span className="badge bg-danger text-white fw-bold rounded-pill px-2.5 py-1 flex-shrink-0" style={{ fontSize: '10px' }}>
                {primarySelectedCategory || `${selectedCategories.length} Categories`}
              </span>
              <span className="text-secondary small fw-medium" style={{ fontSize: '11.5px', lineHeight: '1.4' }}>
                {activeCategoryDescription}
              </span>
            </div>
          )}

          {/* Food Type Clickable Filters - Visible when available in menu */}
          {(hasVeg || hasNonVeg || hasVegan) && (
            <div className="d-flex align-items-center gap-2 flex-wrap px-1 pt-2 border-top border-light-subtle w-100">
              <span className="small fw-semibold text-secondary me-1" style={{ fontSize: '12px' }}>Food Type:</span>

              {hasVeg && (
                <button
                  type="button"
                  onClick={() => handleFoodTypeClick('veg')}
                  className={`btn btn-sm d-flex align-items-center gap-1.5 rounded-pill px-3 py-1.5 fw-semibold transition-all border ${selectedFoodType === 'veg'
                    ? 'bg-success text-white border-success shadow-sm'
                    : 'bg-white text-dark border-light shadow-sm'
                    }`}
                  style={{ fontSize: '11px', cursor: 'pointer' }}
                >
                  <span className="veg-badge me-1" style={{ backgroundColor: '#ffffff' }}></span>
                  <span>Veg</span>
                </button>
              )}

              {hasNonVeg && (
                <button
                  type="button"
                  onClick={() => handleFoodTypeClick('non-veg')}
                  className={`btn btn-sm d-flex align-items-center gap-1.5 rounded-pill px-3 py-1.5 fw-semibold transition-all border ${selectedFoodType === 'non-veg'
                    ? 'bg-danger text-white border-danger shadow-sm'
                    : 'bg-white text-dark border-light shadow-sm'
                    }`}
                  style={{ fontSize: '11px', cursor: 'pointer' }}
                >
                  <span className="non-veg-badge me-1" style={{ backgroundColor: '#ffffff' }}></span>
                  <span>Non-Veg</span>
                </button>
              )}

              {hasVegan && (
                <button
                  type="button"
                  onClick={() => handleFoodTypeClick('vegan')}
                  className={`btn btn-sm d-flex align-items-center gap-1.5 rounded-pill px-3 py-1.5 fw-semibold transition-all border ${selectedFoodType === 'vegan'
                    ? 'text-white shadow-sm'
                    : 'bg-white text-dark border-light shadow-sm'
                    }`}
                  style={{
                    fontSize: '11px',
                    cursor: 'pointer',
                    backgroundColor: selectedFoodType === 'vegan' ? '#059669' : '#ffffff',
                    borderColor: selectedFoodType === 'vegan' ? '#059669' : undefined
                  }}
                >
                  <span className="vegan-badge me-1" style={{ backgroundColor: '#ffffff' }}></span>
                  <span>Vegan</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Section: Popular Dishes Grid */}
        <div className="mb-4">
          <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3 px-1">
            <div className="d-flex align-items-center gap-2">
              <h5 className="fw-bold text-dark mb-0">Menu Dishes</h5>
              <span className="text-secondary small fw-semibold">({filteredDishes.length} found)</span>
            </div>
          </div>

          {loading ? (
            <Loader />
          ) : filteredDishes.length === 0 ? (
            <EmptyState
              title="No Dishes Found"
              description="We couldn't find anything matching your filters. Try selecting another category or sort option!"
              icon="bi-emoji-frown"
              buttonText={(sortBy !== 'DEFAULT' || selectedFoodType !== null) ? "Back to Previous Sort" : undefined}
              onButtonClick={(sortBy !== 'DEFAULT' || selectedFoodType !== null) ? () => { setSortBy('DEFAULT'); setSelectedFoodType(null); } : undefined}
            />
          ) : (
            <>
              <div className="row g-3">
                {paginatedDishes.map((dish) => (
                  <div key={dish.id} className="col-12 col-sm-6 col-md-4 col-lg-3">
                    <FoodCard dish={dish} />
                  </div>
                ))}
              </div>

              {/* Pagination Component */}
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={(page) => {
                  setCurrentPage(page);
                  window.scrollTo({ top: 300, behavior: 'smooth' });
                }}
              />
            </>
          )}
        </div>
      </main>
      <OrderTypeModal isOpen={showOrderTypeModal} onSelectType={handleSelectOrderType} />
    </CustomerLayout>
  );
};

export default Home;
