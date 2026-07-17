"use client";

import { useState } from "react";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Header } from "@/components/dashboard/header";
import { OverviewSection } from "@/components/dashboard/sections/overview";
import { PipelineSection } from "@/components/dashboard/sections/pipeline";
import { DealsSection } from "@/components/dashboard/sections/deals";
import { CustomersSection } from "@/components/dashboard/sections/customers";
import { TeamSection } from "@/components/dashboard/sections/team";
import { ForecastingSection } from "@/components/dashboard/sections/forecasting";
import { ReportsSection } from "@/components/dashboard/sections/reports";
import { SettingsSection } from "@/components/dashboard/sections/settings";
import { OrdersSection } from "@/components/dashboard/sections/orders";
import { StoreAnalyticsSection } from "@/components/dashboard/sections/store-analytics";

export type Section = "overview" | "pipeline" | "deals" | "orders" | "store" | "customers" | "team" | "forecasting" | "reports" | "settings";

const validSections: Section[] = ["overview", "pipeline", "deals", "orders", "store", "customers", "team", "forecasting", "reports", "settings"];

export default function Dashboard() {
  const [activeSection, setActiveSection] = useState<Section>(() => {
    if (typeof window === "undefined") return "overview";
    // Hash may carry a sub-tab (e.g. "store/products") — the section is the first segment
    const hash = window.location.hash.slice(1).split("/")[0] as Section;
    return validSections.includes(hash) ? hash : "overview";
  });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  function handleSectionChange(section: Section) {
    setActiveSection(section);
    window.location.hash = section;
  }

  const renderSection = () => {
    switch (activeSection) {
      case "overview":
        return <OverviewSection />;
      case "pipeline":
        return <PipelineSection />;
      case "deals":
        return <DealsSection />;
      case "customers":
        return <CustomersSection />;
      case "orders":
        return <OrdersSection />;
      case "store":
        return <StoreAnalyticsSection />;
      case "team":
        return <TeamSection />;
      case "forecasting":
        return <ForecastingSection />;
      case "reports":
        return <ReportsSection />;
      case "settings":
        return <SettingsSection />;
      default:
        return <OverviewSection />;
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar
        activeSection={activeSection}
        onSectionChange={handleSectionChange}
        collapsed={sidebarCollapsed}
        onCollapsedChange={setSidebarCollapsed}
        mobileOpen={mobileSidebarOpen}
        onMobileOpenChange={setMobileSidebarOpen}
      />
      <div
        className={`flex-1 flex flex-col transition-all duration-300 ease-out ml-0 ${
          sidebarCollapsed ? "lg:ml-[72px]" : "lg:ml-[260px]"
        }`}
      >
        <Header activeSection={activeSection} onMobileMenuToggle={() => setMobileSidebarOpen(true)} />
        <main className="flex-1 p-3 sm:p-6 overflow-auto">
          <div
            key={activeSection}
            className="animate-in fade-in slide-in-from-bottom-4 duration-500"
          >
            {renderSection()}
          </div>
        </main>
      </div>
    </div>
  );
}
