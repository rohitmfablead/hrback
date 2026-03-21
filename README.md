# Emp Care Circle - Backend API

Backend API server for the Emp Care Circle HRMS application.

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables:
```bash
# Copy the example env file
cp .env.example .env

# Edit .env with your configuration
```

3. Start the server:
```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm start
```

The server will start on `http://localhost:5000`

## 📁 Project Structure

```
backend/
├── src/
│   ├── config/          # Configuration files
│   │   ├── index.js     # App configuration
│   │   └── database.js  # Database setup
│   ├── controllers/     # Route controllers
│   │   ├── authController.js
│   │   ├── employeeController.js
│   │   ├── attendanceController.js
│   │   ├── leaveController.js
│   │   ├── payrollController.js
│   │   ├── dashboardController.js
│   │   └── notificationController.js
│   ├── middleware/      # Custom middleware
│   │   ├── auth.js      # Authentication
│   │   └── errorHandler.js
│   ├── routes/          # API routes
│   │   ├── authRoutes.js
│   │   ├── employeeRoutes.js
│   │   ├── attendanceRoutes.js
│   │   ├── leaveRoutes.js
│   │   ├── payrollRoutes.js
│   │   ├── dashboardRoutes.js
│   │   ├── notificationRoutes.js
│   │   └── index.js
│   └── server.js        # Entry point
├── .env                 # Environment variables
├── .env.example         # Example environment file
└── package.json
```

## 🔐 Default Admin Credentials

```
Email: admin@company.com
Password: admin123
```

**⚠️ IMPORTANT:** Change these credentials in production!

## 📡 API Endpoints

### Authentication
- `POST /api/auth/login` - Login user
- `POST /api/auth/register` - Register new user
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout user

### Attendance ⭐ NEW
- `POST /api/attendance/face/mark` - **Mark attendance with face recognition**
- `GET /api/attendance/today` - **Check today's attendance status**
- `GET /api/attendance` - Get attendance records
- `GET /api/attendance/my` - Get my attendance
- `POST /api/attendance/mark` - Mark regular attendance
- `GET /api/attendance/stats` - Get attendance statistics
- `PUT /api/attendance/:id` - Update attendance (Admin/HR only)

### Employees
- `GET /api/employees` - Get all employees (Admin/HR only)
- `GET /api/employees/:id` - Get employee by ID
- `POST /api/employees` - Create employee (Admin/HR only)
- `PUT /api/employees/:id` - Update employee (Admin/HR only)
- `DELETE /api/employees/:id` - Delete employee (Admin only)
- `GET /api/employees/me` - Get my profile

### Attendance
- `GET /api/attendance` - Get attendance records
- `GET /api/attendance/my` - Get my attendance
- `POST /api/attendance/mark` - Mark attendance
- `GET /api/attendance/stats` - Get attendance statistics
- `PUT /api/attendance/:id` - Update attendance (Admin/HR only)

### Leaves
- `GET /api/leaves` - Get all leave requests
- `POST /api/leaves/apply` - Apply for leave
- `PUT /api/leaves/:id/approve` - Approve leave (Admin/HR only)
- `PUT /api/leaves/:id/reject` - Reject leave (Admin/HR only)
- `DELETE /api/leaves/:id` - Cancel leave request
- `GET /api/leaves/balance` - Get leave balance

### Payroll
- `GET /api/payroll` - Get payroll records (Admin/HR only)
- `GET /api/payroll/my` - Get my payslips
- `POST /api/payroll/generate` - Generate payslip (Admin/HR only)
- `PUT /api/payroll/:id/pay` - Mark salary as paid (Admin/HR only)
- `GET /api/payroll/:id/slip` - Download payslip

### Dashboard
- `GET /api/dashboard/stats` - Get dashboard statistics
- `GET /api/dashboard/charts` - Get chart data

### Notifications
- `GET /api/notifications` - Get notifications
- `PUT /api/notifications/read-all` - Mark all as read
- `PUT /api/notifications/:id/read` - Mark as read
- `DELETE /api/notifications/:id` - Delete notification
- `DELETE /api/notifications` - Clear all notifications

## 🔑 Authentication

All protected endpoints require JWT authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

## 📝 Request/Response Format

All requests and responses use JSON format.

**Example Request:**
```json
{
  "email": "admin@company.com",
  "password": "admin123"
}
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "uuid",
      "name": "Admin User",
      "email": "admin@company.com",
      "role": "Admin"
    }
  }
}
```

## 🛡️ Role-Based Access Control

- **Admin**: Full access to all features
- **HR**: Access to employee management, attendance, leaves, payroll
- **Employee**: Access to own profile, attendance, leaves, payslips

## 💾 Data Storage

Currently using in-memory storage for simplicity. For production, replace with:
- MongoDB (using Mongoose)
- PostgreSQL (using Sequelize or Prisma)
- MySQL
- Or any other database

## 🧪 Testing

```bash
npm test
```

## 📄 API Documentation

For detailed API documentation, see the **[API_DOCUMENTATION.md](./API_DOCUMENTATION.md)** file in this directory.

This includes:
- Complete endpoint reference
- Request/response examples
- Authentication guide
- Error handling
- Access control matrix
- Face recognition API details

## 🔧 Development

### Available Scripts

- `npm run dev` - Start development server with auto-reload
- `npm start` - Start production server
- `npm test` - Run tests
- `node test-apis.js` - **Run comprehensive API tests**

### Testing the APIs

```bash
# Run automated tests
node test-apis.js

# Test specific endpoint with curl
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@company.com","password":"admin123"}'
```

### Environment Variables

See `.env.example` for available configuration options:

- `PORT` - Server port (default: 5000)
- `NODE_ENV` - Environment (development/production)
- `JWT_SECRET` - JWT signing secret
- `JWT_EXPIRE` - JWT token expiration time
- `ADMIN_EMAIL` - Default admin email
- `ADMIN_PASSWORD` - Default admin password

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📝 License

ISC
