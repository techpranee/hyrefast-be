# Migration Checklist: Supabase to Node.js + MongoDB

## Pre-Migration Setup ✅

- [x] Extended existing BE backend models
- [x] Created interview-specific models (InterviewTemplate, InterviewSession, InterviewResponse, CandidateVerification)
- [x] Extended Job model with interview assistant fields
- [x] Created interview controller with comprehensive CRUD operations
- [x] Added interview routes to existing route structure
- [x] Created migration script for data transfer
- [x] Added necessary dependencies to package.json
- [x] Created environment configuration template
- [x] Created migration test script

## Environment Configuration

### Required Environment Variables
```bash
# MongoDB
MONGODB_URI=mongodb://localhost:27017/interview-assistant

# Supabase (for migration)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Redis (for job queue)
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-jwt-secret-key

# File Upload
UPLOAD_PATH=./public/uploads
MAX_FILE_SIZE=50MB

# Email/SMS (for OTP)
EMAIL_SMTP_HOST=smtp.yourprovider.com
EMAIL_SMTP_USER=your-smtp-username
EMAIL_SMTP_PASS=your-smtp-password

# AWS S3 (if using)
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_S3_BUCKET=your-bucket

# AI/ML
OLLAMA_BASE_URL=https://ollama2.havenify.ai
WHISPER_API_KEY=your-whisper-api-key
```

## Installation Steps

### 1. Install Dependencies
```bash
cd be
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
# Edit .env with your actual values
```

### 3. Start MongoDB
```bash
# Using Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest

# Or using local installation
mongod --dbpath /path/to/your/db
```

### 4. Start Redis (for job queue)
```bash
# Using Docker
docker run -d -p 6379:6379 --name redis redis:alpine

# Or using local installation
redis-server
```

## Migration Execution

### 1. Backup Supabase Data
```bash
# Export Supabase data (recommended)
npx supabase db dump --file backup.sql
```

### 2. Run Migration Script
```bash
npm run migrate:supabase
```

### 3. Test Migration
```bash
npm run migrate:test
```

### 4. Start Application
```bash
npm start
```

## API Endpoints Added

### Interview Templates
- `POST /client/v1/interview/template` - Create template
- `GET /client/v1/interview/template` - List templates
- `GET /client/v1/interview/template/:id` - Get template
- `PUT /client/v1/interview/template/:id` - Update template
- `DELETE /client/v1/interview/template/:id` - Delete template

### Interview Sessions
- `POST /client/v1/interview/session` - Create session
- `GET /client/v1/interview/session` - List sessions
- `GET /client/v1/interview/session/:id` - Get session
- `PUT /client/v1/interview/session/:id` - Update session
- `POST /client/v1/interview/session/:id/complete` - Complete session
- `GET /client/v1/interview/session/:sessionId/responses` - Get responses
- `GET /client/v1/interview/session/:sessionId/analytics` - Get analytics

### Interview Responses
- `POST /client/v1/interview/response` - Submit response
- `GET /client/v1/interview/response/:id` - Get response

### Candidate Verification
- `POST /client/v1/interview/verify` - Create verification
- `POST /client/v1/interview/verify/otp` - Verify OTP
- `GET /client/v1/interview/verify/:id` - Get verification

### Job Analytics
- `GET /client/v1/interview/job/:jobId/analytics` - Get job analytics

## Data Models Extended

### Job Model Extensions
- `interviewTemplateId`: Reference to interview template
- `interviewConfig`: Interview configuration object
- `publicLinkSettings`: Public link settings for candidates
- `preRequisites`: Pre-interview requirements

### New Models
- **InterviewTemplate**: Question templates for different roles
- **InterviewSession**: Individual interview sessions
- **InterviewResponse**: Candidate responses to questions
- **CandidateVerification**: OTP-based candidate verification

## Post-Migration Tasks

### Immediate
- [ ] Update frontend API calls to use new endpoints
- [ ] Test all interview workflows
- [ ] Set up job queue for background processing
- [ ] Configure file upload handling
- [ ] Set up email/SMS services for OTP

### Backend Enhancements
- [ ] Implement background job processing for transcription
- [ ] Add AI analysis integration
- [ ] Set up file storage (S3 or local)
- [ ] Implement comprehensive logging
- [ ] Add API rate limiting
- [ ] Set up monitoring and alerts

### Frontend Updates
- [ ] Update API client to use new endpoints
- [ ] Add error handling for new response formats
- [ ] Update authentication flow if needed
- [ ] Test all interview features
- [ ] Update any hardcoded Supabase references

### DevOps
- [ ] Set up CI/CD for new backend
- [ ] Configure production database
- [ ] Set up Redis cluster for production
- [ ] Configure load balancing
- [ ] Set up SSL certificates
- [ ] Configure backup strategies

## Testing Checklist

### Functional Testing
- [ ] User registration and authentication
- [ ] Job creation and management
- [ ] Interview template creation
- [ ] Interview session management
- [ ] Response submission
- [ ] Candidate verification flow
- [ ] File upload/download
- [ ] Email/SMS notifications

### Performance Testing
- [ ] Database query performance
- [ ] File upload performance
- [ ] API response times
- [ ] Memory usage monitoring
- [ ] Concurrent user handling

### Security Testing
- [ ] Authentication mechanisms
- [ ] Authorization rules
- [ ] Input validation
- [ ] SQL injection prevention
- [ ] XSS protection
- [ ] File upload security

## Monitoring Setup

### Application Monitoring
- [ ] Error tracking (Sentry, Bugsnag)
- [ ] Performance monitoring (New Relic, DataDog)
- [ ] Log aggregation (ELK stack, Splunk)
- [ ] Health check endpoints

### Infrastructure Monitoring
- [ ] Server metrics
- [ ] Database performance
- [ ] Redis monitoring
- [ ] File storage monitoring

## Rollback Plan

### Emergency Rollback
1. Stop new backend application
2. Restore Supabase configuration
3. Update frontend to use Supabase endpoints
4. Verify all functionality

### Data Recovery
1. MongoDB to Supabase data sync script
2. File migration back to Supabase storage
3. User session restoration

## Success Criteria

- [ ] All data successfully migrated
- [ ] All API endpoints working
- [ ] Frontend integration complete
- [ ] Performance meets requirements
- [ ] Security measures implemented
- [ ] Monitoring in place
- [ ] Documentation updated

## Contact Information

- **Technical Lead**: [Your Name]
- **DevOps**: [DevOps Team]
- **QA**: [QA Team]
- **Support**: [Support Team]

---

**Migration Status**: Ready for execution
**Last Updated**: [Current Date]
**Version**: 1.0
