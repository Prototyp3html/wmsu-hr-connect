import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useQuery } from "@tanstack/react-query";
import { fetchApplicants, fetchApplications, fetchJobs, fetchEvaluations } from "@/lib/api";
import { getStatusColor, allStatuses } from "@/lib/status";
import { FileText, Printer, Download, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type ReportType = "per-position" | "status" | "hired" | "rejected" | "summary";

export default function Reports() {
  const { toast } = useToast();
  const [reportType, setReportType] = useState<ReportType>("per-position");
  const [isExporting, setIsExporting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  
  const { data: applications = [] } = useQuery({
    queryKey: ["applications"],
    queryFn: fetchApplications
  });
  const { data: applicants = [] } = useQuery({
    queryKey: ["applicants"],
    queryFn: fetchApplicants
  });
  const { data: jobs = [] } = useQuery({
    queryKey: ["jobs"],
    queryFn: fetchJobs
  });
  const { data: evaluations = [] } = useQuery({
    queryKey: ["evaluations"],
    queryFn: fetchEvaluations
  });

  const hired = applications.filter((a) => a.status === "Hired");
  const rejected = applications.filter((a) => a.status === "Rejected");

  const positionGroups = jobs.map((v) => ({
    vacancy: v,
    apps: applications.filter((a) => a.vacancyId === v.id),
  }));

  // Status distribution statistics
  const statusStats = useMemo(() => {
    const total = applications.length || 1;
    return allStatuses.map((status) => {
      const count = applications.filter((a) => a.status === status).length;
      const percentage = Math.round((count / total) * 100);
      return { status, count, percentage };
    });
  }, [applications]);

  // Position-level statistics
  const positionLevelStats = useMemo(() => {
    const firstLevel = applications.filter((app) => {
      const job = jobs.find((j) => j.id === app.vacancyId);
      return (job as any)?.positionLevel === "first_level";
    });
    const secondLevel = applications.filter((app) => {
      const job = jobs.find((j) => j.id === app.vacancyId);
      return (job as any)?.positionLevel === "second_level";
    });
    const total = applications.length || 1;
    
    return [
      {
        level: "First Level",
        count: firstLevel.length,
        percentage: Math.round((firstLevel.length / total) * 100),
        hired: firstLevel.filter((a) => a.status === "Hired").length,
        rejected: firstLevel.filter((a) => a.status === "Rejected").length
      },
      {
        level: "Second Level",
        count: secondLevel.length,
        percentage: Math.round((secondLevel.length / total) * 100),
        hired: secondLevel.filter((a) => a.status === "Hired").length,
        rejected: secondLevel.filter((a) => a.status === "Rejected").length
      }
    ];
  }, [applications, jobs]);

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
    jobs.find((v) => v.id === id)?.positionTitle ?? "Unknown";

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
      toast({ title: "Success", description: "Report exported successfully!" });
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
          <Button variant="outline" size="sm" onClick={() => setShowPreview(true)}>
            <Eye className="w-4 h-4 mr-1" /> Preview
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-1" /> Print
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportPdf} disabled={isExporting}>
            <Download className="w-4 h-4 mr-1" /> {isExporting ? "Exporting..." : "Export PDF"}
          </Button>
        </div>
      </div>

      <Tabs value={reportType} onValueChange={(v) => setReportType(v as ReportType)} className="w-full">
        <TabsList className="grid w-full grid-cols-5 no-print">
          <TabsTrigger value="per-position">Per Position</TabsTrigger>
          <TabsTrigger value="hired">Hired</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
          <TabsTrigger value="status">By Status</TabsTrigger>
          <TabsTrigger value="summary">Summary</TabsTrigger>
        </TabsList>

        <div id="report-content">
        <TabsContent value="per-position" className="mt-4">
          <Card>
            <CardContent className="pt-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-sm text-muted-foreground">Total Positions</p>
                    <p className="text-2xl font-bold">{jobs.length}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-sm text-muted-foreground">Total Applications</p>
                    <p className="text-2xl font-bold">{applications.length}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-sm text-muted-foreground">Avg per Position</p>
                    <p className="text-2xl font-bold">{jobs.length > 0 ? Math.round(applications.length / jobs.length) : 0}</p>
                  </CardContent>
                </Card>
              </div>

              <h3 className="font-semibold text-foreground mb-4">Applicants Summary per Position</h3>
              <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
              <table className="w-full text-sm min-w-[500px]">
                <thead>
                  <tr className="border-b">
                    <th className="pb-2 text-left text-muted-foreground">Position Title</th>
                    <th className="pb-2 text-center text-muted-foreground">Total Apps</th>
                    <th className="pb-2 text-center text-muted-foreground">Hired</th>
                    <th className="pb-2 text-center text-muted-foreground">Rejected</th>
                    <th className="pb-2 text-center text-muted-foreground">In Review</th>
                  </tr>
                </thead>
                <tbody>
                  {positionGroups.map(({ vacancy, apps }) => {
                    const hiredCount = apps.filter((a) => a.status === "Hired").length;
                    const rejectedCount = apps.filter((a) => a.status === "Rejected").length;
                    const inReviewCount = apps.filter((a) => 
                      a.status !== "Hired" && a.status !== "Rejected"
                    ).length;
                    
                    return (
                      <tr key={vacancy.id} className="border-b last:border-0">
                        <td className="py-3 pr-3 font-medium">{vacancy.positionTitle}</td>
                        <td className="py-3 text-center font-semibold">{apps.length}</td>
                        <td className="py-3 text-center text-success font-medium">{hiredCount}</td>
                        <td className="py-3 text-center text-destructive font-medium">{rejectedCount}</td>
                        <td className="py-3 text-center text-muted-foreground">{inReviewCount}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="hired" className="mt-4">
          <Card>
            <CardContent className="pt-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-sm text-muted-foreground">Total Hired</p>
                    <p className="text-2xl font-bold text-success">{hired.length}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-sm text-muted-foreground">Hiring Rate</p>
                    <p className="text-2xl font-bold">{applications.length > 0 ? Math.round((hired.length / applications.length) * 100) : 0}%</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-sm text-muted-foreground">From Applications</p>
                    <p className="text-2xl font-bold">{applications.length}</p>
                  </CardContent>
                </Card>
              </div>
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
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rejected" className="mt-4">
          <Card>
            <CardContent className="pt-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-sm text-muted-foreground">Total Rejected</p>
                    <p className="text-2xl font-bold text-destructive">{rejected.length}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-sm text-muted-foreground">Rejection Rate</p>
                    <p className="text-2xl font-bold">{applications.length > 0 ? Math.round((rejected.length / applications.length) * 100) : 0}%</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-sm text-muted-foreground">From Applications</p>
                    <p className="text-2xl font-bold">{applications.length}</p>
                  </CardContent>
                </Card>
              </div>
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
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="status" className="mt-4">
          <Card>
            <CardContent className="pt-5">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                {statusStats.map(({ status, count, percentage }) => (
                  <Card key={status}>
                    <CardContent className="pt-4">
                      <p className="text-xs text-muted-foreground leading-tight mb-2">{status}</p>
                      <p className="text-xl font-bold">{count}</p>
                      <p className="text-sm text-muted-foreground">{percentage}%</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <h3 className="font-semibold text-foreground mb-4">Applications by Status</h3>
              <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
              <table className="w-full text-sm min-w-[400px]">
                <thead>
                  <tr className="border-b">
                    <th className="pb-2 text-left text-muted-foreground">Status</th>
                    <th className="pb-2 text-center text-muted-foreground">Count</th>
                    <th className="pb-2 text-center text-muted-foreground">Percentage</th>
                  </tr>
                </thead>
                <tbody>
                  {statusStats.map(({ status, count, percentage }) => (
                    <tr key={status} className="border-b last:border-0">
                      <td className="py-3 pr-3 align-middle">
                        <span className={`status-badge ${getStatusColor(status)}`}>{status}</span>
                      </td>
                      <td className="py-3 text-center font-semibold">{count}</td>
                      <td className="py-3 text-center text-muted-foreground">{percentage}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="summary" className="mt-4">
          <Card>
            <CardContent className="pt-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-sm text-muted-foreground">Total Months</p>
                    <p className="text-2xl font-bold">{monthlySummary.length}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-sm text-muted-foreground">Avg Applications/Month</p>
                    <p className="text-2xl font-bold">{monthlySummary.length > 0 ? Math.round(applications.length / monthlySummary.length) : 0}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-sm text-muted-foreground">Avg Hired/Month</p>
                    <p className="text-2xl font-bold">{monthlySummary.length > 0 ? Math.round(hired.length / monthlySummary.length) : 0}</p>
                  </CardContent>
                </Card>
              </div>
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
            </CardContent>
          </Card>
        </TabsContent>
        </div>
      </Tabs>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Report Preview</DialogTitle>
            <DialogDescription>Preview of the {reportType} report</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {reportType === "per-position" && (
              <div>
                <h3 className="font-semibold text-foreground mb-4">Applicants Summary per Position</h3>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="pb-2 text-left text-muted-foreground">Position Title</th>
                      <th className="pb-2 text-center text-muted-foreground">Total Apps</th>
                      <th className="pb-2 text-center text-muted-foreground">Hired</th>
                      <th className="pb-2 text-center text-muted-foreground">Rejected</th>
                      <th className="pb-2 text-center text-muted-foreground">In Review</th>
                    </tr>
                  </thead>
                  <tbody>
                    {positionGroups.map(({ vacancy, apps }) => {
                      const hiredCount = apps.filter((a) => a.status === "Hired").length;
                      const rejectedCount = apps.filter((a) => a.status === "Rejected").length;
                      const inReviewCount = apps.filter((a) => 
                        a.status !== "Hired" && a.status !== "Rejected"
                      ).length;
                      
                      return (
                        <tr key={vacancy.id} className="border-b last:border-0">
                          <td className="py-3 pr-3 font-medium">{vacancy.positionTitle}</td>
                          <td className="py-3 text-center font-semibold">{apps.length}</td>
                          <td className="py-3 text-center text-success font-medium">{hiredCount}</td>
                          <td className="py-3 text-center text-destructive font-medium">{rejectedCount}</td>
                          <td className="py-3 text-center text-muted-foreground">{inReviewCount}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {reportType === "hired" && (
              <div>
                <h3 className="font-semibold text-foreground mb-4">Hired Applicants</h3>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="pb-2 text-left text-muted-foreground">Applicant</th>
                      <th className="pb-2 text-left text-muted-foreground">Position</th>
                      <th className="pb-2 text-center text-muted-foreground whitespace-nowrap">Date Applied</th>
                    </tr>
                  </thead>
                  <tbody>
                    {hired.map((app) => (
                      <tr key={app.id} className="border-b last:border-0">
                        <td className="py-2 pr-3 font-medium whitespace-nowrap">{getApplicantName(app.applicantId)}</td>
                        <td className="py-2 pr-3 text-muted-foreground">{getVacancyTitle(app.vacancyId)}</td>
                        <td className="py-2 text-center text-muted-foreground whitespace-nowrap">{app.dateApplied}</td>
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
                    <tr className="border-b">
                      <th className="pb-2 text-left text-muted-foreground">Applicant</th>
                      <th className="pb-2 text-left text-muted-foreground">Position</th>
                      <th className="pb-2 text-left text-muted-foreground">Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rejected.map((app) => (
                      <tr key={app.id} className="border-b last:border-0">
                        <td className="py-2 pr-3 font-medium whitespace-nowrap">{getApplicantName(app.applicantId)}</td>
                        <td className="py-2 pr-3 text-muted-foreground">{getVacancyTitle(app.vacancyId)}</td>
                        <td className="py-2 text-muted-foreground">{app.remarks ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {reportType === "status" && (
              <div>
                <h3 className="font-semibold text-foreground mb-4">Applications by Status</h3>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="pb-2 text-left text-muted-foreground">Status</th>
                      <th className="pb-2 text-center text-muted-foreground">Count</th>
                      <th className="pb-2 text-center text-muted-foreground">Percentage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {statusStats.map(({ status, count, percentage }) => (
                      <tr key={status} className="border-b last:border-0">
                        <td className="py-2 pr-3 font-medium">
                          <span className={`status-badge ${getStatusColor(status)}`}>{status}</span>
                        </td>
                        <td className="py-2 text-center font-semibold">{count}</td>
                        <td className="py-2 text-center text-muted-foreground">{percentage}%</td>
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
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
