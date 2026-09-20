import React from "react";
import LeaveManagementView from "@/views/UI/LeaveManagement/LeaveManagementView";

export default function Page() {
  return (
    <div>
      <LeaveManagementView viewMode="junior" moduleKey="Junior Leave" />
    </div>
  );
}
