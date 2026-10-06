# Foodie API Integration Guide

This document guides the backend development team on how to integrate REST APIs into the Foodie Customer and Admin frontend application.

---

## Service Layer Architecture

The frontend uses a decoupled service layer. Components **never** call `fetch()` or `axios` directly. Instead, they interact with hooks and services:

```text
Component ──> Context / Hook ──> Service Layer ──> Axios Instance ──> Backend REST API
```

To connect a new endpoint, you only need to modify files in the [`src/services/`](file:///c:/web%20developing/foodie/foodie/src/services/) directory.

---

## Axios Base Client
- Configured in [`src/services/api.js`](file:///c:/web%20developing/foodie/foodie/src/services/api.js)
- Environment variable VITE_API_BASE_URL determines the base endpoint.
- Attaches the Bearer Token from local storage automatically.
- Detects `401 Unauthorized` responses and redirects users to `/login`.

---

## API Endpoints Contract

### 1. Authentication Services
- **File**: [`src/services/authService.js`](file:///c:/web%20developing/foodie/foodie/src/services/authService.js)

#### Login (`POST /auth/login`)
- **Payload**:
  ```json
  {
    "email": "admin@foodie.com",
    "password": "hashed_password"
  }
  ```
- **Response**:
  ```json
  {
    "token": "JWT_TOKEN_STRING",
    "user": {
      "name": "Store Manager",
      "email": "admin@foodie.com",
      "role": "admin"
    }
  }
  ```

---

### 2. Product & Dish Services
- **File**: [`src/services/productService.js`](file:///c:/web%20developing/foodie/foodie/src/services/productService.js)

#### Get Dishes (`GET /products`)
- **Response**:
  ```json
  [
    {
      "id": 1,
      "name": "Classic Cheese Burger",
      "category": "Burgers",
      "type": "veg | non-veg",
      "price": 159,
      "rating": 4.4,
      "image": "image_url",
      "description": "description text",
      "stock": 25,
      "status": "In Stock | Low Stock | Out of Stock"
    }
  ]
  ```

#### Create Dish (`POST /products`)
- **Payload**: Name, Price, Description, Category, Type, Stock, Image.

---

### 3. Orders Services
- **File**: [`src/services/orderService.js`](file:///c:/web%20developing/foodie/foodie/src/services/orderService.js)

#### Place Customer Order (`POST /orders`)
- **Payload**:
  ```json
  {
    "table": "T02",
    "items": [
      { "id": 1, "name": "Classic Cheese Burger", "quantity": 2, "price": 159 }
    ],
    "subtotal": 318,
    "tax": 16,
    "deliveryFee": 0,
    "discount": 0,
    "total": 334,
    "paymentMethod": "CARD | UPI | COD",
    "diners": 2,
    "source": "QR Code | Employee"
  }
  ```

#### Update Order Status (`PATCH /orders/:id/status`)
- **Payload**: `{"status": "Pending | Preparing | Ready | Served | Completed | Cancelled"}`
