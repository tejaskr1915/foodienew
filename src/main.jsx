import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';

// CSS Frameworks
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';

// Custom CSS Layers
import './styles/theme.css';
import './styles/global.css';
import './styles/admin.css';
import './styles/customer.css';

ReactDOM.createRoot(document.getElementById('root')).render(

  <BrowserRouter>
    <App />
  </BrowserRouter>
);
