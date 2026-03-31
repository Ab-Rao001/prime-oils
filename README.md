# Prime Oil Suppliers – Management System

A complete React web application for warehouse and distribution management.

## Project Structure

```
prime-oil/
├── public/
│   └── index.html
├── src/
│   ├── components/
│   │   ├── Badge.jsx          # Status badge component
│   │   ├── SearchBar.jsx      # Reusable search input
│   │   ├── SectionHeader.jsx  # Page title + action button
│   │   ├── Sidebar.jsx        # Role-based navigation sidebar
│   │   ├── StatCard.jsx       # Dashboard stat card
│   │   ├── Table.jsx          # THead, TRow, TCell primitives
│   │   └── Topbar.jsx         # Top navigation bar
│   ├── data/
│   │   └── mockData.js        # All mock data & constants
│   ├── pages/
│   │   ├── Auth.jsx           # Login & Sign Up page
│   │   ├── CashFlow.jsx       # Cash flow module
│   │   ├── Complaints.jsx     # Complaint management
│   │   ├── Dashboard.jsx      # Main shell (sidebar + content)
│   │   ├── Inventory.jsx      # Inventory management
│   │   ├── Landing.jsx        # Animated landing page
│   │   ├── Marketing.jsx      # Marketing & campaigns
│   │   ├── Notifications.jsx  # Notification center
│   │   ├── Orders.jsx         # Order management
│   │   ├── Overview.jsx       # Dashboard overview
│   │   ├── Payments.jsx       # Payment & installments
│   │   ├── Reports.jsx        # Analytics & reports
│   │   ├── Shopkeepers.jsx    # Shopkeeper management
│   │   └── UserManagement.jsx # User admin panel
│   ├── App.jsx                # Root component & page router
│   ├── index.css              # Global styles & animations
│   ├── index.js               # React entry point
│   └── theme.js               # Design tokens & color palette
└── package.json
```

## Setup & Run

```bash
# 1. Install dependencies
npm install

# 2. Start development server
npm start

# 3. Open browser at
http://localhost:3000
```

## Demo Logins

| Role        | Email                    | Access |
|-------------|--------------------------|--------|
| Admin       | admin@primeoil.com       | All 11 modules |
| Shopkeeper  | ali@shop.com             | Orders, Payments, Complaints, Notifications |
| Salesman    | kamran@primeoil.com      | Orders, Payments, Inventory, Shopkeepers, Notifications |
| Supplier    | supply@factory.com       | Inventory, Notifications |

## Modules

1. **Overview** – Stats, charts, recent orders
2. **Inventory** – Product stock management, low-stock alerts
3. **Orders** – Place, track, update order status
4. **Payments** – Full & installment tracking, payment collection modal
5. **Cash Flow** – Daily inflow/outflow, net profit
6. **Notifications** – Real-time alerts, mark as read
7. **Complaints** – Register, process, resolve complaints
8. **Marketing** – Campaign management, budget tracking
9. **Shopkeepers** – Shop profiles, outstanding balance
10. **Reports** – Sales analytics, charts, summary reports
11. **User Management** – Manage system users (Admin only)

## Tech Stack

- React 18
- React Router DOM v6
- Recharts (charts)
- Pure inline styles (no CSS framework)

## Connect to Backend

Replace the arrays in `src/data/mockData.js` with `fetch()` calls:

```js
// Example: replace PRODUCTS with API call
const [products, setProducts] = useState([]);

useEffect(() => {
  fetch('https://your-api.com/api/products')
    .then(r => r.json())
    .then(setProducts);
}, []);
```
