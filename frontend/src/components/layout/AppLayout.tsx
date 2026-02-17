import Sidebar from "./Sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate, Outlet } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { useState } from "react";

export default function AppLayout() {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [sheetOpen, setSheetOpen] = useState(false);
  if (!user) return <Navigate to="/login" replace />;

  if (isMobile) {
    return (
      <div className="min-h-screen flex flex-col">
        <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-card ring-1 ring-border">
                <img src="/wmsu-seal.png" alt="WMSU seal" className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">WMSU HRMS</p>
                <p className="text-[11px] text-muted-foreground">Hiring Monitoring System</p>
              </div>
            </div>
            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" aria-label="Open menu">
                  <Menu className="w-4 h-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0">
                <Sidebar
                  collapsible={false}
                  className="w-full border-0"
                  onNavigate={() => setSheetOpen(false)}
                />
              </SheetContent>
            </Sheet>
          </div>
        </header>
        <main className="flex-1 overflow-auto">
          <div className="p-4 sm:p-6 max-w-7xl mx-auto animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="p-6 lg:p-8 max-w-7xl mx-auto animate-fade-in">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
