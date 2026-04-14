import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fetchApplicants, fetchApplications, fetchJobs } from "@/lib/api";
import { Search } from "lucide-react";

type ArchiveRow = {
  id: string;
  applicantName: string;
  applicantEmail: string;
  positionTitle: string;
  status: string;
  dateApplied: string;
  remarks: string;
};

export default function Archive() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: applicants = [], isLoading: loadingApplicants } = useQuery({
    queryKey: ["applicants"],
    queryFn: fetchApplicants
  });

  const { data: applications = [], isLoading: loadingApplications } = useQuery({
    queryKey: ["applications"],
    queryFn: fetchApplications
  });

  const { data: jobs = [], isLoading: loadingJobs } = useQuery({
    queryKey: ["jobs"],
    queryFn: fetchJobs
  });

  const rows = useMemo<ArchiveRow[]>(() => {
    if (applications.length === 0) {
      return applicants.map((applicant) => ({
        id: `no-app-${applicant.id}`,
        applicantName: applicant.fullName,
        applicantEmail: applicant.email,
        positionTitle: "No application",
        status: "No Application",
        dateApplied: "-",
        remarks: "-"
      }));
    }

    const mapped = applications.map((application) => {
      const applicant = applicants.find((a) => a.id === application.applicantId);
      const job = jobs.find((j) => j.id === application.vacancyId);

      return {
        id: application.id,
        applicantName: applicant?.fullName ?? "Unknown applicant",
        applicantEmail: applicant?.email ?? "-",
        positionTitle: job?.positionTitle ?? "Unknown position",
        status: application.status,
        dateApplied: application.dateApplied,
        remarks: application.remarks ?? "-"
      };
    });

    return mapped.sort((a, b) => b.dateApplied.localeCompare(a.dateApplied));
  }, [applications, applicants, jobs]);

  const statusOptions = useMemo(() => {
    const unique = Array.from(new Set(rows.map((row) => row.status)));
    return unique.sort((a, b) => a.localeCompare(b));
  }, [rows]);

  const filteredRows = useMemo(() => {
    const needle = search.trim().toLowerCase();

    return rows.filter((row) => {
      const matchesSearch =
        needle.length === 0 ||
        row.applicantName.toLowerCase().includes(needle) ||
        row.applicantEmail.toLowerCase().includes(needle) ||
        row.positionTitle.toLowerCase().includes(needle) ||
        row.status.toLowerCase().includes(needle);

      const matchesStatus = statusFilter === "all" || row.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [rows, search, statusFilter]);

  const isLoading = loadingApplicants || loadingApplications || loadingJobs;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-display text-foreground">Archive</h1>
        <p className="text-sm text-muted-foreground mt-1">Applicant logs and application history</p>
      </div>

      <Card>
        <CardContent className="pt-4 pb-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="pl-9"
              placeholder="Search by applicant, email, position, or status"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {statusOptions.map((status) => (
                <SelectItem key={status} value={status}>
                  {status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-5">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading archive...</p>
          ) : filteredRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No archive records found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/70 bg-primary text-primary-foreground text-left">
                    <th className="h-12 px-4 text-[11px] font-semibold text-primary-foreground uppercase tracking-wide">Applicant</th>
                    <th className="h-12 px-4 text-[11px] font-semibold text-primary-foreground uppercase tracking-wide">Email</th>
                    <th className="h-12 px-4 text-[11px] font-semibold text-primary-foreground uppercase tracking-wide">Position</th>
                    <th className="h-12 px-4 text-[11px] font-semibold text-primary-foreground uppercase tracking-wide">Status</th>
                    <th className="h-12 px-4 text-[11px] font-semibold text-primary-foreground uppercase tracking-wide">Date Applied</th>
                    <th className="h-12 px-4 text-[11px] font-semibold text-primary-foreground uppercase tracking-wide">Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row, idx) => (
                    <tr
                      key={row.id}
                      className={`border-b border-border/20 transition-colors ${
                        idx % 2 === 0 ? "bg-background hover:bg-muted/30" : "bg-muted/10 hover:bg-muted/20"
                      }`}
                    >
                      <td className="px-4 py-3 font-medium text-foreground">{row.applicantName}</td>
                      <td className="px-4 py-3 text-muted-foreground">{row.applicantEmail}</td>
                      <td className="px-4 py-3 text-muted-foreground">{row.positionTitle}</td>
                      <td className="px-4 py-3">
                        <span className="status-badge bg-muted text-muted-foreground">{row.status}</span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {row.dateApplied === "-" ? "-" : new Date(row.dateApplied).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{row.remarks}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
