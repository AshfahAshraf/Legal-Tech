"""
Kerala Legal Fee Reference Data
================================
Sources:
  - Kerala Court Fees and Suits Valuation Act, 1959 (as amended 2024/2025)
  - Kerala Stamp Act, 1959
  - Kerala Advocates' Welfare Fund Amendment Act, 2026
  - eCourts e-Filing Rules (Kerala), 2021

All amounts in Indian Rupees (₹).
"""

# ──────────────────────────────────────────────────────────────────────────────
# Court Types
# ──────────────────────────────────────────────────────────────────────────────
COURT_TYPES = [
    "Munsiff Court",
    "Civil Judge (Junior Division)",
    "Chief Judicial Magistrate (CJM)",
    "Judicial First Class Magistrate (JFCM)",
    "District Court",
    "Sessions Court",
    "Family Court",
    "High Court of Kerala",
    "Motor Accidents Claims Tribunal (MACT)",
    "Debt Recovery Tribunal (DRT)",
    "Consumer Disputes Redressal Commission",
    "Labour Court",
    "Rent Control Court",
]

HIGH_COURTS = {"High Court of Kerala"}
SUBORDINATE_COURTS = set(COURT_TYPES) - HIGH_COURTS

# ──────────────────────────────────────────────────────────────────────────────
# Case / Proceeding Types
# ──────────────────────────────────────────────────────────────────────────────
CASE_TYPES = [
    # Civil
    "Civil Money Suit (Recovery of Money / Debt)",
    "Suit for Injunction (Temporary / Permanent)",
    "Suit for Declaration",
    "Suit for Specific Performance",
    "Suit for Partition",
    "Suit for Possession / Ejectment",
    "Execution Petition",
    "Memorandum of Appeal (Civil)",
    # Criminal
    "Criminal Complaint (Section 200 CrPC)",
    "Bail Application (Regular)",
    "Bail Application (Anticipatory)",
    "Criminal Revision Petition",
    "Criminal Appeal",
    "Criminal Misc. Petition",
    # NI Act
    "NI Act Section 138 (Cheque Bounce Complaint)",
    # Family
    "Divorce Petition (Dissolution of Marriage)",
    "Petition for Maintenance",
    "Petition for Custody of Child",
    "Domestic Violence Petition",
    # Other
    "Writ Petition (High Court)",
    "Original Petition (OP)",
    "Habeas Corpus Petition",
    "Contempt of Court Petition",
    "Motor Accident Claim (MACT)",
    "Consumer Complaint",
    "Other / Miscellaneous",
]

# ──────────────────────────────────────────────────────────────────────────────
# Schedule I — Ad Valorem Court Fees (Kerala Court Fees & Suits Valuation Act)
# Applied on: money suits, partition, specific performance, etc.
# Slabs: (up_to_amount, rate_percent, min_fee)
# For amount ABOVE the last slab, the last rate applies.
# ──────────────────────────────────────────────────────────────────────────────
SCHEDULE_I_SLABS = [
    {"upto": 1_000,      "rate": None, "fixed": 10.00},   # Fixed ₹10
    {"upto": 5_000,      "rate": 5.0,  "fixed": None},
    {"upto": 10_000,     "rate": 4.5,  "fixed": None},
    {"upto": 25_000,     "rate": 4.0,  "fixed": None},
    {"upto": 50_000,     "rate": 3.5,  "fixed": None},
    {"upto": 1_00_000,   "rate": 3.0,  "fixed": None},
    {"upto": 5_00_000,   "rate": 2.5,  "fixed": None},
    {"upto": None,       "rate": 2.0,  "fixed": None},    # Above ₹5 lakh
]

# Maximum court fee caps per court tier
SCHEDULE_I_MAX_CAP = {
    "Munsiff Court":            75_000.00,
    "Civil Judge (Junior Division)": 75_000.00,
    "District Court":          1_50_000.00,
    "High Court of Kerala":    3_00_000.00,
    "default":                 1_50_000.00,
}

# Case types that use Schedule I (ad valorem)
AD_VALOREM_CASE_TYPES = {
    "Civil Money Suit (Recovery of Money / Debt)",
    "Suit for Specific Performance",
    "Suit for Partition",
    "Suit for Possession / Ejectment",
    "Execution Petition",
    "Memorandum of Appeal (Civil)",
    "NI Act Section 138 (Cheque Bounce Complaint)",
    "Motor Accident Claim (MACT)",
}

# ──────────────────────────────────────────────────────────────────────────────
# Schedule II — Fixed Court Fees (Kerala Court Fees & Suits Valuation Act)
# ──────────────────────────────────────────────────────────────────────────────
SCHEDULE_II_FIXED = {
    "Suit for Injunction (Temporary / Permanent)":          500.00,
    "Suit for Declaration":                                  200.00,
    "Criminal Complaint (Section 200 CrPC)":                 20.00,
    "Bail Application (Regular)":                           100.00,
    "Bail Application (Anticipatory)":                      200.00,
    "Criminal Revision Petition":                           100.00,
    "Criminal Appeal":                                      100.00,
    "Criminal Misc. Petition":                               50.00,
    "Divorce Petition (Dissolution of Marriage)":          1_000.00,  # Kerala Finance Act 2024
    "Petition for Maintenance":                             200.00,
    "Petition for Custody of Child":                        200.00,
    "Domestic Violence Petition":                             0.00,   # Free filing
    "Writ Petition (High Court)":                           500.00,
    "Original Petition (OP)":                               200.00,
    "Habeas Corpus Petition":                               100.00,
    "Contempt of Court Petition":                           200.00,
    "Consumer Complaint":                                     0.00,   # No fee for consumers
    "Other / Miscellaneous":                                100.00,
}

# ──────────────────────────────────────────────────────────────────────────────
# Kerala Advocates' Welfare Fund & Stipend Stamps
# Kerala Advocates' Welfare Fund Amendment Act, 2026 (effective March 9, 2026)
# ──────────────────────────────────────────────────────────────────────────────
WELFARE_FUND_RATES = {
    "High Court of Kerala": {
        "welfare_fund_per_vakalatnama": 200.00,
        "stipend_per_vakalatnama":       50.00,
    },
    "default": {  # All subordinate courts, tribunals, authorities
        "welfare_fund_per_vakalatnama": 100.00,
        "stipend_per_vakalatnama":       25.00,
    },
}

# ──────────────────────────────────────────────────────────────────────────────
# Stamp Duty — Kerala Stamp Act, 1959 (as amended)
# For affidavits, vakalath, agreements, etc. (not property stamps — those need Registration Dept)
# ──────────────────────────────────────────────────────────────────────────────
STAMP_DUTY_TYPES = {
    "Affidavit":                            {"fixed": 100.00,  "ad_valorem_rate": None},
    "Affidavit (High Court)":               {"fixed": 200.00,  "ad_valorem_rate": None},
    "Vakalatnama / Power of Attorney":      {"fixed":  50.00,  "ad_valorem_rate": None},
    "Agreement / Contract":                 {"fixed": 100.00,  "ad_valorem_rate": None},
    "Indemnity Bond":                       {"fixed": None,    "ad_valorem_rate": 0.5},  # 0.5% of value
    "Surety Bond":                          {"fixed": None,    "ad_valorem_rate": 1.0},  # 1% of value
    "Sale Deed":                            {"fixed": None,    "ad_valorem_rate": 8.0},  # 8% of value
    "Lease Agreement":                      {"fixed": None,    "ad_valorem_rate": 1.0},  # 1% of annual rent
    "Mortgage Deed":                        {"fixed": None,    "ad_valorem_rate": 1.0},
    "Gift Deed":                            {"fixed": None,    "ad_valorem_rate": 5.0},
    "Notary Attestation":                   {"fixed":  50.00,  "ad_valorem_rate": None},
    "Other Document":                       {"fixed": 100.00,  "ad_valorem_rate": None},
}

# ──────────────────────────────────────────────────────────────────────────────
# e-Filing / DCMS Charges (eCourts 3.0, as of 2024–2026)
# ──────────────────────────────────────────────────────────────────────────────
EFILING_MODES = ["Physical Filing", "e-Filing (eCourts 3.0)", "DCMS Portal"]

EFILING_CHARGES = {
    "Physical Filing":          0.00,   # No separate portal fee
    "e-Filing (eCourts 3.0)":   0.00,   # Currently free for advocates
    "DCMS Portal":              0.00,   # Currently free
}

# Certified copy charges (per applicable)
CERTIFIED_COPY_PER_PAGE  = 5.00
CERTIFIED_COPY_APP_FEE   = 25.00

# ──────────────────────────────────────────────────────────────────────────────
# Miscellaneous Expense Types
# ──────────────────────────────────────────────────────────────────────────────
MISC_EXPENSE_TYPES = [
    "Typing / Drafting Charges",
    "Photocopying / Printing",
    "Courier / Speed Post",
    "Travel / Conveyance",
    "Notary Charges",
    "Translation Charges",
    "Certified Copy Charges",
    "Expert Witness Fee",
    "Process Fee (Summons / Notice)",
    "Vakalat Stamp / Welfare Stamp Purchase",
    "Miscellaneous / Other",
]

# ──────────────────────────────────────────────────────────────────────────────
# GST
# GST applies ONLY on advocate professional fee (18%), NOT on court fees,
# stamp duty, welfare fund stamps, or misc expenses.
# Threshold: Mandatory if advocate turnover > ₹20 lakh/year.
# ──────────────────────────────────────────────────────────────────────────────
GST_RATE_ON_ADVOCATE_FEE = 18.0  # percent


# ──────────────────────────────────────────────────────────────────────────────
# Calculation Helpers
# ──────────────────────────────────────────────────────────────────────────────

def calculate_court_fee(case_type: str, suit_value: float = 0.0, court_type: str = "District Court") -> float:
    """
    Auto-calculate court fee based on Kerala law.
    - Ad valorem cases: use Schedule I slabs.
    - Fixed fee cases: use Schedule II.
    Returns the computed fee rounded to 2 decimal places.
    """
    if case_type in AD_VALOREM_CASE_TYPES:
        return _schedule_i(suit_value, court_type)
    return SCHEDULE_II_FIXED.get(case_type, 0.0)


def _schedule_i(value: float, court_type: str) -> float:
    """Apply Kerala Schedule I ad valorem slabs."""
    if value <= 0:
        return 0.0

    fee = 0.0
    prev_upto = 0.0

    for slab in SCHEDULE_I_SLABS:
        upto = slab["upto"]
        rate = slab["rate"]
        fixed = slab["fixed"]

        if fixed is not None:
            # Pure fixed fee slab (upto ₹1,000 → ₹10 fixed)
            if value <= (upto or float("inf")):
                fee = fixed
                break
        else:
            slab_limit = upto if upto is not None else float("inf")
            if value <= slab_limit:
                fee += (value - prev_upto) * rate / 100
                break
            else:
                if upto is not None:
                    fee += (upto - prev_upto) * rate / 100
                    prev_upto = upto
                else:
                    fee += (value - prev_upto) * rate / 100
                    break

    # Apply court-type max cap
    cap = SCHEDULE_I_MAX_CAP.get(court_type, SCHEDULE_I_MAX_CAP["default"])
    fee = min(fee, cap)

    return round(fee, 2)


def calculate_welfare_fund(court_type: str, vakalatnama_count: int = 1) -> dict:
    """
    Returns welfare fund + stipend stamp amounts for the given court type.
    Uses 2026 rates (Kerala Advocates' Welfare Fund Amendment Act, 2026).
    """
    rates = WELFARE_FUND_RATES.get(court_type, WELFARE_FUND_RATES["default"])
    return {
        "welfare_fund": round(rates["welfare_fund_per_vakalatnama"] * vakalatnama_count, 2),
        "stipend":      round(rates["stipend_per_vakalatnama"] * vakalatnama_count, 2),
    }


def calculate_stamp_duty(doc_type: str, value: float = 0.0) -> float:
    """
    Returns stamp duty for the given document type.
    Fixed types return the fixed amount.
    Ad valorem types return rate% of value.
    """
    info = STAMP_DUTY_TYPES.get(doc_type, {"fixed": 0.0, "ad_valorem_rate": None})
    if info["fixed"] is not None:
        return info["fixed"]
    if info["ad_valorem_rate"] is not None and value > 0:
        return round(value * info["ad_valorem_rate"] / 100, 2)
    return 0.0


def calculate_gst(advocate_fee: float, apply_gst: bool = False) -> float:
    """
    GST applies at 18% ONLY on the advocate professional fee.
    apply_gst should be True if advocate is GST-registered.
    """
    if not apply_gst or advocate_fee <= 0:
        return 0.0
    return round(advocate_fee * GST_RATE_ON_ADVOCATE_FEE / 100, 2)
