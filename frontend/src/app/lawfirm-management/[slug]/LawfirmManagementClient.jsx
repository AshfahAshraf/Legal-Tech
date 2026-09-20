"use client";
import { API_BASE_URL } from "@/utils/api";

import { useEffect, useState } from "react";
import LawfirmAdd from "@/views/UI/LawfirmManagement/LawfirmAdd";
import AssignAdv from "@/views/UI/LawfirmManagement/AssignAdv";
import LawfirmTableView from "@/views/UI/LawfirmManagement/lawfirmtableview";
import { useRouter, useSearchParams } from "next/navigation";

export default function LawfirmManagementClient({
  slug,
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const advocateId = searchParams.get("id");
  const [advocate, setAdvocate] = useState(null);

  const handleClose = () => {
    router.push("/lawfirm-management");
  };

  const fetchAdvocate = async () => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/lawfirm-management/${advocateId}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch advocate");
      }

      const data = await response.json();
      setAdvocate(data);
    } catch (error) {
      console.error("Error fetching advocate:", error);
    }
  };

  useEffect(() => {
    if (slug === "view" && advocateId) {
      fetchAdvocate();
    }
  }, [slug, advocateId]);

  if (slug === "add-manage-firm") {
    return <LawfirmAdd onCancel={handleClose} />;
  }

  if (slug === "assign-advocate") {
    return <AssignAdv isOpen={true} onClose={handleClose} />;
  }

  if (slug === "view") {
    if (!advocate) {
      return <div>Loading...</div>;
    }

    return <LawfirmTableView advocate={advocate} />;
  }

  return <div>Page Not Found</div>;
}
