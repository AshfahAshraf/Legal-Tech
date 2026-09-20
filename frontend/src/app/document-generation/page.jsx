import DocumentGenerationView from "@/views/UI/CaseManagement/DocumentGenerationView";


export default function DocumentGenerationPage() {
    return (
        <div className="flex-1 w-full bg-slate-50 min-h-screen">
            <div className="p-4 md:p-8 pt-6">
                <DocumentGenerationView />
            </div>
        </div>
    );
}
