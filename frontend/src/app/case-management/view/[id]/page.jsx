import CaseDetailClient from "./CaseDetailClient";

export default async function CaseDetailPage({ params }) {
  const { id } = await params;
  return <CaseDetailClient id={id} />;
}
