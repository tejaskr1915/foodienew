import React, { createContext, useState, useEffect, useContext, useRef } from 'react';
import { orderService } from '../services/orderService';
import { tableService } from '../services/tableService';
import { getProductSellingPrice, calculateBillDetails, GST_RATE, DEFAULT_PACKING_CHARGE } from '../utils/pricing';
import { couponService, isFirstTimeCustomer } from '../services/couponService';
import { cartService } from '../services/cartService';
import { productService } from '../services/productService';
import { AuthContext } from './AuthContext';
import OutOfStockModal from '../components/common/OutOfStockModal';
import api from '../services/api';

const formatInstructions = (item) => {
  const parts = [];
  if (item.instructions && item.instructions.trim()) {
    parts.push(item.instructions.trim());
  }
  if (item.extraIngredients && item.extraIngredients.length > 0) {
    const ingText = item.extraIngredients.map(ing => `${ing.name} (+₹${ing.price})`).join(', ');
    parts.push(`Add-ons: ${ingText}`);
  }
  return parts.join(' | ');
};

const parseInstructions = (text) => {
  if (!text) {
    return { instructions: "", extraIngredients: [] };
  }

  const parts = text.split(' | ');
  let instructions = "";
  let extraIngredients = [];

  for (const part of parts) {
    if (part.startsWith('Add-ons: ')) {
      const ingPart = part.substring(9);
      const ingItems = ingPart.split(', ');
      for (const item of ingItems) {
        const match = item.match(/(.+?)\s*\(\+₹(\d+)\)/);
        if (match) {
          extraIngredients.push({
            name: match[1].trim(),
            price: parseInt(match[2])
          });
        }
      }
    } else {
      instructions = part;
    }
  }

  return { instructions, extraIngredients };
};

export const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState([]);
  const [tableContext, setTableContext] = useState(null); // { tableNumber, tableId }
  const [coupon, setCoupon] = useState(null); // { code, discount }
  const [orderLogs, setOrderLogs] = useState([]);
  const [outOfStockModalData, setOutOfStockModalData] = useState(null);
  const { user } = useContext(AuthContext);
  const deletingIdsRef = useRef(new Set());
  const prevUserIdRef = useRef(user ? (user.phone ? String(user.phone).replace(/\D/g, '').slice(-10) : String(user.id || user.email || 'user')) : 'guest');

  const getCartStorageKey = (currentUser, ctx = tableContext) => {
    if (!currentUser) return 'foodie_guest_cart';
    const id = currentUser.phone ? String(currentUser.phone).replace(/\D/g, '').slice(-10) : (currentUser.id || currentUser.email || 'user');
    const baseKey = `foodie_cart_${id}`;
    
    if (currentUser.role === 'admin' || currentUser.role === 'employee') {
      const tId = ctx?.tableId || ctx?.tableNumber || 'default';
      return `${baseKey}_table_${tId}`;
    }
    
    return baseKey;
  };

  const saveCartToStorage = (items, targetUser = user) => {
    const key = getCartStorageKey(targetUser);
    sessionStorage.setItem(key, JSON.stringify(items));
    sessionStorage.setItem('foodie_cart', JSON.stringify(items));
    if (!targetUser) {
      sessionStorage.setItem('foodie_guest_cart_temp', JSON.stringify(items));
      sessionStorage.setItem('foodie_guest_cart', JSON.stringify(items));
    }
  };

  useEffect(() => {
    const key = getCartStorageKey(user);
    const savedCart = sessionStorage.getItem(key) || (!user ? (sessionStorage.getItem('foodie_guest_cart_temp') || sessionStorage.getItem('foodie_guest_cart') || sessionStorage.getItem('foodie_cart')) : null);
    const savedTable = sessionStorage.getItem('foodie_table') || localStorage.getItem('foodie_table');
    if (savedCart) {
      try {
        setCartItems(JSON.parse(savedCart));
      } catch (e) { }
    } else {
      setCartItems(prev => prev.length === 0 ? prev : []);
    }

    if (savedTable) {
      try {
        setTableContext(JSON.parse(savedTable));
      } catch (e) { }
    }

    const handleLogout = () => {
      setCartItems(prev => prev.length === 0 ? prev : []);
      setCoupon(null);
      sessionStorage.removeItem('foodie_cart');
      sessionStorage.removeItem('foodie_guest_cart');
      localStorage.removeItem('foodie_guest_cart');
      sessionStorage.removeItem('foodie_guest_cart_temp');
      localStorage.removeItem('foodie_guest_cart_temp');
      sessionStorage.removeItem('foodie_guest_cart_unmerged');
      localStorage.removeItem('foodie_guest_cart_unmerged');
      if (user) {
        sessionStorage.removeItem(getCartStorageKey(user));
      }
    };
    window.addEventListener('foodie_logout', handleLogout);
    return () => {
      window.removeEventListener('foodie_logout', handleLogout);
    };
  }, []);

  // Synchronize cart items with backend database when user logs in / changes
  useEffect(() => {
    const currentIdentity = user ? (user.phone ? String(user.phone).replace(/\D/g, '').slice(-10) : String(user.id || user.email || 'user')) : 'guest';
    const isInitialAuthLoad = prevUserIdRef.current === 'guest' && currentIdentity !== 'guest';
    const isUserSwitch = prevUserIdRef.current !== undefined && prevUserIdRef.current !== currentIdentity && !isInitialAuthLoad;
    prevUserIdRef.current = currentIdentity;

    let unmergedGuestItems = [];
    if (!user || user.role === 'customer') {
      try {
        const savedUnmerged = sessionStorage.getItem('foodie_guest_cart_unmerged') ||
          localStorage.getItem('foodie_guest_cart_unmerged') ||
          sessionStorage.getItem('foodie_guest_cart_temp') ||
          localStorage.getItem('foodie_guest_cart_temp') ||
          sessionStorage.getItem('foodie_guest_cart') ||
          localStorage.getItem('foodie_guest_cart');
        if (savedUnmerged) {
          const parsed = JSON.parse(savedUnmerged);
          if (Array.isArray(parsed) && parsed.length > 0) {
            unmergedGuestItems = parsed;
          }
        }
      } catch (e) { }
    }

    if (isUserSwitch && unmergedGuestItems.length === 0) {
      sessionStorage.removeItem('foodie_cart');
      if (user) {
        sessionStorage.removeItem(getCartStorageKey(user));
      }
      setCartItems(prev => prev.length === 0 ? prev : []);
    } else if (unmergedGuestItems.length > 0) {
      setCartItems(unmergedGuestItems);
      saveCartToStorage(unmergedGuestItems, user);
    }

    const loadBackendCart = async () => {
      // Get unmerged guest cart items if user just logged in from guest checkout
      let unmergedGuestItems = [];
      try {
        const savedUnmerged = sessionStorage.getItem('foodie_guest_cart_unmerged') || sessionStorage.getItem('foodie_guest_cart_temp');
        if (savedUnmerged) {
          unmergedGuestItems = JSON.parse(savedUnmerged);
        }
      } catch (e) { }

      let cachedCartItems = [];
      try {
        const key = getCartStorageKey(user);
        const savedCart = sessionStorage.getItem(key) || (!isUserSwitch ? sessionStorage.getItem('foodie_cart') : null);
        if (savedCart) {
          cachedCartItems = JSON.parse(savedCart);
        }
      } catch (e) { }

      if (user && user.role === 'customer') {
        // Skip backend cart sync immediately after order placement to prevent
        // creating a new cart right after the old one was cleared/abandoned.
        const skipFlag = sessionStorage.getItem('foodie_checkout_in_progress');
        if (skipFlag) {
          sessionStorage.removeItem('foodie_checkout_in_progress');
          return;
        }
        try {
          const activeCart = (Array.isArray(unmergedGuestItems) && unmergedGuestItems.length > 0)
            ? await cartService.getOrCreateCart(user.id || user.phone, tableContext?.tableId || null).catch(() => null)
            : await cartService.getExistingCart(user.id || user.phone, tableContext?.tableId || null).catch(() => null);

          if (!activeCart) {
            if (Array.isArray(unmergedGuestItems) && unmergedGuestItems.length > 0) {
              setCartItems(unmergedGuestItems);
              saveCartToStorage(unmergedGuestItems, user);
            } else if (cachedCartItems.length > 0) {
              setCartItems(cachedCartItems);
              saveCartToStorage(cachedCartItems, user);
            } else {
              setCartItems(prev => prev.length === 0 ? prev : []);
              saveCartToStorage([], user);
            }
            sessionStorage.removeItem('foodie_guest_cart_unmerged');
            localStorage.removeItem('foodie_guest_cart_unmerged');
            sessionStorage.removeItem('foodie_guest_cart_temp');
            localStorage.removeItem('foodie_guest_cart_temp');
            sessionStorage.removeItem('foodie_guest_cart');
            localStorage.removeItem('foodie_guest_cart');
            return;
          }

          // Merge guest cart items into backend cart ONLY if unmerged guest cart exists
          if (Array.isArray(unmergedGuestItems) && unmergedGuestItems.length > 0) {
            const existingBackendItems = await cartService.getCartItems(activeCart.id).catch(() => []);
            const existingFoodIds = new Set((existingBackendItems || []).map(bi => Number(bi.food || bi.food_item)));

            for (const item of unmergedGuestItems) {
              try {
                if (!existingFoodIds.has(Number(item.id))) {
                  const formattedText = formatInstructions(item);
                  await cartService.addItemToCart(activeCart.id, item.id, item.quantity, getProductSellingPrice(item), {
                    instructions: formattedText,
                    extraIngredients: item.extraIngredients
                  });
                }
              } catch (err) {
                console.error("Error adding local item to backend cart:", err);
              }
            }
            sessionStorage.removeItem('foodie_guest_cart_unmerged');
            localStorage.removeItem('foodie_guest_cart_unmerged');
            sessionStorage.removeItem('foodie_guest_cart_temp');
            localStorage.removeItem('foodie_guest_cart_temp');
            sessionStorage.removeItem('foodie_guest_cart');
            localStorage.removeItem('foodie_guest_cart');
          }

          const backendItems = await cartService.getCartItems(activeCart.id);
          const allProducts = await productService.getProducts();

          const mappedItems = (backendItems || []).map(bi => {
            const prod = allProducts.find(p => Number(p.id) === Number(bi.food || bi.food_item));
            if (prod) {
              const rawInstructions = bi.special_instructions || bi.instructions || "";
              const parsed = parseInstructions(rawInstructions);
              return {
                ...prod,
                quantity: bi.quantity,
                cartItemId: bi.id || bi.cart_item_id,
                instructions: parsed.instructions,
                extraIngredients: parsed.extraIngredients
              };
            }
            return null;
          }).filter(Boolean);

          if (mappedItems.length > 0) {
            setCartItems(mappedItems);
            saveCartToStorage(mappedItems, user);
          } else if (Array.isArray(unmergedGuestItems) && unmergedGuestItems.length > 0) {
            setCartItems(unmergedGuestItems);
            saveCartToStorage(unmergedGuestItems, user);
          } else if (cachedCartItems.length > 0) {
            setCartItems(cachedCartItems);
            saveCartToStorage(cachedCartItems, user);
          } else {
            setCartItems(prev => prev.length === 0 ? prev : []);
            saveCartToStorage([], user);
          }
        } catch (e) {
          console.error("Error loading cart from database:", e);
          if (cachedCartItems.length > 0) {
            setCartItems(cachedCartItems);
            saveCartToStorage(cachedCartItems, user);
          } else {
            setCartItems(prev => prev.length === 0 ? prev : []);
            saveCartToStorage([], user);
          }
        }
      } else {
        const key = getCartStorageKey(user, tableContext);
        let savedCart = sessionStorage.getItem(key);
        
        if (!savedCart && (!user || user.role === 'customer')) {
          savedCart = sessionStorage.getItem('foodie_guest_cart') || sessionStorage.getItem('foodie_cart');
        }
        
        if (savedCart) {
          try {
            setCartItems(JSON.parse(savedCart));
          } catch (e) {
            setCartItems(prev => prev.length === 0 ? prev : []);
          }
        } else {
          setCartItems(prev => prev.length === 0 ? prev : []);
        }
      }
    };
    loadBackendCart();
  }, [user, tableContext?.tableId]);

  const setTable = (tableInfo) => {
    setTableContext(tableInfo);
    if (tableInfo) {
      sessionStorage.setItem('foodie_table', JSON.stringify(tableInfo));
      localStorage.setItem('foodie_table', JSON.stringify(tableInfo));
      const targetTable = tableInfo.tableNumber || tableInfo.tableId;
      if (targetTable && String(targetTable).toUpperCase() !== 'TAKEAWAY') {
        try {
          if (tableService && typeof tableService.occupyTableByNumber === 'function') {
            tableService.occupyTableByNumber(targetTable).catch(() => { });
          }
        } catch (e) { }
      }
    } else {
      sessionStorage.removeItem('foodie_table');
      localStorage.removeItem('foodie_table');
    }
  };

  const showOutOfStockModal = ({ item, message, stock }) => {
    setOutOfStockModalData({
      item,
      message,
      stock: stock !== undefined ? stock : (item?.stock !== undefined ? item.stock : 0)
    });
  };

  const closeOutOfStockModal = () => {
    setOutOfStockModalData(null);
  };

  const addToCart = async (item, quantity = 1, customizations = {}) => {
    if (!item) return false;
    const maxStock = typeof item.stock === 'number' ? item.stock : 20;
    const isOut = maxStock <= 0 || item.status === 'Out of Stock' || item.status === 'OUT_OF_STOCK' || item.is_available === false;
    if (isOut) {
      showOutOfStockModal({
        item,
        stock: 0,
        message: `Sorry, "${item.name}" is completely out of stock and cannot be added right now.`
      });
      return false;
    }

    const existing = cartItems.find((i) => Number(i.id) === Number(item.id));
    const currentInCart = existing ? existing.quantity : 0;

    let qtyToAdd = quantity;
    if (currentInCart + qtyToAdd > maxStock) {
      if (currentInCart >= maxStock) {
        showOutOfStockModal({
          item,
          stock: maxStock,
          message: `You already have all ${maxStock} available "${item.name}" in your cart. Additional items are currently out of stock.`
        });
        return false;
      }
      qtyToAdd = maxStock - currentInCart;
      showOutOfStockModal({
        item,
        stock: maxStock,
        message: `Only ${qtyToAdd} more "${item.name}" available in stock. Added ${qtyToAdd} to your cart.`
      });
    }

    const instructions = item.instructions || "";
    const extraIngredients = item.extraIngredients || [];

    // 1. Optimistic UI update
    setCartItems((prev) => {
      const exist = prev.find((i) => Number(i.id) === Number(item.id));
      let updated;
      if (exist) {
        updated = prev.map((i) =>
          Number(i.id) === Number(item.id) ? {
            ...i,
            quantity: i.quantity + qtyToAdd,
            customizations: { ...i.customizations, ...customizations },
            instructions: instructions || i.instructions,
            extraIngredients: extraIngredients.length > 0 ? extraIngredients : i.extraIngredients
          } : i
        );
      } else {
        updated = [...prev, { ...item, quantity: qtyToAdd, customizations, instructions, extraIngredients }];
      }
      saveCartToStorage(updated);
      return updated;
    });

    // 2. Backend sync in background
    if (user && user.role === 'customer') {
      try {
        const activeCart = await cartService.getOrCreateCart(user.id, tableContext?.tableId || null);
        const formattedText = formatInstructions({ instructions, extraIngredients });
        const added = await cartService.addItemToCart(activeCart.id, item.id, qtyToAdd, getProductSellingPrice(item), {
          instructions: formattedText,
          extraIngredients
        });

        if (added && (added.id || added.cart_item_id)) {
          const newCartItemId = added.cart_item_id || added.id;
          setCartItems((prev) => {
            const updated = prev.map((i) =>
              Number(i.id) === Number(item.id) ? { ...i, cartItemId: newCartItemId } : i
            );
            saveCartToStorage(updated);
            return updated;
          });
        }
      } catch (err) {
        console.error("Error adding to database cart:", err);
      }
    }

    try {
      window.dispatchEvent(new CustomEvent('foodie_item_added', { detail: { message: `"${item.name}" added to cart` } }));
    } catch (e) { }
    return true;
  };

  const updateItemInstructionsAndExtras = async (id, instructions, extraIngredients = []) => {
    // 1. Optimistic UI update
    setCartItems((prev) => {
      const updated = prev.map((i) =>
        i.id === id ? { ...i, instructions, extraIngredients } : i
      );
      saveCartToStorage(updated);
      return updated;
    });

    // 2. Backend sync in background
    if (user && user.role === 'customer') {
      try {
        const item = cartItems.find((i) => i.id === id);
        let cartItemId = item?.cartItemId;
        if (!cartItemId && item) {
          const activeCart = await cartService.getOrCreateCart(user.id, tableContext?.tableId || null);
          const backendItems = await cartService.getCartItems(activeCart.id);
          const found = backendItems.find(bi => Number(bi.food || bi.food_item) === Number(id));
          if (found) {
            cartItemId = found.id || found.cart_item_id;
          }
        }

        if (cartItemId) {
          const formattedText = formatInstructions({ instructions, extraIngredients });
          await api.patch(`/cart-items/${cartItemId}/`, { special_instructions: formattedText });
        }
      } catch (e) {
        console.error("Error updating instructions on backend:", e);
      }
    }
  };

  const removeFromCart = async (id) => {
    const idNum = Number(id);
    if (isNaN(idNum)) return false;

    // Prevent duplicate DELETE requests caused by double-click or multiple triggers
    if (deletingIdsRef.current.has(idNum)) return false;
    deletingIdsRef.current.add(idNum);

    try {
      const item = cartItems.find(i => Number(i.id) === idNum);
      if (!item) return false;

      let backendSuccess = true;

      if (user && user.role === 'customer') {
        let cartItemId = item.cartItemId;
        if (!cartItemId || String(cartItemId).startsWith('local_')) {
          try {
            const activeCart = await cartService.getOrCreateCart(user.id, tableContext?.tableId || null);
            if (activeCart && activeCart.id && !activeCart._localOnly) {
              const backendItems = await cartService.getCartItems(activeCart.id);
              const found = backendItems.find(bi => Number(bi.food || bi.food_item) === idNum);
              if (found) {
                cartItemId = found.id || found.cart_item_id;
              }
            }
          } catch (e) {
            console.error("Error finding backend cart item:", e);
          }
        }

        if (cartItemId && !String(cartItemId).startsWith('local_') && !String(cartItemId).startsWith('cart_')) {
          const deleteResult = await cartService.removeItemFromCart(cartItemId);
          if (!deleteResult) {
            // Check if item is already deleted or absent from backend cart
            try {
              const activeCart = await cartService.getOrCreateCart(user.id, tableContext?.tableId || null);
              const backendItems = await cartService.getCartItems(activeCart.id);
              const stillExists = backendItems.some(bi => Number(bi.food || bi.food_item) === idNum);
              backendSuccess = !stillExists;
            } catch (e) {
              backendSuccess = false;
            }
          } else {
            backendSuccess = true;
          }
        } else {
          backendSuccess = true;
        }
      }

      if (backendSuccess) {
        // Update local cart state ONLY after verified backend deletion
        setCartItems(prev => {
          const updated = prev.filter(i => Number(i.id) !== idNum);
          saveCartToStorage(updated);
          return updated;
        });

        // Display success notification only after backend success
        try {
          window.dispatchEvent(new CustomEvent('foodie_item_removed', { detail: { message: `"${item.name}" removed from cart` } }));
        } catch (e) { }
        return true;
      } else {
        console.error("Failed to delete cart item from backend:", item.name);
        try {
          window.dispatchEvent(new CustomEvent('foodie_item_removed', { detail: { message: `Failed to remove "${item.name}" from cart. Please try again.` } }));
        } catch (e) { }
        return false;
      }
    } finally {
      deletingIdsRef.current.delete(idNum);
    }
  };

  const increaseQuantity = async (id) => {
    const item = cartItems.find(i => Number(i.id) === Number(id));
    if (!item) return;

    const maxStock = typeof item.stock === 'number' ? item.stock : 20;
    if (item.quantity >= maxStock) {
      showOutOfStockModal({
        item,
        stock: maxStock,
        message: `You have reached the maximum available quantity (${maxStock} in stock) for "${item.name}". Additional quantity is currently out of stock.`
      });
      return;
    }

    const currentQty = item.quantity;
    const sellingPrice = getProductSellingPrice(item);
    const newQty = currentQty + 1;

    // 1. Optimistic UI update
    setCartItems(prev => {
      const updated = prev.map(i => Number(i.id) === Number(id) ? { ...i, quantity: newQty } : i);
      saveCartToStorage(updated);
      return updated;
    });

    // 2. Backend sync in background
    if (user && user.role === 'customer') {
      try {
        let cartItemId = item.cartItemId;
        if (!cartItemId) {
          const activeCart = await cartService.getOrCreateCart(user.id, tableContext?.tableId || null);
          const backendItems = await cartService.getCartItems(activeCart.id);
          const found = backendItems.find(bi => Number(bi.food || bi.food_item) === Number(id));
          if (found) {
            cartItemId = found.id || found.cart_item_id;
          }
        }

        if (cartItemId) {
          await cartService.updateItemQuantity(cartItemId, newQty, sellingPrice);
        }
      } catch (e) {
        console.error(e);
      }
    }
  };

  const decreaseQuantity = async (id) => {
    const item = cartItems.find(i => Number(i.id) === Number(id));
    if (!item) return;

    const currentQty = item.quantity;
    if (currentQty <= 1) {
      await removeFromCart(id);
      return;
    }

    const sellingPrice = getProductSellingPrice(item);
    const newQty = currentQty - 1;

    // 1. Optimistic UI update
    setCartItems((prev) => {
      const updated = prev.map((i) => (Number(i.id) === Number(id) ? { ...i, quantity: newQty } : i));
      saveCartToStorage(updated);
      return updated;
    });

    // 2. Backend sync in background
    if (user && user.role === 'customer') {
      try {
        let cartItemId = item.cartItemId;
        if (!cartItemId) {
          const activeCart = await cartService.getOrCreateCart(user.id, tableContext?.tableId || null);
          const backendItems = await cartService.getCartItems(activeCart.id);
          const found = backendItems.find(bi => Number(bi.food || bi.food_item) === Number(id));
          if (found) {
            cartItemId = found.id || found.cart_item_id;
          }
        }

        if (cartItemId) {
          await cartService.updateItemQuantity(cartItemId, newQty, sellingPrice);
        }
      } catch (e) {
        console.error(e);
      }
    }
  };

  const updateQuantity = async (id, newQty) => {
    const item = cartItems.find(i => Number(i.id) === Number(id));
    if (!item) return;

    const parsedQty = parseInt(newQty, 10);
    if (isNaN(parsedQty) || parsedQty <= 0) {
      await removeFromCart(id);
      return;
    }

    const maxStock = typeof item.stock === 'number' ? item.stock : 20;
    const finalQty = Math.min(parsedQty, maxStock);
    const sellingPrice = getProductSellingPrice(item);

    if (parsedQty > maxStock) {
      showOutOfStockModal({
        item,
        stock: maxStock,
        message: `You have reached the maximum available quantity (${maxStock} in stock) for "${item.name}". Additional quantity is currently out of stock.`
      });
    }

    setCartItems(prev => {
      const updated = prev.map(i => Number(i.id) === Number(id) ? { ...i, quantity: finalQty } : i);
      saveCartToStorage(updated);
      return updated;
    });

    if (user && user.role === 'customer') {
      try {
        let cartItemId = item.cartItemId;
        if (!cartItemId) {
          const activeCart = await cartService.getOrCreateCart(user.id, tableContext?.tableId || null);
          const backendItems = await cartService.getCartItems(activeCart.id);
          const found = backendItems.find(bi => Number(bi.food || bi.food_item) === Number(id));
          if (found) {
            cartItemId = found.id || found.cart_item_id;
          }
        }
        if (cartItemId) {
          await cartService.updateItemQuantity(cartItemId, finalQty, sellingPrice);
        }
      } catch (e) {
        console.error(e);
      }
    }
  };

  const clearCart = async () => {
    // Set flag so loadBackendCart doesn't immediately re-create a cart after checkout
    sessionStorage.setItem('foodie_checkout_in_progress', '1');
    if (user && user.role === 'customer') {
      try {
        const targetId = user.id ? Number(user.id) : null;
        const userCart = await cartService.getExistingCart(targetId, tableContext?.tableId || null);
        if (userCart && userCart.id) {
          await cartService.clearCart(userCart.id);
        }
      } catch (e) {
        console.error(e);
      }
    }
    setCartItems(prev => prev.length === 0 ? prev : []);
    setCoupon(null);
    saveCartToStorage([], user);
    sessionStorage.removeItem('foodie_cart');
    sessionStorage.removeItem('foodie_guest_cart');
    sessionStorage.removeItem('foodie_guest_cart_temp');
    sessionStorage.removeItem('foodie_guest_cart_unmerged');
    localStorage.removeItem('foodie_guest_cart');
    localStorage.removeItem('foodie_guest_cart_temp');
    localStorage.removeItem('foodie_guest_cart_unmerged');
    // Remove the checkout flag after a brief delay so the effect skips only once
    setTimeout(() => sessionStorage.removeItem('foodie_checkout_in_progress'), 3000);
  };

  const isTakeawayActive = (customTakeawayFlag) => {
    if (typeof customTakeawayFlag === 'boolean') return customTakeawayFlag;
    if (typeof customTakeawayFlag === 'string') {
      return customTakeawayFlag.toUpperCase() === 'TAKEAWAY';
    }
    const savedType = sessionStorage.getItem('foodie_order_type') || localStorage.getItem('foodie_order_type');
    if (savedType === 'TAKEAWAY') return true;
    if (tableContext?.orderType === 'TAKEAWAY' || tableContext?.tableNumber === 'Takeaway' || tableContext?.tableId === 'Takeaway') return true;
    return false;
  };

  const getEffectiveItems = () => {
    if (cartItems && cartItems.length > 0) return cartItems;
    try {
      let saved = sessionStorage.getItem(getCartStorageKey(user, tableContext));
      if (!saved && (!user || user.role === 'customer')) {
        saved = sessionStorage.getItem('foodie_cart');
      }
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) { }
    return [];
  };

  const [isServiceChargeRemoved, setIsServiceChargeRemoved] = useState(false);

  const toggleServiceChargeRemoval = () => {
    setIsServiceChargeRemoved(prev => !prev);
  };

  const getBillBreakdown = (customIsTakeaway) => {
    const isTakeaway = isTakeawayActive(customIsTakeaway);
    return calculateBillDetails({
      items: getEffectiveItems(),
      coupon: coupon,
      isTakeaway,
      gstRate: GST_RATE,
      isServiceChargeRemoved
    });
  };

  const getExtraCharges = (customIsTakeaway) => {
    return getBillBreakdown(customIsTakeaway).extraCharges;
  };

  const getPackingCharge = (customIsTakeaway) => {
    return getBillBreakdown(customIsTakeaway).packingCharge;
  };

  const getSubtotal = (customIsTakeaway) => {
    return getBillBreakdown(customIsTakeaway).subtotal;
  };

  const getItemDiscounts = (customIsTakeaway) => {
    return getBillBreakdown(customIsTakeaway).menuDiscounts;
  };

  const getCartNetSubtotal = (customIsTakeaway) => {
    return getBillBreakdown(customIsTakeaway).subtotal;
  };

  const getDiscount = (customIsTakeaway) => {
    return getBillBreakdown(customIsTakeaway).discount;
  };

  const getTax = (customIsTakeaway) => {
    return getBillBreakdown(customIsTakeaway).tax;
  };

  const getServiceCharge = (customIsTakeaway) => {
    return getBillBreakdown(customIsTakeaway).serviceCharge;
  };

  const getDeliveryFee = () => {
    return 0;
  };

  const getGrandTotal = (customIsTakeaway) => {
    return getBillBreakdown(customIsTakeaway).grandTotal;
  };

  const getOrderBillTotal = (customIsTakeaway) => {
    return getBillBreakdown(customIsTakeaway).grandTotal;
  };

  const removeCoupon = () => {
    if (coupon && (coupon.isAutomatic || coupon.code === 'WELCOME100')) {
      userRemovedCouponRef.current = true;
    }
    setCoupon(null);
  };

  const getActiveTableContext = () => {
    if (tableContext && tableContext.tableNumber) return tableContext;
    try {
      const saved = sessionStorage.getItem('foodie_table');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.tableNumber) return parsed;
      }
    } catch (e) { }
    return null;
  };

  const userRemovedCouponRef = useRef(false);
  const lastSubtotalRef = useRef(0);

  // Auto-apply WELCOME100 when subtotal >= 700 & auto-revalidate applied coupon on cart change
  useEffect(() => {
    let isMounted = true;
    const checkAndAutoApplyCoupon = async () => {
      // Never make API calls when user is not logged in — avoids 401 cascade on public pages
      if (!user) return;
      // Only run coupon logic for customer role
      if (user.role !== 'customer') return;

      const effectiveItems = getEffectiveItems();
      const breakdownNoCoupon = calculateBillDetails({
        items: effectiveItems,
        coupon: null,
        isTakeaway: isTakeawayActive(),
        gstRate: GST_RATE,
        isServiceChargeRemoved
      });
      const currentSubtotal = breakdownNoCoupon.subtotal;

      // Update last subtotal tracking (but don't automatically reset user's explicit coupon dismissal unless cart is emptied)
      if (Math.abs(currentSubtotal - lastSubtotalRef.current) > 0.01) {
        lastSubtotalRef.current = currentSubtotal;
      }

      // If cart is emptied, reset the dismissal states so new orders can get the coupon again
      if (currentSubtotal === 0) {
        userRemovedCouponRef.current = false;
      }

      const firstTime = await isFirstTimeCustomer(user);

      // If returning customer has WELCOME100 applied, remove it immediately
      if (!firstTime && coupon && coupon.code === 'WELCOME100') {
        if (isMounted) setCoupon(null);
        return;
      }

      if (coupon) {
        const breakdown = calculateBillDetails({
          items: effectiveItems,
          coupon: coupon,
          isTakeaway: isTakeawayActive(),
          gstRate: GST_RATE,
          isServiceChargeRemoved
        });
        if (!breakdown.isCouponEligible) {
          if (isMounted) setCoupon(null);
        }
      }

      // Auto-apply WELCOME100 ONLY if customer is a first-time customer, subtotal >= 700, no other coupon is applied, and it hasn't been dismissed
      if (firstTime && currentSubtotal >= 700 && !coupon && !userRemovedCouponRef.current) {
        if (isMounted) {
          const welcomeCouponObj = {
            id: 2,
            code: "WELCOME100",
            discount: 100,
            discount_value: 100,
            type: "fixed",
            discount_type: "FIXED",
            minOrderValue: 700,
            minimum_order_amount: 700,
            expiryDate: "2028-12-31",
            status: "Active",
            description: "Flat ₹100 OFF on orders above ₹700",
            isAutomatic: true
          };
          setCoupon(welcomeCouponObj);
        }
      }
    };

    checkAndAutoApplyCoupon();
    return () => { isMounted = false; };
  }, [cartItems, coupon, user, isServiceChargeRemoved]); // eslint-disable-line react-hooks/exhaustive-deps

  const applyCoupon = async (code) => {
    const codeUpper = (code || '').trim().toUpperCase();
    const currentSubtotal = getBillBreakdown().subtotal;

    // Strict Single Coupon Enforcement: If already applied, avoid re-applying same code
    if (coupon && coupon.code === codeUpper) {
      return {
        success: true,
        message: `Coupon "${codeUpper}" is already applied.`
      };
    }

    // Check WELCOME100 first-time customer rule via backend order history
    if (codeUpper === 'WELCOME100') {
      const firstTime = await isFirstTimeCustomer(user);
      if (!firstTime) {
        return {
          success: false,
          message: "WELCOME100 coupon is valid for first-time customers only."
        };
      }
    }

    try {
      const validatedCoupon = await couponService.validateCoupon(codeUpper, currentSubtotal, user);
      userRemovedCouponRef.current = false;
      // Single Coupon Exclusivity: Applying new coupon automatically replaces previous coupon (e.g. WELCOME100 and another voucher can never be combined)
      setCoupon(validatedCoupon.coupon || validatedCoupon);
      return { success: true, message: `Coupon "${codeUpper}" applied successfully!` };
    } catch (err) {
      return { success: false, message: err.message || "Failed to apply coupon" };
    }
  };



  const submitOrder = async (paymentMethod = 'COD', explicitOrderType = null) => {
    const savedOrderType = explicitOrderType || sessionStorage.getItem('foodie_order_type') || localStorage.getItem('foodie_order_type');
    const activeTable = getActiveTableContext();
    const isTakeawayChoice = savedOrderType === 'TAKEAWAY' || activeTable?.orderType === 'TAKEAWAY' || activeTable?.tableNumber === 'Takeaway';

    const breakdown = getBillBreakdown(isTakeawayChoice);
    const effectiveItems = getEffectiveItems();

    const rawTableNum = activeTable ? (activeTable.tableNumber || activeTable.tableId) : 'T01';
    const canonTableNum = String(rawTableNum).startsWith('T') ? rawTableNum : (rawTableNum === '1' ? 'T01' : (rawTableNum === '2' ? 'T02' : (rawTableNum === '3' ? 'T03' : (rawTableNum === '4' ? 'T04' : `T0${rawTableNum}`))));

    const selectedRestId = activeTable?.restaurantId || activeTable?.restaurant || localStorage.getItem('foodie_selected_restaurant_id') || 1;

    const orderData = {
      restaurant_id: Number(selectedRestId) || 1,
      restaurant: Number(selectedRestId) || 1,
      table: isTakeawayChoice ? 'Takeaway' : (activeTable ? (activeTable.tableId || canonTableNum) : 'T01'),
      tableNumber: isTakeawayChoice ? 'Takeaway' : canonTableNum,
      orderType: isTakeawayChoice ? 'Takeaway' : 'Dine-In',
      items: effectiveItems.map((i) => {
        const extraPerUnit = i.extraIngredients
          ? i.extraIngredients.reduce((s, ing) => s + ing.price, 0)
          : 0;
        return {
          id: i.id,
          item_id: i.id,
          name: i.name,
          quantity: i.quantity || 1,
          price: (getProductSellingPrice(i) || i.price || 0) + extraPerUnit,
          instructions: formatInstructions(i)
        };
      }),
      subtotal: breakdown.subtotal,
      itemDiscounts: breakdown.menuDiscounts,
      extraCharges: breakdown.extraCharges,
      packingCharge: breakdown.packingCharge,
      packing_charge: breakdown.packingCharge,
      tax: breakdown.tax,
      serviceCharge: breakdown.serviceCharge,
      service_charge: breakdown.serviceCharge,
      isServiceChargeRemoved: breakdown.isServiceChargeRemoved,
      deliveryFee: 0,
      discount: breakdown.discount,
      voucher: coupon ? (coupon.code || coupon) : null,
      voucherCode: coupon ? (coupon.code || coupon) : null,
      coupon: coupon || null,
      total: breakdown.grandTotal,
      paymentMethod,
      diners: activeTable ? activeTable.diners || 2 : 2,
      source: activeTable ? 'QR Code' : 'Counter'
    };

    let placed = null;
    try {
      placed = await orderService.placeOrder(orderData);
    } catch (err) {
      console.error("orderService.placeOrder failed:", err);
      throw err;
    }

    if (!placed || !placed.id || String(placed.id) === 'undefined' || String(placed.id) === 'null') {
      throw new Error("Order creation failed: Backend did not return a valid order ID.");
    }

    placed.placedAt = placed.placedAt || Date.now();
    placed.rawCreatedAt = placed.rawCreatedAt || Date.now();
    placed.createdAt = placed.createdAt || new Date().toISOString();
    placed.packingCharge = breakdown.packingCharge;
    placed.packing_charge = breakdown.packingCharge;

    if (!placed.total || Number(placed.total) === 0) {
      placed.total = breakdown.grandTotal;
    }
    try {
      sessionStorage.setItem('foodie_last_placed_order', JSON.stringify(placed));
      localStorage.setItem('foodie_last_placed_order', JSON.stringify(placed));
      localStorage.setItem(`foodie_saved_order_${placed.id}`, JSON.stringify(placed));
      const existingAll = JSON.parse(localStorage.getItem('foodie_all_placed_orders') || '[]');
      const filteredExisting = existingAll.filter(o => String(o.id || o.order_id) !== String(placed.id));
      localStorage.setItem('foodie_all_placed_orders', JSON.stringify([placed, ...filteredExisting]));
      window.dispatchEvent(new CustomEvent('foodie_orders_updated', { detail: { orderId: placed.id } }));
      localStorage.setItem('foodie_orders_sync_trigger', Date.now().toString());
    } catch (e) { }

    setOrderLogs((prev) => [placed, ...prev]);
    try {
      if (user && user.id) {
        const userKey = `foodie_customer_order_ids_${user.id}`;
        const saved = JSON.parse(localStorage.getItem(userKey) || '[]');
        if (!saved.includes(String(placed.id))) {
          localStorage.setItem(userKey, JSON.stringify([String(placed.id), ...saved]));
        }

        if (user.phone) {
          const phoneClean = String(user.phone).replace(/\D/g, '').slice(-10);
          const phoneKey = `foodie_customer_order_ids_${phoneClean}`;
          const phoneSaved = JSON.parse(localStorage.getItem(phoneKey) || '[]');
          if (!phoneSaved.includes(String(placed.id))) {
            localStorage.setItem(phoneKey, JSON.stringify([String(placed.id), ...phoneSaved]));
          }
        }
      } else {
        const guestSaved = JSON.parse(localStorage.getItem('foodie_guest_order_ids') || '[]');
        if (!guestSaved.includes(String(placed.id))) {
          localStorage.setItem('foodie_guest_order_ids', JSON.stringify([String(placed.id), ...guestSaved]));
        }
      }
    } catch (e) {
      console.error("Error saving customer order ID in cart", e);
    }

    try {
      await clearCart();
      if (user) {
        sessionStorage.removeItem(getCartStorageKey(user));
        sessionStorage.removeItem('foodie_cart');
      }
    } catch (e) { }

    return placed;
  };

  const loadOrderIntoCart = (items) => {
    if (Array.isArray(items) && items.length > 0) {
      setCartItems(items);
      saveCartToStorage(items);
    }
  };

  return (
    <CartContext.Provider value={{
      cartItems,
      tableContext,
      coupon,
      orderLogs,
      addToCart,
      removeFromCart,
      increaseQuantity,
      decreaseQuantity,
      updateQuantity,
      clearCart,
      loadOrderIntoCart,
      applyCoupon,
      removeCoupon,
      setTable,
      getSubtotal,
      getItemDiscounts,
      getCartNetSubtotal,
      getExtraCharges,
      getPackingCharge,
      getTax,
      getServiceCharge,
      isServiceChargeRemoved,
      toggleServiceChargeRemoval,
      getDeliveryFee,
      getDiscount,
      getGrandTotal,
      submitOrder,
      placeOrder: submitOrder,
      getCartSubtotal: getSubtotal,
      getCartTax: getTax,
      getCartDeliveryFee: getDeliveryFee,
      getCartDiscount: getDiscount,
      getCartGrandTotal: getGrandTotal,
      updateItemInstructionsAndExtras,
      showOutOfStockModal,
      closeOutOfStockModal
    }}>
      {children}
      <OutOfStockModal
        isOpen={Boolean(outOfStockModalData)}
        onClose={closeOutOfStockModal}
        item={outOfStockModalData?.item}
        message={outOfStockModalData?.message}
        stock={outOfStockModalData?.stock}
      />
    </CartContext.Provider>
  );
};
export default CartContext;
