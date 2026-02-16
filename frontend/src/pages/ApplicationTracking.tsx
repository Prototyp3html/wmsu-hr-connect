import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchApplicants, fetchApplications, fetchJobs, fetchStatusHistory, updateApplicationStatus } from "@/lib/api";
import { allStatuses, getStatusColor } from "@/lib/status";
import type { Application, ApplicationStatus } from "@/lib/types";
import { Clock, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function ApplicationTracking() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [statusForm, setStatusForm] = useState<{ status: ApplicationStatus; remarks: string } | null>(null);

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-display text-foreground">Application Tracking</h1>
        <p className="text-sm text-muted-foreground mt-1">Monitor and update application statuses</p>
      </div>

      {/* Filter */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-3">
            <Label className="text-sm text-muted-foreground whitespace-nowrap">Filter by Status:</Label>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-64">
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
      <div className="space-y-3">
        {filtered.map((app) => {
          return (
            <Card key={app.id} className="card-hover">
              <CardContent className="pt-5 pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground">{getApplicantName(app.applicantId)}</h3>
                    <p className="text-sm text-muted-foreground">
                      Applied for <span className="font-medium text-foreground">{getVacancyTitle(app.vacancyId)}</span>
                    </p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className={`status-badge ${getStatusColor(app.status)}`}>{app.status}</span>
                      <span className="text-xs text-muted-foreground">Applied: {app.dateApplied}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {/* Update Status */}
                    <Dialog onOpenChange={(open) => {
                      if (open) {
                        setStatusForm({ status: app.status, remarks: "" });
                      } else {
                        setStatusForm(null);
                      }
                    }}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">Update Status</Button>
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
                              updateMutation.mutate({ id: app.id, status: statusForm.status, remarks: statusForm.remarks });
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
                        <Button variant="outline" size="sm" onClick={() => setSelectedApp(app)}>
                          <Clock className="w-4 h-4 mr-1" /> History
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader><DialogTitle>Status History</DialogTitle></DialogHeader>
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
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
