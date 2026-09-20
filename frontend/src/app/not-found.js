export const metadata = {
  title: "404: This page could not be found",
};

export default function GlobalNotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] text-[#0F172A]">
      <div className="flex items-center space-x-6">
        <h1 className="text-3xl font-medium border-r border-[#E2E8F0] pr-6">404</h1>
        <h2 className="text-base font-normal">This page could not be found.</h2>
      </div>
    </div>
  );
}
