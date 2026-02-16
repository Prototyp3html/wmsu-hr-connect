import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { applications, applicants, jobVacancies, getApplicantName, getVacancyTitle, getStatusColor } from "@/lib/mock-data";
import { FileText, Printer, Download } from "lucide-react";

type ReportType = "per-position" | "hired" | "rejected" | "summary";

export default function Reports() {
  const [reportType, setReportType] = useState<ReportType>("per-position");

  const hired = applications.filter((a) => a.status === "Hired");
  const rejected = applications.filter((a) => a.status === "Rejected");

  const positionGroups = jobVacancies.map((v) => ({
    vacancy: v,
    apps: applications.filter((a) => a.vacancyId === v.id),
  }));

  const monthlySummary = [
    { month: "January 2026", applications: 4, hired: 1, rejected: 0 },
    { month: "February 2026", applications: 4, hired: 1, rejected: 1 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display text-foreground">Reports</h1>
          <p className="text-sm text-muted-foreground mt-1">Generate and export hiring reports</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm"><Printer className="w-4 h-4 mr-1" /> Print</Button>
          <Button variant="outline" size="sm"><Download className="w-4 h-4 mr-1" /> Export PDF</Button>
        </div>
      </div>

      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-3">
            <FileText className="w-4 h-4 text-muted-foreground" />
            <Select value={reportType} onValueChange={(v) => setReportType(v as ReportType)}>
              <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="per-position">Applicants per Position</SelectItem>
                <SelectItem value="hired">Hired Applicants</SelectItem>
                <SelectItem value="rejected">Rejected Applicants</SelectItem>
                <SelectItem value="summary">Monthly Summary</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Report Content */}
      <Card id="report-content">
        <CardContent className="pt-5">
          {reportType === "per-position" && (
            <div className="space-y-6">
              <h3 className="font-semibold text-foreground">Applicants per Position</h3>
              {positionGroups.map(({ vacancy, apps }) => (
                <div key={vacancy.id}>
                  <h4 className="text-sm font-medium text-foreground mb-2">{vacancy.positionTitle}</h4>
                  {apps.length > 0 ? (
                    <table className="w-full text-sm mb-4">
                      <thead>
                        <tr className="border-b"><th className="pb-2 text-left text-muted-foreground">Applicant</th><th className="pb-2 text-left text-muted-foreground">Date</th><th className="pb-2 text-left text-muted-foreground">Status</th></tr>
                      </thead>
                      <tbody>
                        {apps.map((app) => (
                          <tr key={app.id} className="border-b last:border-0">
                            <td className="py-2">{getApplicantName(app.applicantId)}</td>
                            <td className="py-2 text-muted-foreground">{app.dateApplied}</td>
                            <td className="py-2"><span className={`status-badge ${getStatusColor(app.status)}`}>{app.status}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p className="text-sm text-muted-foreground mb-4">No applicants</p>
                  )}
                </div>
              ))}
            </div>
          )}

          {reportType === "hired" && (
            <div>
              <h3 className="font-semibold text-foreground mb-4">Hired Applicants</h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b"><th className="pb-2 text-left text-muted-foreground">Applicant</th><th className="pb-2 text-left text-muted-foreground">Position</th><th className="pb-2 text-left text-muted-foreground">Date Applied</th></tr>
                </thead>
                <tbody>
                  {hired.map((app) => (
                    <tr key={app.id} className="border-b last:border-0">
                      <td className="py-2 font-medium">{getApplicantName(app.applicantId)}</td>
                      <td className="py-2 text-muted-foreground">{getVacancyTitle(app.vacancyId)}</td>
                      <td className="py-2 text-muted-foreground">{app.dateApplied}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {reportType === "rejected" && (
            <div>
              <h3 className="font-semibold text-foreground mb-4">Rejected Applicants</h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b"><th className="pb-2 text-left text-muted-foreground">Applicant</th><th className="pb-2 text-left text-muted-foreground">Position</th><th className="pb-2 text-left text-muted-foreground">Remarks</th></tr>
                </thead>
                <tbody>
                  {rejected.map((app) => (
                    <tr key={app.id} className="border-b last:border-0">
                      <td className="py-2 font-medium">{getApplicantName(app.applicantId)}</td>
                      <td className="py-2 text-muted-foreground">{getVacancyTitle(app.vacancyId)}</td>
                      <td className="py-2 text-muted-foreground">{app.remarks ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {reportType === "summary" && (
            <div>
              <h3 className="font-semibold text-foreground mb-4">Hiring Summary per Month</h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b"><th className="pb-2 text-left text-muted-foreground">Month</th><th className="pb-2 text-center text-muted-foreground">Applications</th><th className="pb-2 text-center text-muted-foreground">Hired</th><th className="pb-2 text-center text-muted-foreground">Rejected</th></tr>
                </thead>
                <tbody>
                  {monthlySummary.map((row) => (
                    <tr key={row.month} className="border-b last:border-0">
                      <td className="py-2 font-medium">{row.month}</td>
                      <td className="py-2 text-center">{row.applications}</td>
                      <td className="py-2 text-center text-success font-medium">{row.hired}</td>
                      <td className="py-2 text-center text-destructive font-medium">{row.rejected}</td>
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
