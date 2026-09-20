import React from "react";
import ClientSlugClient from "./ClientSlugClient";

export async function generateStaticParams() {
  return [
    { slug: "case-tracking" },
    { slug: "view-history" },
    { slug: "edit-client" },
  ];
}

export const dynamicParams = true;

export default async function Page({ params }) {
  const resolvedParams = await params;
  const slug = resolvedParams?.slug;
  return <ClientSlugClient slug={slug} />;
}

