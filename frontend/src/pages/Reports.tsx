import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { fetchApplicants, fetchApplications, fetchJobs } from "@/lib/api";
import { getStatusColor } from "@/lib/status";
import { FileText, Printer, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type ReportType = "per-position" | "hired" | "rejected" | "summary";

export default function Reports() {
  const { toast } = useToast();
  const [reportType, setReportType] = useState<ReportType>("per-position");
  const [isExporting, setIsExporting] = useState(false);
  const { data: applications = [] } = useQuery({
    queryKey: ["applications"],
    queryFn: fetchApplications
  });
  const { data: applicants = [] } = useQuery({
    queryKey: ["applicants"],
    queryFn: fetchApplicants
  });
  const { data: jobVacancies = [] } = useQuery({
    queryKey: ["jobs"],
    queryFn: fetchJobs
  });

  const hired = applications.filter((a) => a.status === "Hired");
  const rejected = applications.filter((a) => a.status === "Rejected");

  const positionGroups = jobVacancies.map((v) => ({
    vacancy: v,
    apps: applications.filter((a) => a.vacancyId === v.id),
  }));

  const monthlySummary = useMemo(() => {
    const summaryMap = new Map<string, { month: string; applications: number; hired: number; rejected: number }>();
    applications.forEach((app) => {
      const date = new Date(app.dateApplied);
      if (Number.isNaN(date.getTime())) return;
      const month = date.toLocaleString("en-US", { month: "long", year: "numeric" });
      const entry = summaryMap.get(month) ?? { month, applications: 0, hired: 0, rejected: 0 };
      entry.applications += 1;
      if (app.status === "Hired") entry.hired += 1;
      if (app.status === "Rejected") entry.rejected += 1;
      summaryMap.set(month, entry);
    });
    return Array.from(summaryMap.values());
  }, [applications]);

  const getApplicantName = (id: string) =>
    applicants.find((a) => a.id === id)?.fullName ?? "Unknown";

  const getVacancyTitle = (id: string) =>
    jobVacancies.find((v) => v.id === id)?.positionTitle ?? "Unknown";

  const handlePrint = () => {
    window.print();
  };

  const handleExportPdf = async () => {
    const element = document.getElementById("report-content");
    if (!element) {
      toast({ title: "Export failed", description: "Report content not found.", variant: "destructive" });
      return;
    }

    setIsExporting(true);
    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import("html2canvas"),
        import("jspdf")
      ]);

      const canvas = await html2canvas(element, { scale: 2, useCORS: true });
      const imageData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imageData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imageData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`wmsu-hr-report-${reportType}.pdf`);
    } catch (error) {
      toast({
        title: "Export failed",
        description: (error as Error).message,
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 no-print">
        <div>
          <h1 className="text-2xl font-bold font-display text-foreground">Reports</h1>
          <p className="text-sm text-muted-foreground mt-1">Generate and export hiring reports</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-1" /> Print
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportPdf} disabled={isExporting}>
            <Download className="w-4 h-4 mr-1" /> {isExporting ? "Exporting..." : "Export PDF"}
          </Button>
        </div>
      </div>

      <Card className="no-print">
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
            <FileText className="w-4 h-4 text-muted-foreground hidden sm:block" />
            <Select value={reportType} onValueChange={(v) => setReportType(v as ReportType)}>
              <SelectTrigger className="w-full sm:w-64"><SelectValue /></SelectTrigger>
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
                <div key={vacancy.id} className="space-y-2">
                  <h4 className="text-sm font-medium text-foreground mb-2">{vacancy.positionTitle}</h4>
                  {apps.length > 0 ? (
                    <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
                    <table className="w-full text-sm mb-4 min-w-[400px]">
                      <thead>
                        <tr className="border-b">
                          <th className="pb-2 text-left text-muted-foreground">Applicant</th>
                          <th className="pb-2 text-center text-muted-foreground whitespace-nowrap">Date</th>
                          <th className="pb-2 text-center text-muted-foreground">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {apps.map((app) => (
                          <tr key={app.id} className="border-b last:border-0">
                            <td className="py-2 pr-3">{getApplicantName(app.applicantId)}</td>
                            <td className="py-2 text-center text-muted-foreground">{app.dateApplied}</td>
                            <td className="py-2 text-center">
                              <span className={`status-badge ${getStatusColor(app.status)}`}>{app.status}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    </div>
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
              <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
              <table className="w-full text-sm min-w-[400px]">
                <thead>
                  <tr className="border-b">
                    <th className="pb-2 text-left text-muted-foreground">Applicant</th>
                    <th className="pb-2 text-left text-muted-foreground">Position</th>
                    <th className="pb-2 text-center text-muted-foreground whitespace-nowrap hidden sm:table-cell">Date Applied</th>
                  </tr>
                </thead>
                <tbody>
                  {hired.map((app) => (
                    <tr key={app.id} className="border-b last:border-0">
                      <td className="py-2 pr-3 font-medium whitespace-nowrap">{getApplicantName(app.applicantId)}</td>
                      <td className="py-2 pr-3 text-muted-foreground">{getVacancyTitle(app.vacancyId)}</td>
                      <td className="py-2 text-center text-muted-foreground whitespace-nowrap hidden sm:table-cell">{app.dateApplied}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>
          )}

          {reportType === "rejected" && (
            <div>
              <h3 className="font-semibold text-foreground mb-4">Rejected Applicants</h3>
              <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
              <table className="w-full text-sm min-w-[400px]">
                <thead>
                  <tr className="border-b">
                    <th className="pb-2 text-left text-muted-foreground">Applicant</th>
                    <th className="pb-2 text-left text-muted-foreground">Position</th>
                    <th className="pb-2 text-left text-muted-foreground hidden sm:table-cell">Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {rejected.map((app) => (
                    <tr key={app.id} className="border-b last:border-0">
                      <td className="py-2 pr-3 font-medium whitespace-nowrap">{getApplicantName(app.applicantId)}</td>
                      <td className="py-2 pr-3 text-muted-foreground">{getVacancyTitle(app.vacancyId)}</td>
                      <td className="py-2 text-muted-foreground hidden sm:table-cell">{app.remarks ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>
          )}

          {reportType === "summary" && (
            <div>
              <h3 className="font-semibold text-foreground mb-4">Hiring Summary per Month</h3>
              <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
              <table className="w-full text-sm min-w-[350px]">
                <thead>
                  <tr className="border-b">
                    <th className="pb-2 text-left text-muted-foreground">Month</th>
                    <th className="pb-2 text-center text-muted-foreground">Apps</th>
                    <th className="pb-2 text-center text-muted-foreground">Hired</th>
                    <th className="pb-2 text-center text-muted-foreground">Rejected</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlySummary.map((row) => (
                    <tr key={row.month} className="border-b last:border-0">
                      <td className="py-2 pr-3 font-medium whitespace-nowrap">{row.month}</td>
                      <td className="py-2 text-center">{row.applications}</td>
                      <td className="py-2 text-center text-success font-medium">{row.hired}</td>
                      <td className="py-2 text-center text-destructive font-medium">{row.rejected}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
