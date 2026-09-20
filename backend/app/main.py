import os
from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from app.database import Base, engine, SessionLocal
from app.authapp.models import User
from app.authapp.seed import create_default_user
from app.advocate.consultations.models import Consultation
from app.advocate.finance_management.models import Invoice
from app.advocate.client_management.routes import router as client_router
from app.authapp import router as auth_router
from app.advocate.consultations import router as consultations_router
from app.advocate.finance_management import router as finance_router
from app.advocate.permissions import router as permissions_router
from app.advocate.lawfirm_management.routes import router as lawfirm_router
from app.advocate.case_management.routes import router as case_router
from app.utils.scheduler import start_scheduler
from app.advocate.dashboard import router as dashboard_router
from app.advocate.tasks import router as tasks_router
from app.advocate.tasks.models import Task, TaskMessage
from app.advocate.case_management.models import CaseDocumentWorkflow, CaseNote

# Clerk models and routers
from app.clerk.dashboard.models import ClerkTask
from app.clerk.dashboard import router as clerk_dashboard_router
from app.clerk.format_physical_file.models import ClerkPhysicalFile
from app.clerk.format_physical_file import router as clerk_format_physical_file_router
from app.clerk.court_visit.models import ClerkCourtVisit
from app.clerk.court_visit import router as clerk_court_visit_router
from app.clerk.efiling.models import ClerkEFilingRecord
from app.clerk.efiling import router as clerk_efiling_router

# OCR module
from app.ocr.models import OcrResult
from app.ocr import router as ocr_router




app = FastAPI()
# Application startup triggers seed_roles_and_permissions

from fastapi.staticfiles import StaticFiles
# Mount uploads directory to serve files statically
uploads_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uploads")
if not os.path.exists(uploads_dir):
    os.makedirs(uploads_dir)
app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    print("VALIDATION ERROR:", exc.errors())
    print("BODY:", exc.body)
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": exc.errors(), "body": exc.body},
    )

# CORS setup
_raw_origins = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:3000,http://127.0.0.1:3000"
)

ALLOWED_ORIGINS = [o.strip() for o in _raw_origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create tables
Base.metadata.create_all(bind=engine)


# Startup event
@app.on_event("startup")
def startup():
    db = SessionLocal()
    create_default_user(db)
    from app.advocate.permissions.service import seed_roles_and_permissions
    seed_roles_and_permissions(db)
    
    # Auto-seed database from database_seed.json if empty on startup
    try:
        from app.advocate.case_management.models import Case
        from sqlalchemy import MetaData, Table, text, inspect
        # If case table is empty, auto-seed the database
        case_count = db.query(Case).count()
        if case_count == 0:
            root_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            seed_path = os.path.join(root_dir, "database_seed.json")
            if os.path.exists(seed_path):
                print(f"Auto-importing database seed on startup from {seed_path}...")
                import json
                with open(seed_path, "r", encoding="utf-8") as f:
                    seed_data = json.load(f)
                
                inspector = inspect(engine)
                is_mysql = "mysql" in engine.url.drivername.lower()
                with engine.begin() as conn:
                    if is_mysql:
                        conn.execute(text("SET FOREIGN_KEY_CHECKS = 0;"))
                        
                    for t_name, rows in seed_data.items():
                        if inspector.has_table(t_name):
                            table = Table(t_name, MetaData(), autoload_with=engine)
                            conn.execute(table.delete())
                            if rows:
                                conn.execute(table.insert(), rows)
                                
                    if is_mysql:
                        conn.execute(text("SET FOREIGN_KEY_CHECKS = 1;"))
                print("Successfully auto-imported database state on startup.")
    except Exception as seed_err:
        print(f"Error auto-importing database state on startup: {seed_err}")
    
    # Clean up duplicate assigned cases
    try:
        from app.advocate.lawfirm_management.models import AssignedCase
        from sqlalchemy import func
        duplicates = db.query(
            AssignedCase.case_number,
            AssignedCase.advocate_name,
            func.max(AssignedCase.id).label('max_id')
        ).group_by(
            AssignedCase.case_number,
            AssignedCase.advocate_name
        ).having(
            func.count(AssignedCase.id) > 1
        ).all()
        
        deleted_count = 0
        for case_num, adv_name, max_id in duplicates:
            result = db.query(AssignedCase).filter(
                AssignedCase.case_number == case_num,
                AssignedCase.advocate_name == adv_name,
                AssignedCase.id != max_id
            ).delete(synchronize_session=False)
            deleted_count += result
        if deleted_count > 0:
            db.commit()
            print(f"Successfully cleaned up {deleted_count} duplicate assigned cases records.")
    except Exception as e:
        print(f"Error cleaning up duplicate assigned cases: {e}")
        
    db.close()

    # Automatically synchronize database schema with all SQLAlchemy models
    try:
        from sync_db_schema import sync_schema
        sync_schema()
    except Exception as e:
        print(f"Error synchronizing database schema on startup: {e}")

    # Start hearing reminder scheduler
    start_scheduler()


# Health check
@app.get("/health", tags=["Health"])
def health_check():
    return {"status": "ok"}


from app.advocate.leave_management.routes import router as leave_router
from app.advocate.ecourts.routes import router as ecourts_router

# Routers
app.include_router(auth_router)
app.include_router(consultations_router)
app.include_router(finance_router)
app.include_router(client_router)
app.include_router(lawfirm_router)
app.include_router(permissions_router)
app.include_router(case_router)
app.include_router(dashboard_router)
app.include_router(tasks_router)
app.include_router(clerk_dashboard_router)
app.include_router(clerk_format_physical_file_router)
app.include_router(clerk_court_visit_router)
app.include_router(clerk_efiling_router)
app.include_router(leave_router, prefix="/leaves", tags=["Leave Management"])
app.include_router(ecourts_router)
app.include_router(ocr_router)

