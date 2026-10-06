import { useContext } from 'react';
import { OrderContext } from '../context/OrderContext';
export const useOrders = () => useContext(OrderContext);
export default useOrders;
