import PermissionsSlugClient from "./PermissionsSlugClient";

export async function generateStaticParams() {
  return [
    { slug: "roles" },
    { slug: "users" },
  ];
}

export const dynamicParams = true;

export default async function Page({ params }) {
  const resolvedParams = await params;
  const slug = resolvedParams?.slug;
  return <PermissionsSlugClient slug={slug} />;
}

