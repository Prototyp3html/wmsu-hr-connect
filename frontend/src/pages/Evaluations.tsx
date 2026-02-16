import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createEvaluation, fetchApplicants, fetchApplications, fetchEvaluations, fetchJobs } from "@/lib/api";
import { Award, Trophy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Evaluations() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [formState, setFormState] = useState({
    applicationId: "",
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

  const getApplicantName = (id: string) =>
    applicants.find((a) => a.id === id)?.fullName ?? "Unknown";

  const getVacancyTitle = (id: string) =>
    jobVacancies.find((v) => v.id === id)?.positionTitle ?? "Unknown";

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
