# ⚖️ LegalTech — Comprehensive Law Firm & Case Management System

![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js)
![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react)
![Python](https://img.shields.io/badge/Python-3.11-3776AB?style=for-the-badge&logo=python)
![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688?style=for-the-badge&logo=fastapi)
![MySQL](https://img.shields.io/badge/MySQL-Database-4479A1?style=for-the-badge&logo=mysql)
![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=for-the-badge&logo=docker)

**LegalTech** is a state-of-the-art legal management platform designed to streamline law firm workflows, automate case tracking, manage client consultations, process legal documents with AI-powered OCR, and seamlessly integrate with eCourts.

---

## ✨ Key Features

### 🏛️ Case & Court Management
- **Case Tracking**: Add, edit, track, and search cases with deep filtering and similar case recommendations.
- **eCourts Integration**: Automated sync with eCourts portals for hearing dates and case updates.
- **Clerk & Court Visit Logs**: Track physical court visits, file formatting status, and hearing updates.

### 📄 Document Scanner & OCR
- **AI OCR Panel**: Optical Character Recognition for digitizing scanned legal documents and physical court files.
- **Document Generation**: Automated legal document and notice builder using pre-defined templates.
- **Document Viewer**: Interactive in-browser document previewer and PDF export.

### 👥 Client & Consultation Portal
- **Consultation Scheduling**: Book, manage, and view history for client meetings.
- **Client Case Tracking**: Dedicated client interface for checking case status, upcoming dates, and uploaded documents.

### 💳 Finance & Billing
- **Invoicing & Payments**: Create invoices, manage payment histories, and accept online payments via **Razorpay**.
- **Financial Analytics**: Comprehensive financial summaries and law firm revenue tracking.

### 🔐 Role-Based Access Control (RBAC)
- **Granular Permissions**: Customized access workflows for Advocates, Junior Lawyers, Clerks, and Clients.
- **Task Management**: Kanban-style task boards for assigning and monitoring junior advocate assignments.

---

## 🛠️ Technology Stack

| Layer | Technologies Used |
| :--- | :--- |
| **Frontend** | Next.js 16, React 19, TailwindCSS, Lucide Icons, HTML2Canvas, JSPDF |
| **Backend** | Python 3.11, FastAPI, Uvicorn, Django REST framework, PyMySQL |
| **AI / Document Processing** | OpenCV, Ultralytics (YOLO), PyJWT, ReportLab |
| **Database** | MySQL |
| **Deployment** | Docker, Docker Compose, Nginx |

---

## 📁 Repository Structure

```
LegalTech/
├── frontend/                   # Next.js frontend application
│   ├── src/
│   │   ├── app/                # Next.js App Router pages
│   │   ├── components/         # Reusable UI components & layouts
│   │   ├── views/              # View components for Advocate, Clerk, Client & Admin
│   │   └── utils/              # API helpers, auth utils, and permission hooks
├── backend/                    # FastAPI / Python backend application
│   ├── app/                    # Case management, auth, permissions & API modules
├── docs/                       # Project documentation & integration guides
├── docker-compose.yml          # Production Docker configuration
├── docker-compose.dev.yml      # Local development Docker setup
└── DOCKER.md                   # Complete Docker deployment documentation
```

---

## 🚀 Quick Start Guide

### Prerequisites
- [Node.js](https://nodejs.org/) (v18+ recommended)
- [Python](https://www.python.org/) (v3.11+)
- [MySQL](https://www.mysql.com/) database instance
- [Docker](https://www.docker.com/) *(Optional, for containerized run)*

---

### Running Locally (Without Docker)

#### 1. Backend Setup
```bash
# Navigate to backend directory
cd backend

# Create & activate a virtual environment
python -m venv venv
# On Windows:
venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

# Install dependencies
pip install -r ../requirements.txt

# Run the backend server
uvicorn app.main:app --reload --port 8000
```

#### 2. Frontend Setup
```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

### Running with Docker

```bash
# Start development containers
docker compose -f docker-compose.dev.yml up --build
```
For full deployment instructions, see [DOCKER.md](DOCKER.md).

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.
