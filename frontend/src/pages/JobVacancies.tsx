import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createJob, fetchDepartments, fetchJobs, fetchPositionTitles, updateJob, deleteJob } from "@/lib/api";
import { getVacancyStatusColor } from "@/lib/status";
import type { JobVacancy } from "@/lib/types";
import { Plus, Search, Pencil, Eye, Trash2, Ellipsis } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const TEST_SALARY_GRADE_BY_TITLE: Record<string, number> = {
  "instructor iii": 14,
  "information technology officer i repost": 19,
  "attorney iv": 23,
  "information officer i": 15,
  "administrative aide vi (clerk iii)": 6,
  "project development officer i": 15,
  "internal auditor i": 19,
  "administrative assistant iii (senior bookkeeper)": 9,
  "administrative assistant iii": 9,
  "suc vice president": 28,
  "board secretary v": 24,
  "chief administrative officer": 24,
  "administrative aide vi": 6,
  "administrative assistant ii": 8,
  "administrative officer i": 10
};

export default function JobVacancies() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterDept, setFilterDept] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formState, setFormState] = useState({
    positionTitle: "",
    departmentId: "",
    salaryGrade: "",
    qualifications: "",
    postingDate: "",
    closingDate: "",
    status: "Open",
    positionLevel: "first_level"
  });
  const [editFormState, setEditFormState] = useState({
    positionTitle: "",
    departmentId: "",
    salaryGrade: "",
    qualifications: "",
    postingDate: "",
    closingDate: "",
    status: "Open",
    positionLevel: "first_level"
  });

  const { data: jobVacancies = [] } = useQuery({
    queryKey: ["jobs"],
    queryFn: fetchJobs
  });

  const { data: departments = [] } = useQuery({
    queryKey: ["departments"],
    queryFn: fetchDepartments
  });

  const { data: positionTitles = [] } = useQuery({
    queryKey: ["position-titles"],
    queryFn: fetchPositionTitles
  });

  const positionTitleOptions = useMemo(() => {
    return Array.from(new Set([...positionTitles, ...jobVacancies.map((vacancy) => vacancy.positionTitle)]))
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));
  }, [positionTitles, jobVacancies]);

  const salaryGradeByTitle = useMemo(() => {
    const map = new Map<string, number>(Object.entries(TEST_SALARY_GRADE_BY_TITLE));
    for (const vacancy of jobVacancies) {
      const key = vacancy.positionTitle.trim().toLowerCase();
      if (key && Number.isFinite(vacancy.salaryGrade)) {
        map.set(key, vacancy.salaryGrade);
      }
    }
    return map;
  }, [jobVacancies]);

  const applyCreateTitle = (title: string) => {
    const suggested = salaryGradeByTitle.get(title.trim().toLowerCase());
    setFormState((prev) => ({
      ...prev,
      positionTitle: title,
      salaryGrade: suggested ? String(suggested) : prev.salaryGrade
    }));
  };

  const applyEditTitle = (title: string) => {
    const suggested = salaryGradeByTitle.get(title.trim().toLowerCase());
    setEditFormState((prev) => ({
      ...prev,
      positionTitle: title,
      salaryGrade: suggested ? String(suggested) : prev.salaryGrade
    }));
  };

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
        status: "Open",
        positionLevel: "first_level"
      });
      toast({ title: "Vacancy created", description: "The job vacancy was added." });
    },
    onError: (error) => {
      toast({ title: "Create failed", description: (error as Error).message, variant: "destructive" });
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Omit<JobVacancy, "id"> }) => updateJob(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      setShowEdit(false);
      setEditingId(null);
      toast({ title: "Vacancy updated", description: "Changes saved." });
    },
    onError: (error) => {
      toast({ title: "Update failed", description: (error as Error).message, variant: "destructive" });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: deleteJob,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      toast({ title: "Vacancy deleted", description: "The vacancy was removed." });
    },
    onError: (error) => {
      toast({ title: "Delete failed", description: (error as Error).message, variant: "destructive" });
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
                  status: formState.status as JobVacancy["status"],
                  positionLevel: formState.positionLevel
                });
              }}>
                <div className="space-y-2">
                  <Label>Position Title</Label>
                  <Select value={formState.positionTitle} onValueChange={applyCreateTitle}>
                    <SelectTrigger><SelectValue placeholder="Select position title" /></SelectTrigger>
                    <SelectContent>
                      {positionTitleOptions.map((title) => <SelectItem key={title} value={title}>{title}</SelectItem>)}
                    </SelectContent>
                  </Select>
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                <div className="space-y-2">
                  <Label>Position Level</Label>
                  <Select value={formState.positionLevel} onValueChange={(value) => setFormState((prev) => ({ ...prev, positionLevel: value as "first_level" | "second_level" }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="first_level">First Level Administrative Position</SelectItem>
                      <SelectItem value="second_level">Second Level Administrative Position</SelectItem>
                    </SelectContent>
                  </Select>
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
        {user?.role === "admin" && (
          <Dialog open={showEdit} onOpenChange={setShowEdit}>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Edit Job Vacancy</DialogTitle></DialogHeader>
              <form className="space-y-4" onSubmit={(e) => {
                e.preventDefault();
                if (!editingId) return;
                updateMutation.mutate({
                  id: editingId,
                  payload: {
                    positionTitle: editFormState.positionTitle,
                    departmentId: editFormState.departmentId,
                    salaryGrade: Number(editFormState.salaryGrade),
                    qualifications: editFormState.qualifications,
                    postingDate: editFormState.postingDate,
                    closingDate: editFormState.closingDate,
                    status: editFormState.status as JobVacancy["status"],
                    positionLevel: editFormState.positionLevel
                  }
                });
              }}>
                <div className="space-y-2">
                  <Label>Position Title</Label>
                  <Select value={editFormState.positionTitle} onValueChange={applyEditTitle}>
                    <SelectTrigger><SelectValue placeholder="Select position title" /></SelectTrigger>
                    <SelectContent>
                      {positionTitleOptions.map((title) => <SelectItem key={title} value={title}>{title}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Department</Label>
                  <Select value={editFormState.departmentId} onValueChange={(value) => setEditFormState((prev) => ({ ...prev, departmentId: value }))}>
                    <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                    <SelectContent>
                      {departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Salary Grade</Label>
                    <Input
                      type="number"
                      placeholder="e.g., 12"
                      value={editFormState.salaryGrade}
                      onChange={(e) => setEditFormState((prev) => ({ ...prev, salaryGrade: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select value={editFormState.status} onValueChange={(value) => setEditFormState((prev) => ({ ...prev, status: value }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Open">Open</SelectItem>
                        <SelectItem value="Closed">Closed</SelectItem>
                        <SelectItem value="Filled">Filled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Position Level</Label>
                  <Select value={editFormState.positionLevel} onValueChange={(value) => setEditFormState((prev) => ({ ...prev, positionLevel: value as "first_level" | "second_level" }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="first_level">First Level Administrative Position</SelectItem>
                      <SelectItem value="second_level">Second Level Administrative Position</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Posting Date</Label>
                    <Input
                      type="date"
                      value={editFormState.postingDate}
                      onChange={(e) => setEditFormState((prev) => ({ ...prev, postingDate: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Closing Date</Label>
                    <Input
                      type="date"
                      value={editFormState.closingDate}
                      onChange={(e) => setEditFormState((prev) => ({ ...prev, closingDate: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Qualification Requirements</Label>
                  <Textarea
                    placeholder="Enter required qualifications..."
                    value={editFormState.qualifications}
                    onChange={(e) => setEditFormState((prev) => ({ ...prev, qualifications: e.target.value }))}
                  />
                </div>
                <div className="flex justify-end gap-3">
                  <Button variant="outline" type="button" onClick={() => setShowEdit(false)}>Cancel</Button>
                  <Button type="submit" disabled={updateMutation.isPending}>Save Changes</Button>
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
      <Card className="border border-border/50 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-border/70 bg-primary text-primary-foreground hover:bg-primary">
                  <TableHead className="h-12 px-4 text-[11px] font-semibold text-primary-foreground uppercase tracking-wide">Position</TableHead>
                  <TableHead className="h-12 px-4 text-[11px] font-semibold text-primary-foreground uppercase tracking-wide">Department</TableHead>
                  <TableHead className="h-12 px-4 text-[11px] font-semibold text-primary-foreground uppercase tracking-wide">SG</TableHead>
                  <TableHead className="h-12 px-4 text-[11px] font-semibold text-primary-foreground uppercase tracking-wide">Posting</TableHead>
                  <TableHead className="h-12 px-4 text-[11px] font-semibold text-primary-foreground uppercase tracking-wide">Closing</TableHead>
                  <TableHead className="h-12 px-4 text-[11px] font-semibold text-primary-foreground uppercase tracking-wide">Status</TableHead>
                  <TableHead className="h-12 px-4 text-[11px] font-semibold text-right text-primary-foreground uppercase tracking-wide">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((vacancy, idx) => (
                  <TableRow
                    key={vacancy.id}
                    className={`border-b border-border/20 h-14 transition-colors ${
                      idx % 2 === 0 ? "bg-background hover:bg-muted/30" : "bg-muted/10 hover:bg-muted/20"
                    }`}
                  >
                    <TableCell className="px-4 py-3 text-sm font-medium text-foreground">{vacancy.positionTitle}</TableCell>
                    <TableCell className="px-4 py-3 text-sm text-muted-foreground">{getDepartmentName(vacancy.departmentId)}</TableCell>
                    <TableCell className="px-4 py-3 text-sm text-muted-foreground">{vacancy.salaryGrade}</TableCell>
                    <TableCell className="px-4 py-3 text-sm text-muted-foreground">{vacancy.postingDate}</TableCell>
                    <TableCell className="px-4 py-3 text-sm text-muted-foreground">{vacancy.closingDate}</TableCell>
                    <TableCell className="px-4 py-3">
                      <span className={`status-badge text-xs ${getVacancyStatusColor(vacancy.status)}`}>{vacancy.status}</span>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-right">
                      <Dialog>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" aria-label="Open actions menu">
                              <Ellipsis className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            <DialogTrigger asChild>
                              <DropdownMenuItem onSelect={(event) => event.preventDefault()}>
                                <Eye className="w-4 h-4 mr-2" />
                                View
                              </DropdownMenuItem>
                            </DialogTrigger>
                            {user?.role === "admin" && (
                              <DropdownMenuItem
                                onClick={() => {
                                  setEditingId(vacancy.id);
                                  setEditFormState({
                                    positionTitle: vacancy.positionTitle,
                                    departmentId: vacancy.departmentId,
                                    salaryGrade: String(vacancy.salaryGrade),
                                    qualifications: vacancy.qualifications,
                                    postingDate: vacancy.postingDate,
                                    closingDate: vacancy.closingDate,
                                    status: vacancy.status,
                                    positionLevel: vacancy.positionLevel ?? "first_level"
                                  });
                                  setShowEdit(true);
                                }}
                              >
                                <Pencil className="w-4 h-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                            )}
                            {user?.role === "admin" && (
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => {
                                  if (window.confirm(`Delete ${vacancy.positionTitle}?`)) {
                                    deleteMutation.mutate(vacancy.id);
                                  }
                                }}
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
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
                    </TableCell>
                  </TableRow>
                ))}                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="px-4 py-8 text-center text-sm text-muted-foreground">
                      No job vacancies found for the selected filters.
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
