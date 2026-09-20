/**
 * Helper utility to determine if a case is considered sensitive
 * (e.g. Family Court, Sexual Offenses, POCSO, Domestic Violence, Matrimonial, Divorce, Custody, Juvenile).
 */
export function isSensitiveCase(caseObj) {
  if (!caseObj) return false;

  const textToSearch = [
    caseObj.case_type,
    caseObj.caseType,
    caseObj.court_name,
    caseObj.court_type,
    caseObj.court,
    caseObj.practice_court,
    caseObj.practice_area,
    caseObj.case_title,
    caseObj.case_name,
    caseObj.title,
    caseObj.category,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const sensitiveKeywords = [
    "family",
    "sexual",
    "pocso",
    "domestic violence",
    "matrimonial",
    "divorce",
    "custody",
    "juvenile",
    "rape",
    "assault",
    "posh",
    "alimony",
    "guardianship",
    "adoption",
  ];

  return sensitiveKeywords.some((kw) => textToSearch.includes(kw));
}
