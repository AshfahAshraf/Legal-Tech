import SimilarCasesClient from "./SimilarCasesClient";

export default async function SimilarCasesPage({ params }) {
  const { id } = await params;
  return <SimilarCasesClient caseId={id} />;
}
