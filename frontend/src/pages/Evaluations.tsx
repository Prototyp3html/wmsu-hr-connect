import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createEvaluation, fetchApplicants, fetchApplications, fetchEvaluations, fetchJobs, updateEvaluation, deleteEvaluation } from "@/lib/api";
import { Award, Trophy, Pencil, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Evaluations() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showEdit, setShowEdit] = useState(false);
  const [editingEvaluationId, setEditingEvaluationId] = useState<string | null>(null);
  const [formState, setFormState] = useState({
    applicationId: "",
    examScore: "",
    interviewScore: "",
    remarks: ""
  });
  const [editFormState, setEditFormState] = useState({
    examScore: "",
    interviewScore: "",
    remarks: ""
  });

  const { data: evaluations = [] } = useQuery({
    queryKey: ["evaluations"],
    queryFn: fetchEvaluations
  });
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

  const createMutation = useMutation({
    mutationFn: createEvaluation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["evaluations"] });
      setFormState({ applicationId: "", examScore: "", interviewScore: "", remarks: "" });
      toast({ title: "Evaluation saved", description: "The evaluation was recorded." });
    },
    onError: (error) => {
      toast({ title: "Save failed", description: (error as Error).message, variant: "destructive" });
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: { examScore: number; interviewScore: number; remarks?: string } }) =>
      updateEvaluation(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["evaluations"] });
      setShowEdit(false);
      setEditingEvaluationId(null);
      toast({ title: "Evaluation updated", description: "The evaluation was updated." });
    },
    onError: (error) => {
      toast({ title: "Update failed", description: (error as Error).message, variant: "destructive" });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: deleteEvaluation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["evaluations"] });
      toast({ title: "Evaluation removed", description: "The evaluation was deleted." });
    },
    onError: (error) => {
      toast({ title: "Delete failed", description: (error as Error).message, variant: "destructive" });
    }
  });

  const handleOpenEdit = (evaluation: { id: string; examScore: number; interviewScore: number; remarks?: string }) => {
    setEditingEvaluationId(evaluation.id);
    setEditFormState({
      examScore: String(evaluation.examScore ?? ""),
      interviewScore: String(evaluation.interviewScore ?? ""),
      remarks: evaluation.remarks ?? ""
    });
    setShowEdit(true);
  };

  const getApplicantName = (id: string) =>
    applicants.find((a) => a.id === id)?.fullName ?? "Unknown";

  const getVacancyTitle = (id: string) =>
    jobVacancies.find((v) => v.id === id)?.positionTitle ?? "Unknown";

  const editingEvaluation = evaluations.find((ev) => ev.id === editingEvaluationId) ?? null;
  const editingApplication = applications.find((app) => app.id === editingEvaluation?.applicationId) ?? null;

  // Group evaluations by vacancy for ranking
  const vacancyGroups = useMemo(() => {
    return jobVacancies.map((v) => {
      const apps = applications.filter((a) => a.vacancyId === v.id);
      const evals = apps
        .map((app) => {
          const ev = evaluations.find((e) => e.applicationId === app.id);
          return ev ? { ...ev, applicantName: getApplicantName(app.applicantId) } : null;
        })
        .filter(Boolean)
        .sort((a, b) => (b?.totalScore ?? 0) - (a?.totalScore ?? 0));
      return { vacancy: v, evaluations: evals };
    }).filter((g) => g.evaluations.length > 0);
  }, [applications, evaluations, jobVacancies, applicants]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display text-foreground">Evaluations</h1>
          <p className="text-sm text-muted-foreground mt-1">Score and rank applicants per vacancy</p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button><Award className="w-4 h-4 mr-2" /> Add Evaluation</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Evaluation</DialogTitle></DialogHeader>
            <form className="space-y-4" onSubmit={(e) => {
              e.preventDefault();
              createMutation.mutate({
                applicationId: formState.applicationId,
                examScore: Number(formState.examScore),
                interviewScore: Number(formState.interviewScore),
                remarks: formState.remarks
              });
            }}>
              <div className="space-y-2">
                <Label>Application</Label>
                <Select value={formState.applicationId} onValueChange={(value) => setFormState((prev) => ({ ...prev, applicationId: value }))}>
                  <SelectTrigger><SelectValue placeholder="Select application" /></SelectTrigger>
                  <SelectContent>
                    {applications.map((app) => (
                      <SelectItem key={app.id} value={app.id}>
                        {getApplicantName(app.applicantId)} — {getVacancyTitle(app.vacancyId)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Exam Score</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      placeholder="0-100"
                      value={formState.examScore}
                      onChange={(e) => setFormState((prev) => ({ ...prev, examScore: e.target.value }))}
                    />
                </div>
                <div className="space-y-2">
                  <Label>Interview Score</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      placeholder="0-100"
                      value={formState.interviewScore}
                      onChange={(e) => setFormState((prev) => ({ ...prev, interviewScore: e.target.value }))}
                    />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Remarks</Label>
                <Textarea
                  placeholder="Evaluation remarks..."
                  value={formState.remarks}
                  onChange={(e) => setFormState((prev) => ({ ...prev, remarks: e.target.value }))}
                />
              </div>
              <Button className="w-full" type="submit" disabled={createMutation.isPending}>Save Evaluation</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Dialog
        open={showEdit}
        onOpenChange={(open) => {
          setShowEdit(open);
          if (!open) {
            setEditingEvaluationId(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Evaluation</DialogTitle></DialogHeader>
          <div className="space-y-1 text-sm text-muted-foreground">
            <p>Applicant: {editingApplication ? getApplicantName(editingApplication.applicantId) : "Unknown"}</p>
            <p>Vacancy: {editingApplication ? getVacancyTitle(editingApplication.vacancyId) : "Unknown"}</p>
          </div>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (!editingEvaluationId) {
                return;
              }
              updateMutation.mutate({
                id: editingEvaluationId,
                payload: {
                  examScore: Number(editFormState.examScore),
                  interviewScore: Number(editFormState.interviewScore),
                  remarks: editFormState.remarks
                }
              });
            }}
          >
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Exam Score</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  placeholder="0-100"
                  value={editFormState.examScore}
                  onChange={(e) => setEditFormState((prev) => ({ ...prev, examScore: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Interview Score</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  placeholder="0-100"
                  value={editFormState.interviewScore}
                  onChange={(e) => setEditFormState((prev) => ({ ...prev, interviewScore: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Remarks</Label>
              <Textarea
                placeholder="Evaluation remarks..."
                value={editFormState.remarks}
                onChange={(e) => setEditFormState((prev) => ({ ...prev, remarks: e.target.value }))}
              />
            </div>
            <Button className="w-full" type="submit" disabled={updateMutation.isPending}>Update Evaluation</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Ranking by Vacancy */}
      {vacancyGroups.map(({ vacancy, evaluations: evals }) => (
        <Card key={vacancy.id}>
          <CardContent className="pt-5">
            <h3 className="font-semibold text-foreground mb-1">{vacancy.positionTitle}</h3>
            <p className="text-xs text-muted-foreground mb-4">{vacancy.id} — Ranked by total score</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-3 font-medium text-muted-foreground w-12">Rank</th>
                    <th className="pb-3 font-medium text-muted-foreground">Applicant</th>
                    <th className="pb-3 font-medium text-muted-foreground text-center">Exam</th>
                    <th className="pb-3 font-medium text-muted-foreground text-center">Interview</th>
                    <th className="pb-3 font-medium text-muted-foreground text-center">Total</th>
                    <th className="pb-3 font-medium text-muted-foreground">Remarks</th>
                    <th className="pb-3 font-medium text-muted-foreground text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {evals.map((ev, idx) => (
                    <tr key={ev!.id} className="border-b last:border-0">
                      <td className="py-3">
                        <div className="flex items-center gap-1">
                          {idx === 0 && <Trophy className="w-4 h-4 text-warning" />}
                          <span className="font-medium">{idx + 1}</span>
                        </div>
                      </td>
                      <td className="py-3 font-medium text-foreground">{ev!.applicantName}</td>
                      <td className="py-3 text-center">{ev!.examScore}</td>
                      <td className="py-3 text-center">{ev!.interviewScore}</td>
                      <td className="py-3 text-center font-bold text-primary">{ev!.totalScore}</td>
                      <td className="py-3 text-muted-foreground">{ev!.remarks}</td>
                      <td className="py-3">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenEdit(ev!)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => {
                              if (window.confirm("Delete this evaluation?")) {
                                deleteMutation.mutate(ev!.id);
                              }
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
