import { Suspense } from "react";
import LawfirmManagementClient from "./LawfirmManagementClient";

export async function generateStaticParams() {
  return [
    { slug: "assign-advocate" },
    { slug: "add-manage-firm" },
    { slug: "view" },
  ];
}

export const dynamicParams = true;

export default async function Page({ params }) {
  const resolvedParams = await params;
  const slug = resolvedParams?.slug;
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LawfirmManagementClient slug={slug} />
    </Suspense>
  );
}
