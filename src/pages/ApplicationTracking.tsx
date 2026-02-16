import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  applications,
  applicants,
  jobVacancies,
  statusHistory,
  allStatuses,
  getStatusColor,
  getApplicantName,
  getVacancyTitle,
  type Application,
  type ApplicationStatus,
} from "@/lib/mock-data";
import { ArrowRight, Clock, MessageSquare } from "lucide-react";

export default function ApplicationTracking() {
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);

  const filtered = applications.filter(
    (a) => filterStatus === "all" || a.status === filterStatus
  );

  const getHistory = (appId: string) =>
    statusHistory.filter((h) => h.applicationId === appId).sort((a, b) => a.updatedAt.localeCompare(b.updatedAt));

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
          const history = getHistory(app.id);
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
                    <Dialog>
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
                            <Select defaultValue={app.status}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {allStatuses.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Remarks</Label>
                            <Textarea placeholder="Add remarks for this status update..." />
                          </div>
                          <Button className="w-full">Save Update</Button>
                        </div>
                      </DialogContent>
                    </Dialog>

                    {/* View Timeline */}
                    <Dialog>
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
                        {history.length > 0 ? (
                          <div className="relative pl-6 space-y-4">
                            <div className="absolute left-2 top-1 bottom-1 w-0.5 bg-border" />
                            {history.map((h, idx) => (
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
