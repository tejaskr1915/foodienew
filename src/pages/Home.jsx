import React, { useState, useEffect } from 'react';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import BottomNavigation from '../components/layout/BottomNavigation';
import CategoryCard from '../components/food/CategoryCard';
import FoodCard from '../components/food/FoodCard';
import EmptyState from '../components/common/EmptyState';
import Pagination from '../components/common/Pagination';
import { foodData } from '../data/foodData';
import useCategories from '../hooks/useCategories';
import { normalizeCategoryName } from '../utils/categoryUtils';

const ITEMS_PER_PAGE = 8;

const getCategoryEmoji = (name) => {
  const norm = (name || '').toLowerCase();
  if (norm === 'all') return '🍽️';
  if (norm === 'popular') return '⭐';
  if (norm.includes('discount') || norm.includes('offer')) return '🏷️';
  if (norm.includes('burger')) return '🍔';
  if (norm.includes('pizza')) return '🍕';
  if (norm.includes('biryani') || norm.includes('rice')) return '🍛';
  if (norm.includes('indian') || norm.includes('meal') || norm.includes('thali') || norm.includes('combo')) return '🍱';
  if (norm.includes('starter') || norm.includes('snack') || norm.includes('appetizer') || norm.includes('fry') || norm.includes('fries') || norm.includes('roll')) return '🍢';
  if (norm.includes('dessert') || norm.includes('sweet') || norm.includes('cake') || norm.includes('ice cream')) return '🍰';
  if (norm.includes('beverage') || norm.includes('drink') || norm.includes('coffee') || norm.includes('tea') || norm.includes('juice') || norm.includes('shake')) return '🥤';
  if (norm.includes('pasta') || norm.includes('noodle') || norm.includes('chinese')) return '🍜';
  if (norm.includes('soup') || norm.includes('salad')) return '🥗';
  return '🍽️';
};

export const Home = () => {
  const { categoryNames } = useCategories();
  const categoriesList = categoryNames.map(name => ({
    id: normalizeCategoryName(name) || name.toLowerCase(),
    name,
    icon: getCategoryEmoji(name)
  }));
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredDishes, setFilteredDishes] = useState(foodData);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    let result = foodData;

    if (selectedCategory === 'Popular') {
      let topIds = [];
      try {
        topIds = JSON.parse(localStorage.getItem('foodie_top_selling_ids') || '[]');
      } catch (e) {}
      if (topIds.length === 0) topIds = [1, 4, 7, 10, 13];
      result = result.filter((food) => topIds.includes(Number(food.id)));
    } else if (selectedCategory === 'Discount') {
      result = result.filter(
        (food) => Boolean(food.hasDiscount || (food.discountPercent && Number(food.discountPercent) > 0) || (food.discount && Number(food.discount) > 0) || (food.discountPrice && Number(food.discountPrice) > 0))
      );
    } else if (selectedCategory !== 'All') {
      result = result.filter(
        (food) => food.category.toLowerCase() === selectedCategory.toLowerCase()
      );
    }

    const query = searchQuery.trim().toLowerCase();
    if (query !== '') {
      result = result.filter(
        (food) =>
          (food.name || '').toLowerCase().includes(query) ||
          (food.description || '').toLowerCase().includes(query) ||
          (food.category || '').toLowerCase().includes(query)
      );
    }

    const isOutOfStock = (food) => {
      if (!food) return false;
      return (
        (food.stock !== undefined && Number(food.stock) <= 0) ||
        food.status === 'Out of Stock' ||
        food.status === 'OUT_OF_STOCK' ||
        food.is_available === false
      );
    };

    setFilteredDishes(result.filter((p) => !isOutOfStock(p)));
    setCurrentPage(1);
  }, [selectedCategory, searchQuery]);

  const totalPages = Math.ceil(filteredDishes.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedDishes = filteredDishes.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 380, behavior: 'smooth' });
  };

  if (foodData.length === 0) {
    return (
      <div className="d-flex flex-column min-vh-100 bg-light">
        <Header />
        <main className="container py-5 flex-grow-1 px-3">
          <EmptyState
            title="No Dishes Found"
            description="We couldn't find any dishes available right now. Please check back later!"
            icon="bi-emoji-frown"
          />
        </main>
        <Footer />
        <BottomNavigation />
      </div>
    );
  }

  return (
    <div className="d-flex flex-column min-vh-100 bg-light">
      <Header />

      <main className="container py-4 flex-grow-1 px-3">
        {/* Banner Section */}
        <div 
          className="p-4 rounded-4 mb-4 text-white d-flex align-items-center justify-content-between shadow-sm position-relative overflow-hidden"
          style={{ 
            background: 'linear-gradient(135deg, var(--primary-color) 0%, #d62d4a 100%)',
            height: '180px'
          }}
        >
          <div style={{ zIndex: 2 }}>
            <h2 className="fw-bold mb-1">Get 50% OFF</h2>
            <p className="mb-3 text-white-50">On your first order! Use code: FIRST50</p>
            <span className="bg-white text-danger fw-bold px-3 py-1.5 rounded-pill fs-6">
              Order Now
            </span>
          </div>
          <div className="d-none d-sm-block position-absolute bottom-0 end-0 me-4 mb-2 pulse-logo" style={{ zIndex: 1 }}>
            <i className="bi bi-gift text-white-50" style={{ fontSize: '130px' }}></i>
          </div>
        </div>

        {/* Search Bar */}
        <div className="row justify-content-center mb-4">
          <div className="col-12 col-md-8 col-lg-6">
            <div className="position-relative">
              <i className="bi bi-search position-absolute top-50 start-0 translate-middle-y text-muted ms-3 fs-5"></i>
              <input
                type="text"
                placeholder="Search food items..."
                className="form-control rounded-pill border-light shadow-sm py-2.5 ps-5 pe-4"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="btn btn-link position-absolute top-50 end-0 translate-middle-y text-muted text-decoration-none me-3"
                  type="button"
                >
                  <i className="bi bi-x-circle-fill"></i>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Categories Bar */}
        <div className="mb-4">
          <h5 className="fw-bold mb-3 text-dark">Menu Categories</h5>
          <div className="category-scroller">
            {categoriesList.map((cat) => (
              <CategoryCard
                key={cat.id}
                category={cat}
                isActive={selectedCategory.toLowerCase() === cat.name.toLowerCase()}
                onClick={() => setSelectedCategory(cat.name)}
              />
            ))}
          </div>
        </div>

        {/* Grid list */}
        <div className="mb-5">
          <div className="d-flex align-items-center justify-content-between mb-3">
            <h5 className="fw-bold mb-0 text-dark">Popular Dishes</h5>
            <span className="text-muted small fw-semibold">{filteredDishes.length} Items</span>
          </div>

          {filteredDishes.length > 0 ? (
            <>
              <div className="row g-4">
                {paginatedDishes.map((food) => (
                  <div key={food.id} className="col-12 col-sm-6 col-md-4 col-lg-3">
                    <FoodCard food={food} />
                  </div>
                ))}
              </div>

              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
              />
            </>
          ) : (
            <EmptyState
              title="No Dishes Found"
              description="We couldn't find any dishes matching your criteria. Try adjusting your search."
              icon="bi-search"
              buttonText="Reset Filters"
              onButtonClick={() => {
                setSelectedCategory('All');
                setSearchQuery('');
              }}
            />
          )}
        </div>
      </main>

      <Footer />
      <BottomNavigation />
    </div>
  );
};

export default Home;
