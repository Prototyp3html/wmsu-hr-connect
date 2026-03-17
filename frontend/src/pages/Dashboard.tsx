import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { fetchApplicants, fetchApplications, fetchJobs, fetchReportsSummary, fetchEvaluations } from "@/lib/api";
import { allStatuses, getStatusColor } from "@/lib/status";
import { Briefcase, Users, UserCheck, TrendingUp, Award } from "lucide-react";
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useMemo } from "react";

const pieColors = [
  "hsl(217, 91%, 60%)",
  "hsl(38, 92%, 50%)",
  "hsl(262, 83%, 58%)",
  "hsl(190, 80%, 42%)",
  "hsl(348, 83%, 40%)",
  "hsl(142, 71%, 45%)",
  "hsl(142, 71%, 35%)",
  "hsl(0, 84%, 60%)",
];

export default function Dashboard() {
  const { user } = useAuth();
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPositionLevel, setFilterPositionLevel] = useState("all");
  const [filterMonth, setFilterMonth] = useState("all");
  const [filterJobType, setFilterJobType] = useState("all");
  const [sortBy, setSortBy] = useState("date");

  const { data: applicants = [] } = useQuery({
    queryKey: ["applicants"],
    queryFn: fetchApplicants
  });
  const { data: jobVacancies = [] } = useQuery({
    queryKey: ["jobs"],
    queryFn: fetchJobs
  });
  const { data: applications = [] } = useQuery({
    queryKey: ["applications"],
    queryFn: fetchApplications
  });
  const { data: evaluations = [] } = useQuery({
    queryKey: ["evaluations"],
    queryFn: fetchEvaluations
  });
  const { data: summary } = useQuery({
    queryKey: ["reports-summary"],
    queryFn: fetchReportsSummary
  });

  // Filtered applications
  const filteredApplications = useMemo(() => {
    return applications.filter((app) => {
      if (filterStatus !== "all" && app.status !== filterStatus) return false;
      if (filterPositionLevel !== "all") {
        const vacancy = jobVacancies.find((v) => v.id === app.vacancyId);
        if (vacancy && (vacancy as any).positionLevel !== filterPositionLevel) return false;
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

  // Top-rated applicants with evaluation scores
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
          hasEvaluation: !!evaluation
        };
      })
      .filter((item) => item.hasEvaluation);

    if (sortBy === "score") {
      return withScores.sort((a, b) => (b.score ?? 0) - (a.score ?? 0)).slice(0, 5);
    } else {
      return withScores.slice(0, 5);
    }
  }, [filteredApplications, evaluations, applicants, jobVacancies, sortBy]);

  // Screening pass rate
  const screeningStats = useMemo(() => {
    const receivedCount = filteredApplications.filter((a) => a.status === "Application Received").length;
    const passingScreening = filteredApplications.filter(
      (a) => a.status !== "Application Received" && a.status !== "Rejected"
    ).length;
    const rejectedCount = filteredApplications.filter((a) => a.status === "Rejected").length;
    
    const passRate = filteredApplications.length > 0 
      ? Math.round((passingScreening / filteredApplications.length) * 100)
      : 0;

    return { receivedCount, passingScreening, rejectedCount, passRate };
  }, [filteredApplications]);

  // Extract unique months from applications
  const availableMonths = useMemo(() => {
    const monthsSet = new Set<string>();
    applications.forEach((app) => {
      const appDate = new Date(app.dateApplied);
      const monthYear = `${appDate.getFullYear()}-${String(appDate.getMonth() + 1).padStart(2, "0")}`;
      monthsSet.add(monthYear);
    });
    return Array.from(monthsSet).sort().reverse();
  }, [applications]);

  // Extract unique job types
  const availableJobTypes = useMemo(() => {
    const jobTypesSet = new Set<string>();
    jobVacancies.forEach((job) => {
      jobTypesSet.add(job.positionTitle);
    });
    return Array.from(jobTypesSet).sort();
  }, [jobVacancies]);

  // Position level performance
  const positionLevelData = useMemo(() => {
    return ["first_level", "second_level"].map((level) => {
      const appsInLevel = applications.filter((app) => {
        const vacancy = jobVacancies.find((v) => v.id === app.vacancyId);
        return (vacancy as any)?.positionLevel === level;
      });
      const evaluatedCount = appsInLevel.filter((app) =>
        evaluations.find((e) => e.applicationId === app.id)
      ).length;
      const avgScore =
        evaluatedCount > 0
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
      bg: "bg-info/10",
    },
    {
      label: "Total Applicants",
      value: summary?.totalApplicants ?? applicants.length,
      icon: Users,
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      label: "Passing Screening",
      value: screeningStats.passingScreening,
      icon: TrendingUp,
      color: "text-success",
      bg: "bg-success/10",
    },
    {
      label: "Screening Rate",
      value: `${screeningStats.passRate}%`,
      icon: UserCheck,
      color: "text-warning",
      bg: "bg-warning/10",
    },
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
    { name: "Filled", value: jobVacancies.filter((v) => v.status === "Filled").length },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-display text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Welcome back, {user?.name}. Here's an overview of the hiring pipeline.
        </p>
      </div>

      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block">Filter by Month</label>
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
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block">Filter by Job Type</label>
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
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block">Filter by Status</label>
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
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block">Filter by Position Level</label>
              <Select value={filterPositionLevel} onValueChange={setFilterPositionLevel}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="first_level">First Level</SelectItem>
                  <SelectItem value="second_level">Second Level</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block">Sort Top Applicants By</label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="score">Highest Score</SelectItem>
                  <SelectItem value="date">Latest</SelectItem>
                </SelectContent>
              </Select>
            </div>
          <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block">Sort Top Applicants By</label>
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

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div className="xl:col-span-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {statCards.map((card) => (
            <Card key={card.label} className="card-hover">
              <CardContent className="pt-5 pb-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{card.label}</p>
                    <p className="text-3xl font-bold mt-1 text-foreground">{card.value}</p>
                  </div>
                  <div className={`${card.bg} p-2.5 rounded-lg`}>
                    <card.icon className={`w-5 h-5 ${card.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="xl:col-span-7">
          <CardContent className="pt-5">
            <h3 className="text-sm font-semibold mb-4 text-foreground">Hiring Trend</h3>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={monthlyTrendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 90%)" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="applications" name="Applications" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="hired" name="Hired" stroke="hsl(var(--success))" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <Card className="xl:col-span-8">
          <CardContent className="pt-5">
            <h3 className="text-sm font-semibold mb-4 text-foreground">Recent Applications</h3>
            <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
              <table className="w-full text-sm min-w-[500px]">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-3 font-medium text-muted-foreground whitespace-nowrap">Applicant</th>
                    <th className="pb-3 font-medium text-muted-foreground whitespace-nowrap">Position</th>
                    <th className="pb-3 font-medium text-muted-foreground whitespace-nowrap hidden sm:table-cell">Date Applied</th>
                    <th className="pb-3 font-medium text-muted-foreground whitespace-nowrap">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredApplications.slice(0, 8).map((app) => {
                    const applicant = applicants.find((a) => a.id === app.applicantId);
                    const vacancy = jobVacancies.find((v) => v.id === app.vacancyId);
                    return (
                      <tr key={app.id} className="border-b last:border-0">
                        <td className="py-3 font-medium text-foreground whitespace-nowrap">{applicant?.fullName}</td>
                        <td className="py-3 text-muted-foreground whitespace-nowrap max-w-[150px] truncate">{vacancy?.positionTitle}</td>
                        <td className="py-3 text-muted-foreground whitespace-nowrap hidden sm:table-cell">{app.dateApplied}</td>
                        <td className="py-3">
                          <span className={`status-badge ${getStatusColor(app.status)} text-xs`}>{app.status}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card className="xl:col-span-4">
          <CardContent className="pt-5">
            <h3 className="text-sm font-semibold mb-4 text-foreground">Job Summary</h3>
            <ResponsiveContainer width="100%" height={230}>
              <PieChart>
                <Pie data={vacancyStatusData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={4} dataKey="value">
                  {vacancyStatusData.map((_, idx) => (
                    <Cell key={idx} fill={pieColors[idx]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2 mt-2 text-sm">
              {vacancyStatusData.map((item, idx) => (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: pieColors[idx] }} />
                    <span>{item.name}</span>
                  </div>
                  <span className="font-semibold text-foreground">{item.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <Card className="xl:col-span-6">
          <CardContent className="pt-5">
            <h3 className="text-sm font-semibold mb-4 text-foreground">Position Level Performance</h3>
            <div className="space-y-4">
              {positionLevelData.map((level) => (
                <div key={level.name} className="border rounded p-3">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-medium text-sm text-foreground">{level.name}</span>
                    <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">{level.evaluated}/{level.total}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Avg Score:</span>
                    <span className="text-sm font-bold text-foreground">{level.avgScore}</span>
                  </div>
                  <div className="mt-2 bg-secondary h-2 rounded overflow-hidden">
                    <div
                      className="bg-success h-full transition-all"
                      style={{ width: level.total > 0 ? `${(level.avgScore / 100) * 100}%` : "0%" }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="xl:col-span-6">
          <CardContent className="pt-5">
            <h3 className="text-sm font-semibold mb-4 text-foreground flex items-center gap-2">
              <Award className="w-4 h-4" /> Top Rated Applicants
            </h3>
            <div className="space-y-3">
              {topRatedApplicants.length > 0 ? (
                topRatedApplicants.map((app) => (
                  <div key={app.applicationId} className="border rounded p-3 hover:bg-accent/50 transition-colors">
                    <div className="flex justify-between items-start mb-1">
                      <div>
                        <p className="font-medium text-sm text-foreground">{app.applicantName}</p>
                        <p className="text-xs text-muted-foreground">{app.position}</p>
                      </div>
                      <span className="text-lg font-bold text-success">{app.score}</span>
                    </div>
                    <span className={`status-badge ${getStatusColor(app.status)} text-xs`}>{app.status}</span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground italic">No evaluated applicants yet</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
