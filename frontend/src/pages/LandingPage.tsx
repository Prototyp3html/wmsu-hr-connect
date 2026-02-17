import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Briefcase,
  Users,
  ClipboardCheck,
  BarChart3,
  ArrowRight,
  Monitor,
  Shield,
} from "lucide-react";

const features = [
  {
    icon: Briefcase,
    title: "Job Vacancy Management",
    description: "Create, manage, and track open positions across all departments.",
  },
  {
    icon: Users,
    title: "Applicant Tracking",
    description: "Monitor applicants from submission through every stage of the hiring pipeline.",
  },
  {
    icon: ClipboardCheck,
    title: "Evaluation & Ranking",
    description: "Score exams and interviews, then automatically rank candidates per vacancy.",
  },
  {
    icon: BarChart3,
    title: "Reports & Analytics",
    description: "Generate hiring summaries, export PDFs, and gain data-driven insights.",
  },
];

const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Navbar */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-md">
        <div className="container mx-auto flex items-center justify-between h-16 px-4">
          <div className="flex items-center gap-3">
            <img
              src="/frontend/public/wmsu-seal.png"
              alt="WMSU Seal"
              className="w-9 h-9"
            />
            <span className="font-display text-lg font-bold text-foreground hidden sm:inline">
              WMSU HRMS
            </span>
          </div>
          <Button onClick={() => navigate("/login")} className="rounded-full px-6">
            Log In
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="flex-1 flex items-center">
        <div className="container mx-auto px-4 py-16 md:py-24">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left – Text */}
            <div className="space-y-6 max-w-xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent text-accent-foreground text-xs font-medium">
                <Shield className="w-3.5 h-3.5" />
                Internal HR System
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-[3.25rem] font-display font-bold leading-tight text-foreground">
                WMSU Job Hiring{" "}
                <span className="text-primary">Monitoring System</span>
              </h1>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Streamlining Recruitment and Hiring Management for the
                HR&nbsp;Office of Western Mindanao State University.
              </p>
              <p className="text-muted-foreground">
                Manage vacancies, track applicants, evaluate candidates, and
                generate reports — all in one secure platform.
              </p>
              <div className="flex gap-3 pt-2">
                <Button
                  size="lg"
                  className="rounded-full px-8 gap-2"
                  onClick={() => navigate("/login")}
                >
                  Go to Login
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Right – Illustration card */}
            <div className="hidden lg:flex justify-center">
              <div className="relative w-full max-w-md">
                <div className="absolute -inset-4 rounded-3xl bg-primary/5 blur-2xl" />
                <Card className="relative border-2 border-primary/10 shadow-xl rounded-2xl overflow-hidden">
                  <CardContent className="p-0">
                    <div className="bg-primary px-6 py-4 flex items-center gap-3">
                      <Monitor className="w-5 h-5 text-primary-foreground" />
                      <span className="text-primary-foreground font-medium text-sm">
                        Dashboard Preview
                      </span>
                    </div>
                    <div className="p-6 space-y-4">
                      {/* Mini stat cards */}
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { label: "Open Vacancies", value: "12" },
                          { label: "Total Applicants", value: "148" },
                          { label: "Under Screening", value: "37" },
                          { label: "Hired", value: "24" },
                        ].map((s) => (
                          <div
                            key={s.label}
                            className="rounded-lg bg-muted p-3 text-center"
                          >
                            <p className="text-2xl font-bold text-foreground">{s.value}</p>
                            <p className="text-[11px] text-muted-foreground">{s.label}</p>
                          </div>
                        ))}
                      </div>
                      {/* Mini bar chart illustration */}
                      <div className="flex items-end gap-1.5 h-16 pt-2">
                        {[40, 65, 50, 80, 55, 70, 45].map((h, i) => (
                          <div
                            key={i}
                            className="flex-1 rounded-t bg-primary/70"
                            style={{ height: `${h}%` }}
                          />
                        ))}
                      </div>
                      <p className="text-[10px] text-muted-foreground text-center">
                        Monthly hiring activity
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-border bg-card">
        <div className="container mx-auto px-4 py-16 md:py-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-display font-bold text-foreground">
              Core Features
            </h2>
            <p className="mt-2 text-muted-foreground max-w-lg mx-auto">
              Everything the HR Office needs to manage the hiring process efficiently.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f) => (
              <Card
                key={f.title}
                className="group card-hover border border-border rounded-xl"
              >
                <CardContent className="p-6 space-y-3">
                  <div className="w-11 h-11 rounded-lg bg-accent flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <f.icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-semibold text-foreground">{f.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {f.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* About */}
      <section className="border-t border-border">
        <div className="container mx-auto px-4 py-16 md:py-20 max-w-2xl text-center space-y-4">
          <h2 className="text-3xl font-display font-bold text-foreground">
            About This System
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            The WMSU Job Hiring Monitoring System is an internal tool developed
            for the Human Resource Management Office of Western Mindanao State
            University. It is designed to digitize and streamline the
            recruitment lifecycle — from posting vacancies and receiving
            applications to evaluating candidates and generating hiring reports.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            Access is restricted to authorized HR personnel only.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-foreground text-background">
        <div className="container mx-auto px-4 py-8 flex flex-col md:flex-row items-center justify-between gap-4 text-sm">
          <div className="flex items-center gap-3">
            <img
              src="/frontend/public/wmsu-seal.png"
              alt="WMSU Seal"
              className="w-7 h-7 brightness-200"
            />
            <span className="font-display font-semibold">
              WMSU Job Hiring Monitoring System
            </span>
          </div>
          <p className="text-background/60 text-xs">
            HR Office — Western Mindanao State University &copy;{" "}
            {new Date().getFullYear()}
          </p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
