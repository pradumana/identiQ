# IdentiQ - Smart KYC Platform

A comprehensive, enterprise-grade Know Your Customer (KYC) platform built with React, FastAPI, and blockchain technology. IdentiQ enables one-time KYC registration with lifetime access through a Unique KYC Number (UKN).

![IdentiQ](https://img.shields.io/badge/IdentiQ-Smart%20KYC-1DBF59?style=for-the-badge)
![React](https://img.shields.io/badge/React-18.3-61DAFB?style=for-the-badge&logo=react)
![FastAPI](https://img.shields.io/badge/FastAPI-0.104-009688?style=for-the-badge&logo=fastapi)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?style=for-the-badge&logo=typescript)

## 🌟 Features

### Core Functionality
- **One-Time Registration**: Users register once and receive a permanent Unique KYC Number (UKN)
- **Document Verification**: Automated OCR extraction using PaddleOCR/EasyOCR
- **Face Recognition**: Advanced face matching and deduplication using DeepFace
- **Risk Scoring**: AI-powered risk assessment with explainable ML models (SHAP)
- **Blockchain Integration**: Immutable storage of KYC records on blockchain
- **Auto-Approval**: Low-risk applications automatically approved (< 30% risk score)
- **Multi-Role Access**: Separate portals for Users, Admins, Reviewers, and Institutions

### User Features
- **User Dashboard**: View KYC status, UKN, QR code, and verification details
- **Document Upload**: Personalized document list based on user inputs
- **Consent Management**: Control which institutions can access your KYC data
- **Real-time Status**: Track application progress in real-time

### Admin Features
- **Dashboard**: Comprehensive metrics with donut charts and stat cards
- **Review Queue**: Filtered view of applications requiring manual review (risk ≥ 50%)
- **Application Management**: Approve, reject, or request additional information
- **Face Deduplication Queue**: Review potential duplicate identities
- **Blockchain Records**: View and verify blockchain transaction hashes
- **User Management**: Create and manage reviewers, admins, and institutions
- **Audit Trail**: Complete history of all actions and decisions

### Institution Features
- **UKN Lookup**: Instant KYC verification using Unique KYC Number
- **Consent-Based Access**: Access KYC data only with user consent
- **Verified Data**: Receive verified name, age, address, photo, and risk score
- **No Document Upload**: Institutions don't need to process documents

## 🏗️ Architecture

### Frontend
- **Framework**: React 18.3 with TypeScript
- **State Management**: Zustand for global state
- **Routing**: React Router DOM v6
- **UI Components**: Shadcn/ui with Tailwind CSS
- **Data Fetching**: Custom API client with fetch
- **Notifications**: Sonner for toast notifications
- **Performance**: Code splitting, lazy loading, React.memo optimizations

### Backend
- **Framework**: FastAPI (Python)
- **Database**: SQLite (development) / PostgreSQL (production) with SQLAlchemy ORM
- **Authentication**: JWT-based with role-based access control
- **OCR**: PaddleOCR/EasyOCR for document text extraction
- **Face Recognition**: DeepFace for face matching and deduplication
- **ML Models**: scikit-learn with SHAP for risk scoring
- **Blockchain**: Simulated blockchain service (ready for production integration)

### Key Services
- **UKN Service**: Generates unique KYC numbers (KYC-XXXX-XXXX-XXXX)
- **Blockchain Service**: Stores UKN records immutably with transaction hashes
- **Face Deduplication Service**: Ensures one person = one UKN globally
- **Document Service**: Handles OCR extraction and validation
- **Validation Service**: Validates user details against documents

## 📋 Prerequisites

- **Node.js** 18+ and npm
- **Python** 3.10+
- **Git**

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/secure-kyc-chain.git
cd secure-kyc-chain
```

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv .venv

# Activate virtual environment
# On Windows:
.venv\Scripts\activate
# On macOS/Linux:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run database migrations (if needed)
python migrate_add_ukn.py
python migrate_add_user_details.py

# Seed initial users (optional)
python -m app.db.seed

# Start the backend server
uvicorn main:app --reload
```

The backend will be available at `http://localhost:8000`
- API Documentation: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`
- Health Check: `http://localhost:8000/health`

### 3. Frontend Setup

```bash
# From project root
npm install

# Start development server
npm run dev
```

The frontend will be available at `http://localhost:5173` (or the port shown in terminal)

### 4. Access the Application

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs

### Default Test Users

The system comes with default users for testing:

- **Admin**: `admin@identiq.com` / `admin123`
- **Reviewer**: `reviewer@identiq.com` / `reviewer123`
- **User**: `user@example.com` / `Password123!`

Or use the seed script to create users:
- `user@example.com` / `Password123!` (role: user)
- `reviewer@example.com` / `Password123!` (role: reviewer)
- `admin@example.com` / `Password123!` (role: admin)

## 📁 Project Structure

```
secure-kyc-chain/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   └── v1/
│   │   │       └── endpoints/    # API endpoints
│   │   │           ├── auth.py
│   │   │           ├── kyc.py
│   │   │           ├── admin.py
│   │   │           └── institution.py
│   │   ├── core/
│   │   │   ├── config.py         # Configuration
│   │   │   └── security.py       # JWT & password hashing
│   │   ├── db/
│   │   │   ├── database.py       # Database connection
│   │   │   ├── models.py         # SQLAlchemy models
│   │   │   └── seed.py          # Seed data
│   │   ├── schemas/              # Pydantic schemas
│   │   └── services/             # Business logic
│   │       ├── blockchain_service.py
│   │       ├── document_service.py
│   │       ├── face_dedupe_service.py
│   │       ├── ukn_service.py
│   │       └── validation_service.py
│   ├── tests/                    # Backend tests
│   │   ├── conftest.py
│   │   ├── test_auth.py
│   │   ├── test_admin_applications.py
│   │   ├── test_kyc_user_workflow.py
│   │   ├── test_blockchain_records.py
│   │   ├── test_face_dedupe.py
│   │   ├── test_ukn_lookup.py
│   │   └── test_e2e_integration.py
│   ├── main.py                   # FastAPI app
│   ├── requirements.txt          # Python dependencies
│   └── kyc.db                    # SQLite database
│
├── src/
│   ├── components/
│   │   ├── admin/                # Admin components
│   │   ├── layout/               # Layout components
│   │   └── ui/                   # Shadcn/ui components
│   ├── lib/
│   │   ├── api.ts                # API client
│   │   └── auth.ts               # Authentication utilities
│   ├── pages/
│   │   ├── admin/                # Admin pages
│   │   │   ├── IdentiQDashboardPage.tsx
│   │   │   ├── ApplicationsPage.tsx
│   │   │   ├── ReviewQueuePage.tsx
│   │   │   ├── ApplicationDetailPage.tsx
│   │   │   └── SettingsPage.tsx
│   │   ├── Index.tsx             # Landing page
│   │   ├── Login.tsx             # Login page
│   │   ├── UserDashboard.tsx     # User dashboard
│   │   └── InstitutionPortal.tsx  # Institution portal
│   ├── store/
│   │   └── kycStore.ts           # Zustand store
│   ├── types/                    # TypeScript types
│   └── __tests__/                # Frontend tests
│       ├── ApiIntegration.test.ts
│       ├── Login.test.tsx
│       ├── AdminDashboard.test.tsx
│       └── ...
│
├── package.json
├── vite.config.ts
└── README.md
```

## 🔐 Authentication & Roles

### Roles

- **user**: Regular users who submit KYC applications
- **reviewer**: Can review and approve/reject applications
- **admin**: Full access including user management
- **institution**: Can lookup KYC data using UKN

### Authentication Flow

1. User logs in via `POST /api/v1/auth/login`
2. Backend returns JWT token
3. Frontend stores token in localStorage
4. Token included in all subsequent API requests
5. Protected routes check authentication and role

## 🔄 KYC Workflow

1. **User Registration**: User signs up and logs in
2. **KYC Form**: User fills personal details (name, DOB, gender, marital status, purpose)
3. **Document List Generation**: System generates personalized document requirements
4. **Document Upload**: User uploads required documents (PAN, Aadhaar, Passport, etc.)
5. **Selfie Upload**: User uploads live selfie video
6. **Processing**:
   - OCR extraction from documents
   - Face matching and deduplication
   - Risk scoring
   - Validation of user details against documents
7. **Decision**:
   - **Auto-Approval**: Risk score < 30% → UKN issued automatically
   - **Manual Review**: Risk score ≥ 30% → Sent to review queue
   - **Rejection**: Validation fails or high risk → Application rejected
8. **UKN Issuance**: Approved users receive Unique KYC Number
9. **Blockchain Record**: UKN and verification data stored on blockchain

### KYC Lifecycle States

- `DRAFT` - Initial state
- `REGISTERED` - User has submitted documents
- `PROCESSING` - System is processing
- `IN_REVIEW` - Awaiting manual review (risk ≥ 30%)
- `VERIFIED` - Approved and UKN issued ✅
- `REJECTED` - Application rejected
- `SUSPENDED` - Temporarily suspended
- `EXPIRED` - KYC has expired (needs re-verification)

## 📊 API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login
- `GET /api/v1/auth/me` - Get current user

### KYC (User Endpoints)
- `GET /api/v1/kyc/applications/me` - Get user's KYC application
- `POST /api/v1/kyc/documents/upload` - Upload document
- `POST /api/v1/kyc/process` - Process application
- `GET /api/v1/kyc/documents` - Get uploaded documents
- `GET /api/v1/kyc/consents` - Get consent records
- `POST /api/v1/kyc/consents/{id}/grant` - Grant consent
- `POST /api/v1/kyc/consents/{id}/revoke` - Revoke consent

### Admin
- `GET /api/v1/admin/applications` - Get all applications
- `GET /api/v1/admin/applications/review-queue` - Get review queue
- `GET /api/v1/admin/applications/{id}` - Get application details
- `POST /api/v1/admin/applications/{id}/approve` - Approve application
- `POST /api/v1/admin/applications/{id}/reject` - Reject application
- `GET /api/v1/admin/metrics` - Get dashboard metrics
- `GET /api/v1/admin/face-dedupe-queue` - Get face dedupe queue
- `GET /api/v1/admin/blockchain-records` - Get blockchain records
- `GET /api/v1/admin/blockchain-records/{ukn}` - Get record by UKN

### Institution
- `GET /api/v1/institution/resolve-kyc/{ukn}` - Resolve UKN to KYC data
- `POST /api/v1/institution/request-consent/{ukn}` - Request user consent
- `GET /api/v1/institution/validate-consent/{ukn}` - Validate consent

See full API documentation at `http://localhost:8000/docs`

## 🧪 Testing

### Backend Tests

```bash
cd backend

# Run all tests
pytest -v

# Run specific test file
pytest tests/test_auth.py -v

# Run with coverage
pytest --cov=app --cov-report=html

# Run quietly
pytest -q
```

#### Test Files

1. **test_auth.py** - Authentication endpoints
   - User registration
   - Login success/failure
   - Token validation
   - Invalid credentials handling

2. **test_admin_applications.py** - Admin application management
   - Get all applications
   - Approve/reject applications
   - Review queue filtering
   - Role-based access control
   - Large batch operations (2000+ applications)

3. **test_admin_metrics.py** - Dashboard metrics
   - Metrics calculation
   - Status aggregation

4. **test_kyc_user_workflow.py** - User KYC workflow
   - Application creation
   - Document upload
   - Processing workflow

5. **test_blockchain_records.py** - Blockchain integration
   - Record retrieval
   - UKN lookup
   - Hash verification

6. **test_face_dedupe.py** - Face deduplication
   - Duplicate detection
   - False positive handling

7. **test_ukn_lookup.py** - UKN resolution
   - Institution access
   - Consent validation
   - Expired KYC handling

8. **test_e2e_integration.py** - End-to-end workflow
   - Complete user journey
   - Admin approval
   - Institution access

### Frontend Tests

```bash
# Run all tests
npm test

# Run without watch mode
npm test -- --watchAll=false

# Run with coverage
npm test -- --coverage

# Run specific test file
npm test -- ApiIntegration.test.ts
```

#### Test Files

1. **ApiIntegration.test.ts** - Frontend-Backend API integration
   - Authentication API calls
   - Admin API calls
   - KYC API calls
   - Institution API calls
   - Error handling
   - End-to-end workflow

2. **Login.test.tsx** - Login page
   - Form rendering
   - Success/failure handling
   - Navigation

3. **AdminDashboard.test.tsx** - Dashboard functionality
   - Metrics loading
   - Data display

4. **ApplicationsList.test.tsx** - Applications table
   - Data rendering
   - Filtering

5. **ApplicationDetail.test.tsx** - Application details
   - Data display
   - Approve/reject actions

6. **SettingsPage.test.tsx** - Settings
   - Dark mode toggle
   - Preference persistence

### Test Coverage Requirements

#### Backend
- **Minimum**: 80% code coverage
- **Critical paths**: 100% coverage
  - Authentication
  - Application approval/rejection
  - UKN generation
  - Blockchain record creation

#### Frontend
- **Minimum**: 70% code coverage
- **Critical paths**: 100% coverage
  - Login flow
  - Application approval/rejection
  - Navigation

### Hard Test Cases

#### Backend
1. Invalid Login → 401
2. Missing JWT → 401
3. Invalid Document Upload → 400
4. Approve without Reviewer Role → 403
5. Large Batch Insert (2000 applications)
6. Slow OCR Timeout simulation
7. Face Dedupe False Positive
8. Blockchain Hash Mismatch → 409
9. UKN Lookup without Consent → 403
10. Incorrect Schema → Validation error

#### Frontend
1. Login Failure → Error message display
2. API Error Handling → User-friendly messages
3. Network Failure → Retry mechanism
4. Invalid Form Data → Validation errors
5. Unauthorized Access → Redirect to login

## 🛠️ Development

### Environment Variables

Create a `.env` file in the backend directory:

```env
SECRET_KEY=your-secret-key-here
DATABASE_URL=sqlite:///./kyc.db
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
```

For frontend, create `.env` in root:

```env
VITE_API_BASE_URL=http://localhost:8000/api/v1
```

### Database Migrations

When adding new database fields, create migration scripts:

```bash
python migrate_add_<feature>.py
```

### Frontend-Backend Connection

- **Backend Port**: 8000 (default)
- **Frontend Port**: 5173 (Vite default)
- **API Base URL**: `http://localhost:8000/api/v1`
- **CORS**: Configured to allow requests from frontend origin

### Performance Optimizations

The frontend includes several performance optimizations:

- **Code Splitting**: Route-level and component-level lazy loading
- **React Optimizations**: React.memo, useCallback, optimized QueryClient
- **Build Optimizations**: Vendor chunking, tree shaking, minification
- **Bundle Size**: Initial bundle ~500KB (main chunk), lazy chunks loaded on demand
- **Query Caching**: 5-minute stale time for API queries

## 📦 Deployment

### Backend Deployment

1. Set up production database (PostgreSQL recommended)
2. Update `DATABASE_URL` in environment variables
3. Set `SECRET_KEY` for JWT tokens
4. Configure CORS origins for production domain
5. Deploy using Docker or cloud platform (AWS, GCP, Azure)

Example Dockerfile:
```dockerfile
FROM python:3.10-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Frontend Deployment

1. Build production bundle:
```bash
npm run build
```

2. Deploy `dist/` folder to:
   - Vercel
   - Netlify
   - AWS S3 + CloudFront
   - Any static hosting service

3. Update API base URL in production environment variables

## 🔍 Troubleshooting

### Backend Issues

#### "Failed to fetch" Error
- **Cause:** Backend is not running
- **Solution:** Start the backend using `uvicorn main:app --reload`

#### Port Already in Use
- **Cause:** Another process is using port 8000
- **Solution:** 
  - Kill the process using port 8000, or
  - Change the port in `main.py` and update frontend `API_BASE_URL`

#### Database Errors
- **Cause:** Database schema mismatch
- **Solution:** Run migration scripts:
  ```bash
  python migrate_add_ukn.py
  python migrate_add_user_details.py
  ```

#### Import Errors
- **Cause:** Missing dependencies
- **Solution:** Install requirements:
  ```bash
  pip install -r requirements.txt
  ```

#### EasyOCR Installation Issues

**On Ubuntu/Debian:**
```bash
sudo apt-get update
sudo apt-get install libgl1-mesa-glx libglib2.0-0
```

**On macOS:**
```bash
brew install libpng jpeg libtiff
```

**On Windows:**
EasyOCR should work out of the box with the pip install.

#### Face Recognition Issues

If `face_recognition` fails, try installing dlib first:

```bash
pip install dlib
pip install face-recognition
```

On some systems, you may need CMake:
```bash
# On macOS
brew install cmake

# On Ubuntu/Debian
sudo apt-get install cmake
```

### Frontend Issues

#### Build Errors
- Check for TypeScript errors: `npm run build`
- Verify all dependencies are installed: `npm install`
- Check for missing environment variables

#### API Connection Issues
- Verify backend is running on port 8000
- Check CORS configuration in backend
- Verify `VITE_API_BASE_URL` in frontend `.env`

#### Test Failures
- Clear Jest cache: `npm test -- --clearCache`
- Verify mocks are set up correctly
- Check for missing dependencies

## 🔗 Integration Status

### Frontend-Backend Integration ✅

All frontend pages are properly integrated with backend API endpoints:

- ✅ Authentication endpoints (`/api/v1/auth/*`)
- ✅ Admin endpoints (`/api/v1/admin/*`)
- ✅ KYC endpoints (`/api/v1/kyc/*`)
- ✅ Institution endpoints (`/api/v1/institution/*`)

### State Management

- ✅ Zustand store for global state
- ✅ Settings persist to localStorage
- ✅ Applications fetched from API on mount
- ✅ Real-time data updates after approve/reject

### Error Handling

- ✅ Network errors handled gracefully
- ✅ 401/403 errors redirect to login
- ✅ 404 errors show user-friendly messages
- ✅ 410 errors indicate expired KYC
- ✅ Toast notifications for success/error states

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Write tests for new features
- Follow existing code style
- Update documentation
- Ensure all tests pass before submitting PR

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- **PaddleOCR/EasyOCR** for document text extraction
- **DeepFace** for face recognition
- **Shadcn/ui** for beautiful UI components
- **FastAPI** for the robust backend framework
- **React** team for the amazing frontend framework

## 📞 Support

For support, email support@identiq.com or open an issue in the GitHub repository.

## 🔗 Links

- [API Reference](http://localhost:8000/docs)
- [Issue Tracker](https://github.com/yourusername/secure-kyc-chain/issues)

---

Made with ❤️ by the IdentiQ Team
