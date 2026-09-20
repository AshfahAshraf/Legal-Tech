"use client";

import AddCaseForm from "@/views/UI/CaseManagement/AddCaseForm";

export default function EditCaseClient({ id }) {
  return <AddCaseForm editId={id} />;
}
