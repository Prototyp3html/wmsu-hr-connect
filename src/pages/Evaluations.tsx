import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  evaluations,
  applications,
  applicants,
  jobVacancies,
  getApplicantName,
  getVacancyTitle,
} from "@/lib/mock-data";
import { Award, Pencil, Trophy } from "lucide-react";

export default function Evaluations() {
  // Group evaluations by vacancy for ranking
  const vacancyGroups = jobVacancies.map((v) => {
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
            <form className="space-y-4">
              <div className="space-y-2">
                <Label>Application</Label>
                <Select>
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
                  <Input type="number" min={0} max={100} placeholder="0-100" />
                </div>
                <div className="space-y-2">
                  <Label>Interview Score</Label>
                  <Input type="number" min={0} max={100} placeholder="0-100" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Remarks</Label>
                <Textarea placeholder="Evaluation remarks..." />
              </div>
              <Button className="w-full">Save Evaluation</Button>
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
