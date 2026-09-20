import os
from datetime import datetime
from typing import Optional, List

from .schemas import (
    eCourtsCaseDetails,
    TimelineEvent,
    OrderDocumentItem,
    CauseListItem,
    CaseSearchRequest,
)


class BaseeCourtsProvider:
    def lookup_by_cnr(self, cnr_number: str) -> Optional[eCourtsCaseDetails]:
        raise NotImplementedError

    def search_cases(self, params: CaseSearchRequest) -> List[eCourtsCaseDetails]:
        raise NotImplementedError

    def get_cause_list(
        self, court_name: Optional[str], date_str: Optional[str], advocate_name: Optional[str]
    ) -> List[CauseListItem]:
        raise NotImplementedError


class LiveeCourtsProvider(BaseeCourtsProvider):
    """
    Live API adapter for official eCourts India REST API (webapi.ecourtsindia.com).
    Fetches live court data using official partner endpoints:
      - GET /api/partner/case/{cnr}
      - GET /api/partner/search
      - GET /api/partner/causelist/search
    """

    def __init__(self):
        try:
            from dotenv import load_dotenv
            backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
            env_file = os.path.join(backend_dir, ".env")
            if os.path.exists(env_file):
                load_dotenv(env_file, override=True)
            else:
                load_dotenv(override=True)
        except Exception as e:
            print(f"[eCourts] Note loading env: {e}")

        self.api_url = os.getenv("ECOURTS_API_URL", "https://webapi.ecourtsindia.com").rstrip("/")
        self.api_key = os.getenv("ECOURTS_API_KEY", "").strip()

    def lookup_by_cnr(self, cnr_number: str) -> Optional[eCourtsCaseDetails]:
        clean_cnr = cnr_number.strip().upper()

        try:
            import requests

            # If no API key, skip partner API calls and go straight to the
            # national eCourts portal — this works for any Indian state CNR.
            if not self.api_key:
                print("[eCourts] ECOURTS_API_KEY not set — falling back to live portal fetch.")
                return self._fetch_live_portal_cnr(clean_cnr)

            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "x-api-key": self.api_key,
                "Content-Type": "application/json",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept": "application/json",
            }

            # Endpoints to attempt (Official eCourts India REST API, NJDG & eCourts Portal endpoints)
            # All endpoints are national — no state-specific restriction.
            urls_to_try = [
                ("GET", f"{self.api_url}/api/partner/case/{clean_cnr}", None),
                ("GET", f"{self.api_url}/api/partner/case-detail?cnr={clean_cnr}", None),
                ("GET", f"{self.api_url}/api/partner/case-detail?cnr_number={clean_cnr}", None),
                ("GET", f"{self.api_url}/api/v1/case/{clean_cnr}", None),
                ("GET", f"https://services.ecourts.gov.in/ecourtindia_v6/cnr/{clean_cnr}", None),
                ("GET", f"https://ecourts.gov.in/api/case/cnr/{clean_cnr}", None),
                ("POST", f"https://services.ecourts.gov.in/ecourtindia_v6/pending_detail.php", {"cnr_no": clean_cnr}),
                ("POST", f"{self.api_url}/api/partner/case-detail", {"cnr_number": clean_cnr, "cnrNumber": clean_cnr, "cnr": clean_cnr}),
                ("POST", f"{self.api_url}/api/partner/case/lookup", {"cnr_number": clean_cnr, "cnrNumber": clean_cnr, "cnr": clean_cnr}),
                ("POST", f"{self.api_url}/case-detail", {"cnr_number": clean_cnr, "cnrNumber": clean_cnr}),
            ]

            resp = None
            for method, url, body in urls_to_try:
                try:
                    try:
                        print(f"[eCourts] Trying {method} {url} ...")
                    except Exception:
                        pass
                    if method == "GET":
                        r = requests.get(url, headers=headers, timeout=8)
                    else:
                        r = requests.post(url, json=body, headers=headers, timeout=8)

                    try:
                        print(f"[eCourts] {method} {url} -> HTTP {r.status_code}")
                    except Exception:
                        pass

                    if r.status_code == 200:
                        try:
                            safe_preview = r.content[:500].decode("utf-8", errors="replace")
                            print(f"[eCourts] SUCCESS response: {safe_preview}")
                        except Exception:
                            print("[eCourts] SUCCESS response received (preview unavailable).")
                        resp = r
                        break
                    else:
                        try:
                            print(f"[eCourts] Response ({r.status_code}): {r.content[:300].decode('utf-8', errors='replace')}")
                        except Exception:
                            pass
                except Exception as path_err:
                    try:
                        print(f"[eCourts] Request to {url} failed: {path_err}")
                    except Exception:
                        pass
                    continue

            # Check for billing error (402)
            if resp is not None and resp.status_code == 402:
                try:
                    err_body = resp.json()
                    err_msg = (
                        err_body.get("error", {}).get("message")
                        or "Insufficient eCourts API credits. Please recharge your account."
                    )
                except Exception:
                    err_msg = "Insufficient eCourts API credits. Please recharge your account."
                from fastapi import HTTPException as _HTTPException
                raise _HTTPException(status_code=402, detail=err_msg)

            # If all partner API endpoints failed, fall back to the national eCourts portal
            # (works for any Indian state — Maharashtra, Tamil Nadu, Karnataka, Kerala, etc.)
            if resp is None or resp.status_code != 200:
                try:
                    print(f"[eCourts] Partner API returned {resp.status_code if resp else 'no response'}. Trying live portal for {clean_cnr}...")
                except Exception:
                    pass
                portal_data = self._fetch_live_portal_cnr(clean_cnr)
                if portal_data:
                    return portal_data
                return None

            try:
                payload = resp.json()
            except Exception as json_err:
                print(f"[eCourts] Failed to parse JSON response: {json_err}")
                return None
            data_container = payload.get("data") or {}
            raw_data = data_container.get("courtCaseData") or payload.get("data") or payload.get("result") or payload.get("case") or payload

            if not isinstance(raw_data, dict):
                return None

            descriptions = data_container.get("descriptions") or {}
            enum_lookup = descriptions.get("enumLookup") or {}

            def _to_str(val):
                if isinstance(val, list):
                    return ", ".join(str(x) for x in val if x)
                if isinstance(val, dict):
                    return str(val.get("name") or val.get("title") or val)
                return str(val) if val is not None else ""

            petitioner_str = _to_str(raw_data.get("petitioners") or raw_data.get("petitioner") or raw_data.get("petitioner_name") or raw_data.get("appellant"))
            respondent_str = _to_str(raw_data.get("respondents") or raw_data.get("respondent") or raw_data.get("respondent_name"))
            case_title = (
                raw_data.get("caseTitle")
                or raw_data.get("case_title")
                or raw_data.get("title")
                or raw_data.get("case_name")
                or (f"{petitioner_str} vs. {respondent_str}" if petitioner_str or respondent_str else "Court Case")
            )

            pet_adv = _to_str(raw_data.get("petitionerAdvocates") or raw_data.get("petitionerAdvocate") or raw_data.get("petitioner_advocate") or raw_data.get("pet_adv"))
            res_adv = _to_str(raw_data.get("respondentAdvocates") or raw_data.get("respondentAdvocate") or raw_data.get("respondent_advocate") or raw_data.get("res_adv"))

            # Derive case type description
            case_type_code = raw_data.get("caseType") or raw_data.get("caseTypeRaw") or ""
            case_type_desc = enum_lookup.get("caseType", {}).get(case_type_code) or case_type_code
            if raw_data.get("caseTypeSub"):
                case_type_desc = f"{case_type_desc} - {raw_data.get('caseTypeSub')}" if case_type_desc else raw_data.get("caseTypeSub")

            # Derive court name description
            district_name = raw_data.get("district") or raw_data.get("district_name") or ""
            court_code_str = str(raw_data.get("cnrCourtCode") or raw_data.get("courtCode") or "")
            court_name_lookup = enum_lookup.get("courtCode", {}).get(court_code_str)
            if court_name_lookup and court_name_lookup.lower() == "unknown court":
                court_name_lookup = None

            court_name = (
                raw_data.get("courtName")
                or raw_data.get("court_name")
                or court_name_lookup
                or (f"{district_name} District Court" if district_name else "District Court")
            )

            timeline_items = []
            hearings = raw_data.get("historyOfCaseHearings") or raw_data.get("timeline") or raw_data.get("history") or []
            for idx, h in enumerate(hearings):
                if isinstance(h, dict):
                    purpose = h.get("purposeOfListing") or h.get("purpose") or h.get("stage") or "Hearing"
                    h_date = h.get("hearingDate") or h.get("businessOnDate") or h.get("date") or ""
                    judge_n = _to_str(h.get("judge") or raw_data.get("judges") or "Presiding Judge")
                    timeline_items.append(TimelineEvent(
                        id=str(idx + 1),
                        eventStage=purpose,
                        eventDate=h_date,
                        title=purpose,
                        description=f"Listed for {purpose} before {judge_n}",
                        benchName=judge_n,
                        courtHall=str(raw_data.get("courtNo") or raw_data.get("court_hall") or "Court Hall"),
                        documentUrl=h.get("order_url") or h.get("documentUrl") or h.get("order_link"),
                        status="Completed" if h.get("businessOnDate") else "Scheduled",
                    ))

            order_items = []
            orders = raw_data.get("judgmentOrders") or raw_data.get("interimOrders") or raw_data.get("orders") or []
            for idx, o in enumerate(orders):
                if isinstance(o, dict):
                    order_items.append(OrderDocumentItem(
                        id=str(o.get("id") or idx + 1),
                        orderDate=o.get("orderDate") or o.get("date") or "",
                        orderType=o.get("orderType") or o.get("type") or "Order",
                        judgeName=_to_str(o.get("judge") or raw_data.get("judges")),
                        summary=o.get("summary") or o.get("subject") or "Court Order",
                        fileUrl=o.get("file_url") or o.get("fileUrl") or o.get("order_url") or "",
                        fileSize=o.get("file_size") or o.get("fileSize") or "1.0 MB"
                    ))

            court_hall_val = str(raw_data.get("courtNo") or raw_data.get("courtHall") or "")
            if court_hall_val and not court_hall_val.lower().startswith("court"):
                court_hall_val = f"Court {court_hall_val}"

            case_number_val = (
                raw_data.get("registrationNumber")
                or raw_data.get("filingNumber")
                or raw_data.get("caseNumber")
                or raw_data.get("case_no")
                or ""
            )

            status_val = raw_data.get("caseStatus") or raw_data.get("status") or "PENDING"

            return eCourtsCaseDetails(
                cnrNumber=raw_data.get("cnr") or raw_data.get("cnrNumber") or raw_data.get("cnr_number") or clean_cnr,
                caseTitle=case_title,
                caseType=case_type_desc,
                caseNo=case_number_val,
                filingDate=raw_data.get("filingDate") or raw_data.get("filing_date") or "",
                registrationDate=raw_data.get("registrationDate") or raw_data.get("registration_date") or "",
                petitioner=petitioner_str,
                respondent=respondent_str,
                petitionerAdvocate=pet_adv,
                respondentAdvocate=res_adv,
                courtName=court_name,
                courtType=raw_data.get("courtType") or raw_data.get("court_type") or "Magistrate Court",
                district=district_name,
                state=raw_data.get("state") or raw_data.get("state_name") or "",
                presidingJudge=_to_str(raw_data.get("judges") or raw_data.get("presidingJudge") or raw_data.get("judge")),
                courtHall=court_hall_val,
                caseStage=raw_data.get("purpose") or raw_data.get("stageOfCaseRaw") or raw_data.get("caseStage") or raw_data.get("stage") or "",
                status=status_val,
                caseCategory=raw_data.get("caseCategory") or raw_data.get("category") or raw_data.get("case_category") or "",
                actSection=raw_data.get("act") or raw_data.get("actSection") or raw_data.get("act_section") or "",
                nextHearingDate=raw_data.get("nextHearingDate") or raw_data.get("next_hearing_date") or raw_data.get("next_date") or "",
                timeline=timeline_items,
                orders=order_items,
            )
            print(f"[eCourts] Live API call finished with no result.")
        except Exception as err:
            print(f"[eCourts] Live API call error: {err}")

        return None

    def _fetch_live_portal_cnr(self, clean_cnr: str) -> Optional[eCourtsCaseDetails]:
        """
        Scrapes/parses live eCourts India web portal if partner endpoints are inaccessible or return 404.
        """
        try:
            import requests
            import re
            
            portal_url = f"https://services.ecourts.gov.in/ecourtindia_v6/?p=home/index&app_token=1&cnr_no={clean_cnr}"
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "Accept-Language": "en-US,en;q=0.9",
            }
            res = requests.get(portal_url, headers=headers, timeout=6)
            if res.status_code == 200 and ("Case Details" in res.text or "Petitioners" in res.text or "Petitioner" in res.text):
                html = res.text
                
                # Extract Title / Parties
                petitioner = ""
                respondent = ""
                pet_match = re.search(r"Petitioner\s*(?:Name)?\s*[:\-]\s*([^<>\n\r]+)", html, re.I)
                if pet_match: petitioner = pet_match.group(1).strip()
                res_match = re.search(r"Respondent\s*(?:Name)?\s*[:\-]\s*([^<>\n\r]+)", html, re.I)
                if res_match: respondent = res_match.group(1).strip()
                
                # Extract Court
                court_name = ""
                court_match = re.search(r"Court\s*Name\s*[:\-]\s*([^<>\n\r]+)", html, re.I)
                if court_match: court_name = court_match.group(1).strip()
                
                # Extract Case Type
                case_type = ""
                type_match = re.search(r"Case\s*Type\s*[:\-]\s*([^<>\n\r]+)", html, re.I)
                if type_match: case_type = type_match.group(1).strip()
                
                # Extract district from court name or CNR
                district = ""
                dist_match = re.search(r"District\s*[:\-]\s*([^<>\n\r]+)", html, re.I)
                if dist_match: district = dist_match.group(1).strip()
                
                # Extract Case No
                case_no = clean_cnr
                no_match = re.search(r"Reg(?:istration)?\s*no\s*[:\-]\s*([^<>\n\r]+)", html, re.I)
                if no_match: case_no = no_match.group(1).strip()
                
                case_title = f"{petitioner} vs. {respondent}" if petitioner and respondent else ""
                
                return eCourtsCaseDetails(
                    cnrNumber=clean_cnr,
                    caseTitle=case_title,
                    caseType=case_type,
                    caseNo=case_no,
                    filingDate="",
                    registrationDate="",
                    petitioner=petitioner,
                    respondent=respondent,
                    petitionerAdvocate="",
                    respondentAdvocate="",
                    courtName=court_name,
                    courtType="Family Court" if "family" in court_name.lower() else "District Court" if court_name else "",
                    district=district,
                    state="",
                    presidingJudge="",
                    courtHall="",
                    caseStage="",
                    status="PENDING",
                    nextHearingDate="",
                    timeline=[],
                    orders=[]
                )
        except Exception as e:
            print(f"[eCourts] Live portal scrape note: {e}")
        return None

    def search_cases(self, params: CaseSearchRequest) -> List[eCourtsCaseDetails]:
        if not self.api_key:
            return []
        try:
            import requests
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }
            # GET /api/partner/search endpoint
            query_params = {
                "query": params.caseNumber or params.caseType or "",
                "pageSize": 50
            }
            resp = requests.get(
                f"{self.api_url}/api/partner/search",
                params=query_params,
                headers=headers,
                timeout=12
            )
            if resp.status_code == 200:
                payload = resp.json()
                data_obj = payload.get("data", {})
                results = data_obj.get("results") or payload.get("results") or []
                parsed_list = []
                for item in results:
                    parsed_list.append(eCourtsCaseDetails(
                        cnrNumber=item.get("cnr") or item.get("cnr_number") or "",
                        caseTitle=item.get("caseTitle") or item.get("case_title") or "",
                        caseType=item.get("caseType") or item.get("case_type") or "",
                        caseNo=item.get("caseNo") or item.get("case_no") or "",
                        filingDate=item.get("filingDate") or item.get("filing_date") or "",
                        registrationDate=item.get("registrationDate") or item.get("registration_date") or "",
                        petitioner=", ".join(item.get("petitioners", [])) if isinstance(item.get("petitioners"), list) else str(item.get("petitioner", "")),
                        respondent=", ".join(item.get("respondents", [])) if isinstance(item.get("respondents"), list) else str(item.get("respondent", "")),
                        petitionerAdvocate=item.get("petitioner_advocate") or "",
                        respondentAdvocate=item.get("respondent_advocate") or "",
                        courtName=item.get("courtName") or item.get("court_name") or "",
                        courtType=item.get("court_type") or "",
                        district=item.get("district") or "",
                        state=item.get("state") or "",
                        presidingJudge=item.get("judge") or "",
                        courtHall=item.get("court_hall") or "",
                        caseStage=item.get("stage") or "",
                        status=item.get("caseStatus") or item.get("status") or "",
                        nextHearingDate=item.get("next_hearing_date") or "",
                        timeline=[],
                        orders=[]
                    ))
                return parsed_list
        except Exception as err:
            print(f"eCourts Live Search error: {err}")
        return []

    def get_cause_list(
        self, court_name: Optional[str], date_str: Optional[str], advocate_name: Optional[str]
    ) -> List[CauseListItem]:
        if not self.api_key:
            return []
        try:
            import requests
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }
            params = {}
            if court_name:
                params["courtName"] = court_name
            if date_str:
                params["date"] = date_str
            if advocate_name:
                params["advocateName"] = advocate_name

            resp = requests.get(f"{self.api_url}/api/partner/causelist/search", params=params, headers=headers, timeout=12)
            if resp.status_code == 200:
                payload = resp.json()
                data_obj = payload.get("data", {})
                items = data_obj.get("results") or payload.get("items") or []
                parsed_cause_list = []
                for item in items:
                    parsed_cause_list.append(CauseListItem(
                        id=str(item.get("id") or ""),
                        itemNo=item.get("item_no") or item.get("itemNo") or 0,
                        caseNo=item.get("case_no") or "",
                        caseTitle=item.get("case_title") or "",
                        petitioner=item.get("petitioner") or "",
                        respondent=item.get("respondent") or "",
                        stage=item.get("stage") or "",
                        courtHall=item.get("court_hall") or "",
                        judgeName=item.get("judge") or "",
                        cnrNumber=item.get("cnr_number") or item.get("cnr") or "",
                        timeSlot=item.get("time_slot") or "",
                    ))
                return parsed_cause_list
        except Exception as err:
            print(f"eCourts Live Cause List error: {err}")
        return []


def get_ecourts_provider() -> BaseeCourtsProvider:
    return LiveeCourtsProvider()

