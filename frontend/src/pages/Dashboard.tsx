import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { fetchApplicants, fetchApplications, fetchEvaluations, fetchJobs, fetchReportsSummary } from "@/lib/api";
import { allStatuses, getStatusColor } from "@/lib/status";
import { BodyText, LabelText, MetricValue, PageTitle, SectionTitle } from "@/components/ui/typography";
import { Award, Briefcase, FilterX, SlidersHorizontal, TrendingUp, UserCheck, Users } from "lucide-react";
import { Area, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const pieColors = [
  "hsl(217, 91%, 60%)",
  "hsl(38, 92%, 50%)",
  "hsl(348, 83%, 40%)",
  "hsl(190, 80%, 42%)",
  "hsl(142, 71%, 45%)"
];

function TrendTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name?: string; value?: number }>; label?: string }) {
  if (!active || !payload || payload.length === 0) return null;

  const applications = payload.find((item) => item.name === "Applications")?.value ?? 0;
  const hired = payload.find((item) => item.name === "Hired")?.value ?? 0;

  return (
    <div className="rounded-lg border border-border bg-card/95 shadow-md px-3 py-2 text-xs space-y-1">
      <BodyText className="font-semibold text-foreground">{label}</BodyText>
      <BodyText className="text-muted-foreground">
        <span className="font-medium text-foreground">Applications:</span> {applications}
      </BodyText>
      <BodyText className="text-muted-foreground">
        <span className="font-medium text-foreground">Hired:</span> {hired}
      </BodyText>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPositionLevel, setFilterPositionLevel] = useState("all");
  const [filterMonth, setFilterMonth] = useState("all");
  const [filterJobType, setFilterJobType] = useState("all");
  const [sortBy, setSortBy] = useState("date");

  const { data: applicants = [] } = useQuery({ queryKey: ["applicants"], queryFn: fetchApplicants });
  const { data: jobVacancies = [] } = useQuery({ queryKey: ["jobs"], queryFn: fetchJobs });
  const { data: applications = [] } = useQuery({ queryKey: ["applications"], queryFn: fetchApplications });
  const { data: evaluations = [] } = useQuery({ queryKey: ["evaluations"], queryFn: fetchEvaluations });
  const { data: summary } = useQuery({ queryKey: ["reports-summary"], queryFn: fetchReportsSummary });

  const filteredApplications = useMemo(() => {
    return applications.filter((app) => {
      if (filterStatus !== "all" && app.status !== filterStatus) return false;

      if (filterPositionLevel !== "all") {
        const vacancy = jobVacancies.find((v) => v.id === app.vacancyId);
        if (vacancy && vacancy.positionLevel !== filterPositionLevel) return false;
      }

      if (filterMonth !== "all") {
        const appDate = new Date(app.dateApplied);
        const appMonthYear = `${appDate.getFullYear()}-${String(appDate.getMonth() + 1).padStart(2, "0")}`;
        if (appMonthYear !== filterMonth) return false;
      }

      if (filterJobType !== "all") {
        const vacancy = jobVacancies.find((v) => v.id === app.vacancyId);
        if (vacancy && vacancy.positionTitle !== filterJobType) return false;
      }

      return true;
    });
  }, [applications, jobVacancies, filterStatus, filterPositionLevel, filterMonth, filterJobType]);

  const topRatedApplicants = useMemo(() => {
    const withScores = filteredApplications
      .map((app) => {
        const evaluation = evaluations.find((e) => e.applicationId === app.id);
        const applicant = applicants.find((a) => a.id === app.applicantId);
        const vacancy = jobVacancies.find((v) => v.id === app.vacancyId);

        return {
          applicationId: app.id,
          applicantName: applicant?.fullName ?? "Unknown",
          position: vacancy?.positionTitle ?? "Unknown",
          score: evaluation?.totalScore ?? 0,
          status: app.status,
          hasEvaluation: Boolean(evaluation),
          dateApplied: app.dateApplied
        };
      })
      .filter((item) => item.hasEvaluation);

    if (sortBy === "score") {
      return withScores.sort((a, b) => b.score - a.score).slice(0, 6);
    }

    return withScores
      .sort((a, b) => new Date(b.dateApplied).getTime() - new Date(a.dateApplied).getTime())
      .slice(0, 6);
  }, [filteredApplications, evaluations, applicants, jobVacancies, sortBy]);

  const screeningStats = useMemo(() => {
    const passingScreening = filteredApplications.filter(
      (a) => a.status !== "Application Received" && a.status !== "Rejected"
    ).length;

    const passRate = filteredApplications.length > 0
      ? Math.round((passingScreening / filteredApplications.length) * 100)
      : 0;

    return { passingScreening, passRate };
  }, [filteredApplications]);

  const availableMonths = useMemo(() => {
    const monthsSet = new Set<string>();
    applications.forEach((app) => {
      const appDate = new Date(app.dateApplied);
      const monthYear = `${appDate.getFullYear()}-${String(appDate.getMonth() + 1).padStart(2, "0")}`;
      monthsSet.add(monthYear);
    });
    return Array.from(monthsSet).sort().reverse();
  }, [applications]);

  const availableJobTypes = useMemo(() => {
    const jobTypesSet = new Set<string>();
    jobVacancies.forEach((job) => jobTypesSet.add(job.positionTitle));
    return Array.from(jobTypesSet).sort();
  }, [jobVacancies]);

  const positionLevelData = useMemo(() => {
    return ["first_level", "second_level"].map((level) => {
      const appsInLevel = applications.filter((app) => {
        const vacancy = jobVacancies.find((v) => v.id === app.vacancyId);
        return vacancy?.positionLevel === level;
      });

      const evaluatedCount = appsInLevel.filter((app) => evaluations.find((e) => e.applicationId === app.id)).length;
      const avgScore = evaluatedCount > 0
        ? appsInLevel.reduce((sum, app) => {
            const evaluation = evaluations.find((e) => e.applicationId === app.id);
            return sum + (evaluation?.totalScore ?? 0);
          }, 0) / evaluatedCount
        : 0;

      return {
        name: level === "first_level" ? "First Level" : "Second Level",
        evaluated: evaluatedCount,
        avgScore: Math.round(avgScore * 100) / 100,
        total: appsInLevel.length
      };
    });
  }, [applications, jobVacancies, evaluations]);

  const statCards = [
    {
      label: "Total Job Vacancies",
      value: summary?.totalJobs ?? jobVacancies.length,
      icon: Briefcase,
      color: "text-info",
      bg: "bg-info/10"
    },
    {
      label: "Total Applicants",
      value: summary?.totalApplicants ?? applicants.length,
      icon: Users,
      color: "text-primary",
      bg: "bg-primary/10"
    },
    {
      label: "Passing Screening",
      value: screeningStats.passingScreening,
      icon: TrendingUp,
      color: "text-success",
      bg: "bg-success/10"
    },
    {
      label: "Screening Rate",
      value: `${screeningStats.passRate}%`,
      icon: UserCheck,
      color: "text-warning",
      bg: "bg-warning/10"
    }
  ];

  const monthlyTrendData = useMemo(() => {
    const monthMap = new Map<string, { month: string; applications: number; hired: number }>();

    filteredApplications.forEach((app) => {
      const date = new Date(app.dateApplied);
      if (Number.isNaN(date.getTime())) return;

      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const month = date.toLocaleString("en-US", { month: "short", year: "numeric" });
      const current = monthMap.get(key) ?? { month, applications: 0, hired: 0 };

      current.applications += 1;
      if (app.status === "Hired") current.hired += 1;
      monthMap.set(key, current);
    });

    return Array.from(monthMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, value]) => value);
  }, [filteredApplications]);

  const vacancyStatusData = [
    { name: "Open", value: jobVacancies.filter((v) => v.status === "Open").length },
    { name: "Closed", value: jobVacancies.filter((v) => v.status === "Closed").length },
    { name: "Filled", value: jobVacancies.filter((v) => v.status === "Filled").length }
  ];

  const totalVacancies = vacancyStatusData.reduce((sum, item) => sum + item.value, 0);

  const activeFilters = useMemo(
    () => [filterStatus, filterPositionLevel, filterMonth, filterJobType].filter((value) => value !== "all").length,
    [filterStatus, filterPositionLevel, filterMonth, filterJobType]
  );

  const resetFilters = () => {
    setFilterStatus("all");
    setFilterPositionLevel("all");
    setFilterMonth("all");
    setFilterJobType("all");
    setSortBy("date");
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 pb-8 space-y-6">
      <div className="rounded-2xl border border-border/60 bg-gradient-to-br from-card via-card to-accent/20 p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <PageTitle className="leading-tight">Dashboard</PageTitle>
            <BodyText className="mt-2 max-w-2xl text-muted-foreground">
              Welcome back, {user?.name}. Monitor hiring performance, spot bottlenecks, and track applicant progress in one place.
            </BodyText>
          </div>
          <div className="grid grid-cols-2 gap-2 min-w-[220px]">
            <div className="rounded-xl border border-border/70 bg-background/70 px-3 py-2">
              <LabelText>Filtered</LabelText>
              <MetricValue className="text-lg">{filteredApplications.length}</MetricValue>
            </div>
            <div className="rounded-xl border border-border/70 bg-background/70 px-3 py-2">
              <LabelText>Active Filters</LabelText>
              <MetricValue className="text-lg">{activeFilters}</MetricValue>
            </div>
          </div>
        </div>
      </div>

      <Card className="border border-border/60 bg-card/80 shadow-sm">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
              <SlidersHorizontal className="w-4 h-4 text-primary" />
              <SectionTitle>Dashboard Filters</SectionTitle>
            </div>
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <FilterX className="w-3.5 h-3.5" />
              Reset
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
            <div className="space-y-1.5">
              <LabelText>Month</LabelText>
              <Select value={filterMonth} onValueChange={setFilterMonth}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Months</SelectItem>
                  {availableMonths.map((month) => {
                    const [year, monthNum] = month.split("-");
                    const monthName = new Date(parseInt(year), parseInt(monthNum) - 1).toLocaleString("en-US", { month: "long", year: "numeric" });
                    return <SelectItem key={month} value={month}>{monthName}</SelectItem>;
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <LabelText>Job Type</LabelText>
              <Select value={filterJobType} onValueChange={setFilterJobType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Job Types</SelectItem>
                  {availableJobTypes.map((jobType) => (
                    <SelectItem key={jobType} value={jobType}>{jobType}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <LabelText>Status</LabelText>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {allStatuses.map((status) => (
                    <SelectItem key={status} value={status}>{status}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <LabelText>Position Level</LabelText>
              <Select value={filterPositionLevel} onValueChange={setFilterPositionLevel}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="first_level">First Level</SelectItem>
                  <SelectItem value="second_level">Second Level</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <LabelText>Top Applicants</LabelText>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="score">Highest Score</SelectItem>
                  <SelectItem value="date">Latest</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <Card key={card.label} className="border border-border/60 shadow-sm hover:shadow-md transition-all duration-200">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-start justify-between">
                <div>
                  <LabelText>{card.label}</LabelText>
                  <MetricValue className="mt-2">{card.value}</MetricValue>
                </div>
                <div className={`${card.bg} p-2.5 rounded-xl ring-1 ring-border/50`}>
                  <card.icon className={`w-5 h-5 ${card.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <Card className="xl:col-span-8 border border-border/60 shadow-sm overflow-hidden">
          <CardContent className="pt-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <SectionTitle>Hiring Trend</SectionTitle>
                <BodyText className="text-xs text-muted-foreground">Applications vs hires over time</BodyText>
              </div>
            </div>
            <div className="rounded-xl border border-border/60 bg-gradient-to-b from-muted/25 to-background p-3">
              <ResponsiveContainer width="100%" height={290}>
                <LineChart data={monthlyTrendData} margin={{ top: 10, right: 12, left: 2, bottom: 6 }}>
                  <defs>
                    <linearGradient id="applicationsFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.14} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="hiredFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.12} />
                      <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--foreground))" strokeOpacity={0.08} vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} allowDecimals={false} tickLine={false} axisLine={false} width={28} />
                  <Tooltip content={<TrendTooltip />} cursor={{ stroke: "hsl(var(--primary))", strokeOpacity: 0.18, strokeDasharray: "4 4" }} />
                  <Area type="monotone" dataKey="applications" fill="url(#applicationsFill)" stroke="none" />
                  <Area type="monotone" dataKey="hired" fill="url(#hiredFill)" stroke="none" />
                  <Line type="monotone" dataKey="applications" name="Applications" stroke="hsl(var(--primary))" strokeWidth={2.8} dot={false} />
                  <Line type="monotone" dataKey="hired" name="Hired" stroke="hsl(var(--success))" strokeWidth={2.8} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="xl:col-span-4 border border-border/60 shadow-sm">
          <CardContent className="pt-5">
            <SectionTitle className="mb-4">Job Summary</SectionTitle>
            <div className="relative rounded-xl border border-border/60 bg-muted/20 p-2">
              <ResponsiveContainer width="100%" height={230}>
                <PieChart>
                  <Pie data={vacancyStatusData} cx="50%" cy="50%" innerRadius={64} outerRadius={92} paddingAngle={5} dataKey="value" stroke="hsl(var(--background))" strokeWidth={2}>
                    {vacancyStatusData.map((_, idx) => (
                      <Cell key={idx} fill={pieColors[idx]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <LabelText>Total</LabelText>
                <MetricValue className="text-2xl">{totalVacancies}</MetricValue>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <Card className="xl:col-span-8 border border-border/60 shadow-sm">
          <CardContent className="pt-5">
            <div className="flex items-center justify-between mb-4">
              <SectionTitle>Recent Applications</SectionTitle>
              <LabelText className="text-muted-foreground">Showing latest 8 entries</LabelText>
            </div>
            <div className="overflow-auto max-h-[340px] rounded-lg border border-border/60 bg-background">
              <table className="w-full text-sm min-w-[500px]">
                <thead className="sticky top-0 bg-card z-10">
                  <tr className="border-b text-left">
                    <th className="py-3 px-3 font-medium text-muted-foreground"><LabelText>Applicant</LabelText></th>
                    <th className="py-3 px-3 font-medium text-muted-foreground"><LabelText>Position</LabelText></th>
                    <th className="py-3 px-3 font-medium text-muted-foreground hidden sm:table-cell"><LabelText>Date Applied</LabelText></th>
                    <th className="py-3 px-3 font-medium text-muted-foreground"><LabelText>Status</LabelText></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredApplications.slice(0, 8).map((app, idx) => {
                    const applicant = applicants.find((a) => a.id === app.applicantId);
                    const vacancy = jobVacancies.find((v) => v.id === app.vacancyId);
                    return (
                      <tr key={app.id} className={`border-b last:border-0 ${idx % 2 === 0 ? "bg-background" : "bg-muted/10"} hover:bg-accent/40`}>
                        <td className="py-3 px-3 font-medium text-foreground whitespace-nowrap">{applicant?.fullName}</td>
                        <td className="py-3 px-3 text-muted-foreground whitespace-nowrap max-w-[180px] truncate">{vacancy?.positionTitle}</td>
                        <td className="py-3 px-3 text-muted-foreground hidden sm:table-cell">{app.dateApplied}</td>
                        <td className="py-3 px-3">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${getStatusColor(app.status)}`}>{app.status}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card className="xl:col-span-4 border border-border/60 shadow-sm">
          <CardContent className="pt-5">
            <SectionTitle className="mb-4">Position Level Performance</SectionTitle>
            <div className="space-y-4">
              {positionLevelData.map((level) => (
                <div key={level.name} className="border rounded-lg p-3 hover:bg-accent/20 transition-all duration-200">
                  <div className="flex justify-between items-start mb-2">
                    <BodyText className="font-medium text-foreground">{level.name}</BodyText>
                    <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded [font-variant-numeric:tabular-nums]">{level.evaluated}/{level.total}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <LabelText className="text-muted-foreground">Avg Score</LabelText>
                    <MetricValue className="text-base">{level.avgScore}</MetricValue>
                  </div>
                  <div className="mt-2 bg-secondary h-2 rounded overflow-hidden">
                    <div className="bg-success h-full transition-all" style={{ width: level.total > 0 ? `${level.avgScore}%` : "0%" }} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border border-border/60 shadow-sm">
        <CardContent className="pt-5">
          <SectionTitle className="mb-4 flex items-center gap-2">
            <Award className="w-4 h-4" /> Top Rated Applicants
          </SectionTitle>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {topRatedApplicants.length > 0 ? (
              topRatedApplicants.map((app) => (
                <div key={app.applicationId} className="border rounded-lg p-3 hover:bg-accent/30 transition-all duration-200">
                  <div className="flex justify-between items-start mb-1">
                    <div>
                      <BodyText className="font-medium text-foreground">{app.applicantName}</BodyText>
                      <LabelText className="text-muted-foreground">{app.position}</LabelText>
                    </div>
                    <MetricValue className="text-lg text-success">{app.score}</MetricValue>
                  </div>
                  <span className={`rounded-full px-2 py-1 text-xs font-medium ${getStatusColor(app.status)}`}>{app.status}</span>
                </div>
              ))
            ) : (
              <BodyText className="italic text-muted-foreground">No evaluated applicants yet</BodyText>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
