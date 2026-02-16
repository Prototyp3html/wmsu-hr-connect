import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createJob, fetchDepartments, fetchJobs } from "@/lib/api";
import { getVacancyStatusColor } from "@/lib/status";
import type { JobVacancy } from "@/lib/types";
import { Plus, Search, Pencil, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export default function JobVacancies() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterDept, setFilterDept] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [formState, setFormState] = useState({
    positionTitle: "",
    departmentId: "",
    salaryGrade: "",
    qualifications: "",
    postingDate: "",
    closingDate: "",
    status: "Open"
  });

  const { data: jobVacancies = [] } = useQuery({
    queryKey: ["jobs"],
    queryFn: fetchJobs
  });

  const { data: departments = [] } = useQuery({
    queryKey: ["departments"],
    queryFn: fetchDepartments
  });

  const createMutation = useMutation({
    mutationFn: createJob,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      setShowCreate(false);
      setFormState({
        positionTitle: "",
        departmentId: "",
        salaryGrade: "",
        qualifications: "",
        postingDate: "",
        closingDate: "",
        status: "Open"
      });
      toast({ title: "Vacancy created", description: "The job vacancy was added." });
    },
    onError: (error) => {
      toast({ title: "Create failed", description: (error as Error).message, variant: "destructive" });
    }
  });

  const getDepartmentName = (id: string) =>
    departments.find((d) => d.id === id)?.name ?? "Unknown";

  const filtered = useMemo(() => {
    return jobVacancies.filter((v) => {
      const matchSearch = v.positionTitle.toLowerCase().includes(search.toLowerCase());
      const matchDept = filterDept === "all" || v.departmentId === filterDept;
      const matchStatus = filterStatus === "all" || v.status === filterStatus;
      return matchSearch && matchDept && matchStatus;
    });
  }, [jobVacancies, search, filterDept, filterStatus]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display text-foreground">Job Vacancies</h1>
          <p className="text-sm text-muted-foreground mt-1">{filtered.length} position(s) found</p>
        </div>
        {user?.role === "admin" && (
          <Dialog open={showCreate} onOpenChange={setShowCreate}>
            <DialogTrigger asChild>
              <Button><Plus className="w-4 h-4 mr-2" /> New Vacancy</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Create Job Vacancy</DialogTitle></DialogHeader>
              <form className="space-y-4" onSubmit={(e) => {
                e.preventDefault();
                createMutation.mutate({
                  positionTitle: formState.positionTitle,
                  departmentId: formState.departmentId,
                  salaryGrade: Number(formState.salaryGrade),
                  qualifications: formState.qualifications,
                  postingDate: formState.postingDate,
                  closingDate: formState.closingDate,
                  status: formState.status as JobVacancy["status"]
                });
              }}>
                <div className="space-y-2">
                  <Label>Position Title</Label>
                  <Input
                    placeholder="e.g., Instructor I"
                    value={formState.positionTitle}
                    onChange={(e) => setFormState((prev) => ({ ...prev, positionTitle: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Department</Label>
                  <Select value={formState.departmentId} onValueChange={(value) => setFormState((prev) => ({ ...prev, departmentId: value }))}>
                    <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                    <SelectContent>
                      {departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Salary Grade</Label>
                    <Input
                      type="number"
                      placeholder="e.g., 12"
                      value={formState.salaryGrade}
                      onChange={(e) => setFormState((prev) => ({ ...prev, salaryGrade: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select value={formState.status} onValueChange={(value) => setFormState((prev) => ({ ...prev, status: value }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Open">Open</SelectItem>
                        <SelectItem value="Closed">Closed</SelectItem>
                        <SelectItem value="Filled">Filled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Posting Date</Label>
                    <Input
                      type="date"
                      value={formState.postingDate}
                      onChange={(e) => setFormState((prev) => ({ ...prev, postingDate: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Closing Date</Label>
                    <Input
                      type="date"
                      value={formState.closingDate}
                      onChange={(e) => setFormState((prev) => ({ ...prev, closingDate: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Qualification Requirements</Label>
                  <Textarea
                    placeholder="Enter required qualifications..."
                    value={formState.qualifications}
                    onChange={(e) => setFormState((prev) => ({ ...prev, qualifications: e.target.value }))}
                  />
                </div>
                <div className="flex justify-end gap-3">
                  <Button variant="outline" type="button" onClick={() => setShowCreate(false)}>Cancel</Button>
                  <Button type="submit" disabled={createMutation.isPending}>Create Vacancy</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search positions..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={filterDept} onValueChange={setFilterDept}>
              <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="Department" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full sm:w-36"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Open">Open</SelectItem>
                <SelectItem value="Closed">Closed</SelectItem>
                <SelectItem value="Filled">Filled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Vacancy List */}
      <div className="grid gap-4">
        {filtered.map((vacancy) => (
          <Card key={vacancy.id} className="card-hover">
            <CardContent className="pt-5 pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-semibold text-foreground">{vacancy.positionTitle}</h3>
                    <span className={`status-badge ${getVacancyStatusColor(vacancy.status)}`}>{vacancy.status}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{getDepartmentName(vacancy.departmentId)}</p>
                  <div className="flex flex-wrap gap-4 mt-2 text-xs text-muted-foreground">
                    <span>SG-{vacancy.salaryGrade}</span>
                    <span>Posted: {vacancy.postingDate}</span>
                    <span>Closing: {vacancy.closingDate}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Eye className="w-4 h-4 mr-1" /> View
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader><DialogTitle>{vacancy.positionTitle}</DialogTitle></DialogHeader>
                      <div className="space-y-3 text-sm">
                        <div><span className="text-muted-foreground">Department:</span> <span className="font-medium">{getDepartmentName(vacancy.departmentId)}</span></div>
                        <div><span className="text-muted-foreground">Salary Grade:</span> <span className="font-medium">SG-{vacancy.salaryGrade}</span></div>
                        <div><span className="text-muted-foreground">Status:</span> <Badge variant="outline">{vacancy.status}</Badge></div>
                        <div><span className="text-muted-foreground">Posting Date:</span> <span>{vacancy.postingDate}</span></div>
                        <div><span className="text-muted-foreground">Closing Date:</span> <span>{vacancy.closingDate}</span></div>
                        <div><span className="text-muted-foreground">Qualifications:</span><p className="mt-1">{vacancy.qualifications}</p></div>
                      </div>
                    </DialogContent>
                  </Dialog>
                  {user?.role === "admin" && (
                    <Button variant="outline" size="sm"><Pencil className="w-4 h-4 mr-1" /> Edit</Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
