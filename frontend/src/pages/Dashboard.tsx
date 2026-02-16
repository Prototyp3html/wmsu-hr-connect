import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { fetchApplicants, fetchApplications, fetchJobs, fetchReportsSummary } from "@/lib/api";
import { allStatuses, getStatusColor } from "@/lib/status";
import { Briefcase, Users, ClipboardList, UserCheck } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

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
  const { data: summary } = useQuery({
    queryKey: ["reports-summary"],
    queryFn: fetchReportsSummary
  });

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
      label: "Under Screening",
      value: applications.filter((a) => a.status === "Under Initial Screening").length,
      icon: ClipboardList,
      color: "text-warning",
      bg: "bg-warning/10",
    },
    {
      label: "Hired Applicants",
      value: applications.filter((a) => a.status === "Hired").length,
      icon: UserCheck,
      color: "text-success",
      bg: "bg-success/10",
    },
  ];

  const statusData = allStatuses.map((status) => ({
    name: status.replace("Under ", "").replace("For ", ""),
    count: applications.filter((a) => a.status === status).length,
  }));

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

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardContent className="pt-5">
            <h3 className="text-sm font-semibold mb-4 text-foreground">Applicant Status Distribution</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={statusData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 90%)" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-20} textAnchor="end" height={60} />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(348, 83%, 40%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <h3 className="text-sm font-semibold mb-4 text-foreground">Vacancy Status</h3>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={vacancyStatusData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={4} dataKey="value" label>
                  {vacancyStatusData.map((_, idx) => (
                    <Cell key={idx} fill={pieColors[idx]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Applications */}
      <Card>
        <CardContent className="pt-5">
          <h3 className="text-sm font-semibold mb-4 text-foreground">Recent Applications</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-3 font-medium text-muted-foreground">Applicant</th>
                  <th className="pb-3 font-medium text-muted-foreground">Position</th>
                  <th className="pb-3 font-medium text-muted-foreground">Date Applied</th>
                  <th className="pb-3 font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {applications.slice(0, 5).map((app) => {
                  const applicant = applicants.find((a) => a.id === app.applicantId);
                  const vacancy = jobVacancies.find((v) => v.id === app.vacancyId);
                  return (
                    <tr key={app.id} className="border-b last:border-0">
                      <td className="py-3 font-medium text-foreground">{applicant?.fullName}</td>
                      <td className="py-3 text-muted-foreground">{vacancy?.positionTitle}</td>
                      <td className="py-3 text-muted-foreground">{app.dateApplied}</td>
                      <td className="py-3">
                        <span className={`status-badge ${getStatusColor(app.status)}`}>{app.status}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
