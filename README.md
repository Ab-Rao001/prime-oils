# Prime Oil Suppliers

Prime Oil Suppliers is a comprehensive production-ready platform designed for managing oil distribution, inventory, shopkeepers, orders, payments, and complaints.

## Architecture

- **Frontend**: React 18, React Router DOM, React Hot Toast, Recharts
- **Backend**: Node.js, Express, MongoDB (Mongoose), Redis (Caching)
- **Security**: JWT (`httpOnly` cookies), Helmet, CORS, Rate Limiting, Mongo Sanitize, HPP, CSRF Protection
- **DevOps**: Docker, Docker Compose, PM2, Nginx, GitHub Actions

## Prerequisites

- Node.js v18+
- MongoDB v6+
- Redis v7+
- Docker & Docker Compose (optional)

## Setup & Local Development

1. **Install dependencies**
   ```bash
   npm install
   cd server && npm install
   ```

2. **Environment Variables**
   Create a `.env` file in the `server` directory:
   ```env
   NODE_ENV=development
   PORT=5000
   MONGODB_URI=mongodb+srv://db_user:password@cluster.mongodb.net/prime_oils
   REDIS_URI=redis://localhost:6379
   JWT_SECRET=your_super_secret_key_32_chars_min
   SESSION_SECRET=another_super_secret_key
   ALLOWED_ORIGINS=http://localhost:3000
   ```

3. **Start the application**
   ```bash
   # From root directory
   npm run dev
   ```

## Production Deployment

### Using Docker

```bash
docker-compose up -d --build
```

### Using PM2

1. Build the frontend:
   ```bash
   npm run build
   ```

2. Start the backend with PM2:
   ```bash
   pm2 start ecosystem.config.js
   ```

3. Setup Nginx using the provided `nginx.conf`.

## API Documentation

The API follows RESTful principles and uses standard HTTP status codes. All payloads must be JSON.

### Endpoints
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /api/products`
- `GET /api/orders`
- `GET /api/shopkeepers`
- ...

## Security Hardening
- **No LocalStorage**: All tokens are strictly stored in `httpOnly` secure cookies.
- **Strict Validation**: All incoming requests are validated using `zod` schemas.
- **Role-Based Access Control**: Middleware ensures `admin`, `salesman`, `shopkeeper`, and `supplier` can only access authorized endpoints.
- **Session Invalidations**: `tokenVersion` ensures all sessions can be invalidated globally.

## License

Private and Confidential.
