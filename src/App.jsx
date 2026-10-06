import React, { useEffect } from 'react';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { OrderProvider } from './context/OrderContext';
import { AppProvider } from './context/AppContext';
import AppRoutes from './routes/AppRoutes';
import { orderService } from './services/orderService';

function App() {
  useEffect(() => {
    const isReset = localStorage.getItem('foodie_fresh_start_v2');
    if (!isReset) {
      orderService.resetAllOrders();
      localStorage.setItem('foodie_fresh_start_v2', 'true');
    }
  }, []);

  return (
    <AuthProvider>
      <CartProvider>
        <OrderProvider>
          <AppProvider>
            <AppRoutes />
          </AppProvider>
        </OrderProvider>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;
