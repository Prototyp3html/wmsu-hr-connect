import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchApplicants, fetchApplications, fetchJobs, fetchStatusHistory, updateApplicationStatus } from "@/lib/api";
import { allStatuses, getStatusColor, getNextSuggestedStatus } from "@/lib/status";
import type { Application, ApplicationStatus } from "@/lib/types";
import { Clock, MessageSquare, ArrowRight, Lightbulb, Ellipsis } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const nextStepHints: Partial<Record<ApplicationStatus, string>> = {
  "Application Received": "Move to screening once documents are complete.",
  "Under Initial Screening": "Advance after shortlist review.",
  "For Examination": "Advance after exam is completed and checked.",
  "For Interview": "Advance after panel interview.",
  "For Final Evaluation": "Advance after final deliberation.",
  "Approved": "Mark as Hired when appointment is confirmed."
};

export default function ApplicationTracking() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [statusForm, setStatusForm] = useState<{
    status: ApplicationStatus;
    remarks: string;
    documentsComplete: boolean;
    examScheduleDate: string;
    interviewScheduleDate: string;
    finalEvaluationDate: string;
  } | null>(null);
  const [suggestedApp, setSuggestedApp] = useState<Application | null>(null);

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

  const historyQuery = useQuery({
    queryKey: ["status-history", selectedApp?.id],
    queryFn: () => fetchStatusHistory(selectedApp!.id),
    enabled: Boolean(selectedApp)
  });

  const updateMutation = useMutation({
    mutationFn: updateApplicationStatus,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      queryClient.invalidateQueries({ queryKey: ["status-history", selectedApp?.id] });
      toast({ title: "Status updated", description: "Application status was updated." });
    },
    onError: (error) => {
      toast({ title: "Update failed", description: (error as Error).message, variant: "destructive" });
    }
  });

  const getApplicantName = (id: string) =>
    applicants.find((a) => a.id === id)?.fullName ?? "Unknown";

  const getVacancyTitle = (id: string) =>
    jobVacancies.find((v) => v.id === id)?.positionTitle ?? "Unknown";

  const filtered = useMemo(() => {
    return applications.filter(
      (a) => filterStatus === "all" || a.status === filterStatus
    );
  }, [applications, filterStatus]);

  const applySuggestedStatus = (app: Application) => {
    const nextStatus = getNextSuggestedStatus(app.status);
    if (!nextStatus) return;
    updateMutation.mutate({
      id: app.id,
      status: nextStatus,
      remarks: `Advanced via suggested next step (${app.status} -> ${nextStatus}).`
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-display text-foreground">Application Tracking</h1>
        <p className="text-sm text-muted-foreground mt-1">Monitor and update application statuses</p>
      </div>

      {/* Filter */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
            <Label className="text-sm text-muted-foreground whitespace-nowrap">Filter by Status:</Label>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full sm:w-64">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {allStatuses.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Applications */}
      <Card className="border border-border/50 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-border/70 bg-primary text-primary-foreground hover:bg-primary">
                  <TableHead className="h-12 px-4 text-[11px] font-semibold text-primary-foreground uppercase tracking-wide">Applicant</TableHead>
                  <TableHead className="h-12 px-4 text-[11px] font-semibold text-primary-foreground uppercase tracking-wide">Position</TableHead>
                  <TableHead className="h-12 px-4 text-[11px] font-semibold text-primary-foreground uppercase tracking-wide">Status</TableHead>
                  <TableHead className="h-12 px-4 text-[11px] font-semibold text-primary-foreground uppercase tracking-wide">Date Applied</TableHead>
                  <TableHead className="h-12 px-4 text-[11px] font-semibold text-primary-foreground uppercase tracking-wide">Workflow</TableHead>
                  <TableHead className="h-12 px-4 text-[11px] font-semibold text-right text-primary-foreground uppercase tracking-wide">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((app, idx) => (
                  <TableRow
                    key={app.id}
                    className={`border-b border-border/20 h-14 transition-colors ${
                      idx % 2 === 0 ? "bg-background hover:bg-muted/30" : "bg-muted/10 hover:bg-muted/20"
                    }`}
                  >
                    <TableCell className="px-4 py-3 text-sm font-medium text-foreground">
                      {getApplicantName(app.applicantId)}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-sm text-muted-foreground">
                      {getVacancyTitle(app.vacancyId)}
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <span className={`status-badge text-xs ${getStatusColor(app.status)}`}>{app.status}</span>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-sm text-muted-foreground">
                      {app.dateApplied}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-xs text-muted-foreground max-w-[260px]">
                      {nextStepHints[app.status] ?? "No further progression required."}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-right">
                      <div className="flex justify-end">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" aria-label="Open actions menu">
                          <Ellipsis className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        {getNextSuggestedStatus(app.status) && (
                          <DropdownMenuItem onClick={() => setSuggestedApp(app)}>
                            <Lightbulb className="w-4 h-4 mr-2" />
                            Suggested Step
                          </DropdownMenuItem>
                        )}

                    {/* Update Status */}
                    <Dialog onOpenChange={(open) => {
                      if (open) {
                        setStatusForm({
                          status: app.status,
                          remarks: "",
                          documentsComplete: Boolean(app.documentsComplete),
                          examScheduleDate: app.examScheduleDate ?? "",
                          interviewScheduleDate: app.interviewScheduleDate ?? "",
                          finalEvaluationDate: app.finalEvaluationDate ?? ""
                        });
                      } else {
                        setStatusForm(null);
                      }
                    }}>
                      <DialogTrigger asChild>
                        <DropdownMenuItem onSelect={(event) => event.preventDefault()}>
                          <ArrowRight className="w-4 h-4 mr-2" />
                          Update Status
                        </DropdownMenuItem>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader><DialogTitle>Update Application Status</DialogTitle></DialogHeader>
                        <div className="space-y-4">
                          <div className="text-sm">
                            <span className="text-muted-foreground">Applicant:</span>{" "}
                            <span className="font-medium">{getApplicantName(app.applicantId)}</span>
                          </div>
                          <div className="text-sm">
                            <span className="text-muted-foreground">Current Status:</span>{" "}
                            <span className={`status-badge ${getStatusColor(app.status)}`}>{app.status}</span>
                          </div>
                          <div className="space-y-2">
                            <Label>New Status</Label>
                            <Select value={statusForm?.status ?? app.status} onValueChange={(value) => setStatusForm((prev) => prev ? ({ ...prev, status: value as ApplicationStatus }) : prev)}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {allStatuses.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          {statusForm?.status === "Under Initial Screening" && (
                            <div className="space-y-2 rounded-md border p-3 bg-muted/30">
                              <Label className="text-sm">Document Check</Label>
                              <label className="flex items-center gap-2 text-sm">
                                <input
                                  type="checkbox"
                                  checked={statusForm.documentsComplete}
                                  onChange={(e) => setStatusForm((prev) => prev ? ({ ...prev, documentsComplete: e.target.checked }) : prev)}
                                />
                                All required documents are submitted and verified
                              </label>
                            </div>
                          )}
                          {statusForm?.status === "For Examination" && (
                            <div className="space-y-2">
                              <Label>Examination Date</Label>
                              <Input
                                type="date"
                                value={statusForm.examScheduleDate}
                                onChange={(e) => setStatusForm((prev) => prev ? ({ ...prev, examScheduleDate: e.target.value }) : prev)}
                              />
                            </div>
                          )}
                          {statusForm?.status === "For Interview" && (
                            <div className="space-y-2">
                              <Label>Interview Date</Label>
                              <Input
                                type="date"
                                value={statusForm.interviewScheduleDate}
                                onChange={(e) => setStatusForm((prev) => prev ? ({ ...prev, interviewScheduleDate: e.target.value }) : prev)}
                              />
                            </div>
                          )}
                          {statusForm?.status === "For Final Evaluation" && (
                            <div className="space-y-2">
                              <Label>Final Evaluation Date</Label>
                              <Input
                                type="date"
                                value={statusForm.finalEvaluationDate}
                                onChange={(e) => setStatusForm((prev) => prev ? ({ ...prev, finalEvaluationDate: e.target.value }) : prev)}
                              />
                            </div>
                          )}
                          <div className="space-y-2">
                            <Label>Remarks</Label>
                            <Textarea
                              placeholder="Add remarks for this status update..."
                              value={statusForm?.remarks ?? ""}
                              onChange={(e) => setStatusForm((prev) => prev ? ({ ...prev, remarks: e.target.value }) : prev)}
                            />
                          </div>
                          <Button
                            className="w-full"
                            onClick={() => {
                              if (!statusForm) return;

                              if (statusForm.status === "Under Initial Screening" && !statusForm.documentsComplete) {
                                toast({ title: "Requirement missing", description: "Document verification must be checked first.", variant: "destructive" });
                                return;
                              }
                              if (statusForm.status === "For Examination" && !statusForm.examScheduleDate) {
                                toast({ title: "Requirement missing", description: "Please set examination date.", variant: "destructive" });
                                return;
                              }
                              if (statusForm.status === "For Interview" && !statusForm.interviewScheduleDate) {
                                toast({ title: "Requirement missing", description: "Please set interview date.", variant: "destructive" });
                                return;
                              }
                              if (statusForm.status === "For Final Evaluation" && !statusForm.finalEvaluationDate) {
                                toast({ title: "Requirement missing", description: "Please set final evaluation date.", variant: "destructive" });
                                return;
                              }

                              updateMutation.mutate({
                                id: app.id,
                                status: statusForm.status,
                                remarks: statusForm.remarks,
                                documentsComplete: statusForm.documentsComplete,
                                examScheduleDate: statusForm.examScheduleDate || undefined,
                                interviewScheduleDate: statusForm.interviewScheduleDate || undefined,
                                finalEvaluationDate: statusForm.finalEvaluationDate || undefined
                              });
                            }}
                            disabled={updateMutation.isPending}
                          >
                            Save Update
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>

                    {/* View Timeline */}
                    <Dialog onOpenChange={(open) => {
                      if (!open) {
                        setSelectedApp(null);
                      }
                    }}>
                      <DialogTrigger asChild>
                        <DropdownMenuItem onSelect={(event) => event.preventDefault()} onClick={() => setSelectedApp(app)}>
                          <Clock className="w-4 h-4 mr-2" />
                          History
                        </DropdownMenuItem>
                      </DialogTrigger>
                      <DialogContent className="max-h-[80vh] flex flex-col">
                        <DialogHeader><DialogTitle>Status History</DialogTitle></DialogHeader>
                        <div className="flex-1 overflow-y-auto">
                          <div className="text-sm mb-4">
                            <span className="font-medium">{getApplicantName(app.applicantId)}</span>
                            <span className="text-muted-foreground"> — {getVacancyTitle(app.vacancyId)}</span>
                          </div>
                          {historyQuery.isLoading ? (
                            <p className="text-sm text-muted-foreground">Loading history...</p>
                          ) : historyQuery.data && historyQuery.data.length > 0 ? (
                            <div className="relative pl-6 space-y-4">
                              <div className="absolute left-2 top-1 bottom-1 w-0.5 bg-border" />
                              {historyQuery.data.map((h) => (
                                <div key={h.id} className="relative">
                                  <div className="absolute -left-[18px] top-1 w-3 h-3 rounded-full bg-primary border-2 border-card" />
                                  <div>
                                    <span className={`status-badge ${getStatusColor(h.status)}`}>{h.status}</span>
                                    <p className="text-xs text-muted-foreground mt-1">{h.updatedAt} — by {h.updatedBy}</p>
                                    {h.remarks && (
                                      <p className="text-xs mt-1 flex items-start gap-1">
                                        <MessageSquare className="w-3 h-3 mt-0.5 text-muted-foreground" />
                                        {h.remarks}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground">No status history recorded yet.</p>
                          )}
                        </div>
                      </DialogContent>
                    </Dialog>
                      </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Suggested Step Modal */}
                    <Dialog open={suggestedApp?.id === app.id} onOpenChange={(open) => {
                      if (!open) setSuggestedApp(null);
                    }}>
                      <DialogContent>
                        <DialogHeader><DialogTitle>Suggested Next Step</DialogTitle></DialogHeader>
                        {suggestedApp && (
                          <div className="space-y-4">
                            <div className="text-sm">
                              <span className="text-muted-foreground">Applicant:</span>{" "}
                              <span className="font-medium">{getApplicantName(suggestedApp.applicantId)}</span>
                            </div>
                            <div className="text-sm">
                              <span className="text-muted-foreground">Current Status:</span>{" "}
                              <span className={`status-badge ${getStatusColor(suggestedApp.status)}`}>{suggestedApp.status}</span>
                            </div>
                            <div className="bg-blue-50 border border-blue-200 rounded p-4">
                              <div className="flex items-center gap-2 mb-2">
                                <Lightbulb className="w-5 h-5 text-blue-600" />
                                <span className="font-semibold text-blue-900">Recommended Next Step</span>
                              </div>
                              <div className="text-sm text-blue-900 font-medium ml-7">{getNextSuggestedStatus(suggestedApp.status)}</div>
                              <p className="text-xs text-blue-800 mt-2 ml-7">{nextStepHints[suggestedApp.status] ?? "Continue to the next workflow step."}</p>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                className="flex-1"
                                variant="outline"
                                onClick={() => setSuggestedApp(null)}
                              >
                                Cancel
                              </Button>
                              <Button
                                className="flex-1 bg-blue-600 hover:bg-blue-700"
                                onClick={() => {
                                  applySuggestedStatus(suggestedApp);
                                  setSuggestedApp(null);
                                }}
                                disabled={updateMutation.isPending}
                              >
                                Apply Step
                              </Button>
                            </div>
                          </div>
                        )}
                      </DialogContent>
                    </Dialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="px-4 py-8 text-center text-sm text-muted-foreground">
                      No applications found for the selected filters.
                    </TableCell>
                  </TableRow>
                )}              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
