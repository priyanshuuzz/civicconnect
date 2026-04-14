# CivicConnect - Product Requirements Document

## Original Problem Statement
CivicConnect is a citizen-facing civic issue reporting and resolution platform designed for real-world government deployment. It bridges the gap between citizens and government authorities enabling seamless reporting, tracking, and resolution of local civic issues.

## Architecture
- **Frontend**: React + Tailwind CSS + Shadcn UI (port 3000)
- **Backend**: FastAPI + MongoDB (port 8001)
- **AI**: OpenAI GPT-5.2 via emergentintegrations for complaint categorization
- **Maps**: Leaflet + OpenStreetMap
- **Storage**: Emergent Object Storage for photo uploads
- **Auth**: JWT + Emergent Google OAuth (dual auth)

## User Personas
1. **Citizens** - Report civic issues, track tickets, communicate with officers
2. **Ward Officers** - Manage task queue, update ticket status, field assignments
3. **Admins** - City-wide analytics, user management, SLA oversight

## Core Requirements
- Issue reporting with photo upload, GPS location, AI categorization
- Status lifecycle: Submitted -> Assigned -> In Progress -> Resolved -> Closed
- SLA engine with automatic escalation at 50%/75%/100% thresholds
- Two-way messaging per ticket
- Public transparency map (anonymized, no login required)
- Duplicate detection within 50m radius
- Audit logging for all state changes
- Role-based access control (citizen/officer/admin)

## What's Been Implemented (April 14, 2026)
### Backend
- Complete RESTful API with 15+ endpoints
- JWT + Google OAuth authentication with RBAC
- MongoDB with geospatial indexes for duplicate detection
- AI categorization via OpenAI GPT-5.2 with rule-based fallback
- Emergent Object Storage for photo uploads
- Background SLA engine with automatic escalation
- Rate limiting (10 reports/day per user)
- Audit logging for all ticket actions
- Admin seeding (admin + officer accounts)

### Frontend
- Landing page with hero section and feature showcase
- Login/Register with dual auth (email + Google OAuth)
- Report Issue form with GPS, photo upload, AI auto-categorize
- Citizen Dashboard with ticket list, status filters, SLA badges
- Ticket Detail with status timeline, messaging, audit log
- Public Transparency Map with Leaflet, category markers, legend
- Officer Dashboard with task queue, SLA indicators, assign/resolve
- Admin Dashboard with analytics charts, user management
- Mobile-first responsive design

### Categories Taxonomy
Roads & Footpaths, Sanitation & Waste, Water & Drainage, Electricity & Lighting, Parks & Public Spaces, Stray Animals, Noise & Pollution, Other

## Prioritized Backlog

### P0 (Done)
- [x] Issue reporting with photos + GPS
- [x] Ticket lifecycle with status tracking
- [x] SLA engine with escalation
- [x] Two-way messaging
- [x] Public transparency map
- [x] Auth (JWT + Google OAuth)
- [x] Admin/Officer dashboards

### P1 (Next Phase)
- [ ] Multi-language support (Hindi, regional)
- [ ] Push notifications (Firebase)
- [ ] SMS notifications (Twilio)
- [ ] Offline support with sync
- [ ] Exportable reports (PDF/CSV)

### P2 (Future)
- [ ] Predictive maintenance ML
- [ ] Smart city sensor integration
- [ ] Community voting on issues
- [ ] Automated monthly reports
- [ ] Third-party ERP integration

## Test Credentials
- Admin: admin@civicconnect.gov.in / admin123
- Officer: officer@civicconnect.gov.in / officer123
