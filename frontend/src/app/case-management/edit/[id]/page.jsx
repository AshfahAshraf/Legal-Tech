import EditCaseClient from "./EditCaseClient";

export default async function EditCasePage({ params }) {
  const { id } = await params;
  return <EditCaseClient id={id} />;
}
