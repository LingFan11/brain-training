import { PageLayout } from "@/components/layout";
import { TrainingModuleList, QuickStats } from "@/components/home";

export default function Home() {
  return (
    <PageLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center pt-2 animate-fade-in">
          <h1 className="text-2xl font-bold text-gray-800">认知训练平台</h1>
          <p className="text-gray-600 mt-1">科学训练，提升认知能力</p>
        </div>

        {/* Quick Stats Summary */}
        <section className="animate-fade-in" style={{ animationDelay: "100ms" }}>
          <QuickStats />
        </section>

        {/* Training Modules */}
        <section>
          <h2 className="text-lg font-semibold text-gray-800 mb-3 animate-fade-in" style={{ animationDelay: "150ms" }}>
            训练模块
          </h2>
          <TrainingModuleList />
        </section>
      </div>
    </PageLayout>
  );
}
