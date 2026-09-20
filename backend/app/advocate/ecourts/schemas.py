from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any


class CNRLookupRequest(BaseModel):
    cnrNumber: str = Field(..., description="16-character unique CNR number e.g. KLAL010012342026")


class CaseSearchRequest(BaseModel):
    state: Optional[str] = None
    district: Optional[str] = None
    courtName: Optional[str] = None
    caseType: Optional[str] = None
    caseNumber: Optional[str] = None
    year: Optional[str] = None


class TimelineEvent(BaseModel):
    id: Optional[str] = None
    eventStage: str  # e.g., 'Case Filed', 'First Hearing', 'Adjourned', 'Order Uploaded', 'Judgment Passed'
    eventDate: str
    title: str
    description: str
    benchName: Optional[str] = "Hon'ble Presiding Judge"
    courtHall: Optional[str] = "Court Hall 1"
    documentUrl: Optional[str] = None
    status: Optional[str] = "Completed"


class OrderDocumentItem(BaseModel):
    id: str
    orderDate: str
    orderType: str  # e.g., 'Interim Order', 'Daily Order', 'Final Judgment', 'Notice'
    judgeName: str
    summary: str
    fileUrl: str
    fileSize: Optional[str] = "1.2 MB"


class eCourtsCaseDetails(BaseModel):
    cnrNumber: str
    caseTitle: str
    caseType: str
    caseNo: str
    filingDate: str
    registrationDate: str
    petitioner: str
    respondent: str
    petitionerAdvocate: str
    respondentAdvocate: str
    courtName: str
    courtType: str
    district: str
    state: str
    presidingJudge: str
    courtHall: str
    caseStage: str
    status: str
    caseCategory: Optional[str] = None
    actSection: Optional[str] = None
    nextHearingDate: Optional[str] = None
    contactNumber: Optional[str] = None
    timeline: List[TimelineEvent] = []
    orders: List[OrderDocumentItem] = []


class SyncCaseResponse(BaseModel):
    success: bool
    message: str
    caseId: int
    cnrNumber: Optional[str] = None
    updatedFields: Dict[str, Any] = {}
    details: Optional[eCourtsCaseDetails] = None


class CauseListRequest(BaseModel):
    courtName: Optional[str] = None
    date: Optional[str] = None
    advocateName: Optional[str] = None


class CauseListItem(BaseModel):
    id: str
    itemNo: int
    caseNo: str
    caseTitle: str
    petitioner: str
    respondent: str
    stage: str
    courtHall: str
    judgeName: str
    cnrNumber: str
    timeSlot: Optional[str] = "10:30 AM"


class eCourtsDashboardMetrics(BaseModel):
    todaysHearings: int
    upcomingHearings: int
    casesUpdatedToday: int
    ordersDownloaded: int


# ─────────────────────────────────────────────────────────────────────────────
# Similar Case History Feature Schemas
# ─────────────────────────────────────────────────────────────────────────────

class SimilarCaseRequest(BaseModel):
    caseType: str
    courtType: Optional[str] = None
    courtName: Optional[str] = None
    caseId: Optional[int] = None          # Exclude the current case from results


class CaseAnalysisResult(BaseModel):
    cnrNumber: Optional[str] = None
    caseTitle: str
    caseNo: Optional[str] = None
    caseType: str
    courtName: str
    courtType: Optional[str] = None
    filingDate: Optional[str] = None
    outcome: str                          # "Won" | "Lost" | "Pending" | "Disposed" | "Unknown"
    outcomeDetail: str
    petitioner: str
    respondent: str
    mainArgument: str                     # Key legal argument / main issue
    loopholes: List[str]                  # Identified weaknesses / gaps
    importantSections: List[str]          # Key acts / sections cited e.g. "IPC 420"
    seniorAdvocateTip: Optional[str] = None # Strategic advice to win active case
    presidingJudge: Optional[str] = None
    nextHearingDate: Optional[str] = None
    source: str                           # "internal" | "ecourts"
    similarityScore: int                  # 0–100


class SimilarCasesResponse(BaseModel):
    totalFound: int
    internalCount: int
    ecourtsCount: int
    cases: List[CaseAnalysisResult]
    summaryStats: Dict[str, Any]          # { won, lost, pending, topActs }
    masterStrategy: Optional[Dict[str, Any]] = None # { winProbability, currentCaseSummary, winningFormula, mainLoophole, advocateRecommendation, keyLoopholes, mainArguments, importantActs }



