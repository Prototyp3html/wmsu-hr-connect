import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createApplicant,
  createApplication,
  fetchApplicants,
  fetchApplications,
  fetchJobs,
  updateApplicant,
  deleteApplicant,
  uploadApplicantDocument,
  fetchApplicantDocuments,
  getFileUrl
} from "@/lib/api";
import { getStatusColor } from "@/lib/status";
import { Plus, Search, Eye, Mail, Phone, MapPin, GraduationCap, Briefcase, Upload, Pencil, Trash2, Ellipsis } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Applicants() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showView, setShowView] = useState(false);
  const [showCreateApp, setShowCreateApp] = useState(false);
  const [selectedApplicantForApp, setSelectedApplicantForApp] = useState<string | null>(null);
  const [editingApplicantId, setEditingApplicantId] = useState<string | null>(null);
  const [viewingApplicantId, setViewingApplicantId] = useState<string | null>(null);
  const [formState, setFormState] = useState({
    fullName: "",
    contactNumber: "",
    email: "",
    address: "",
    educationalBackground: "",
    workExperience: "",
    vacancyId: ""
  });
  const [editFormState, setEditFormState] = useState({
    fullName: "",
    contactNumber: "",
    email: "",
    address: "",
    educationalBackground: "",
    workExperience: ""
  });
  const [documents, setDocuments] = useState<{ resume: File | null; transcript: File | null; certificates: File[] }>(
    { resume: null, transcript: null, certificates: [] }
  );
  const [appFormState, setAppFormState] = useState({
    vacancyId: "",
    dateApplied: new Date().toISOString().split("T")[0]
  });

  const { data: applicants = [] } = useQuery({
    queryKey: ["applicants"],
    queryFn: fetchApplicants
  });

  const { data: applications = [] } = useQuery({
    queryKey: ["applications"],
    queryFn: fetchApplications
  });

  const { data: jobVacancies = [] } = useQuery({
    queryKey: ["jobs"],
    queryFn: fetchJobs
  });

  const { data: applicantDocuments = [] } = useQuery({
    queryKey: ["applicant-documents", viewingApplicantId],
    queryFn: () => viewingApplicantId ? fetchApplicantDocuments(viewingApplicantId) : Promise.resolve([]),
    enabled: !!viewingApplicantId
  });

  // Define helper function before using it in useMemo
  const getApplicantApplications = (applicantId: string) =>
    applications.filter((app) => app.applicantId === applicantId);

  const filtered = useMemo(() => {
    let result = applicants.filter((a) =>
      a.fullName.toLowerCase().includes(search.toLowerCase()) ||
      a.email.toLowerCase().includes(search.toLowerCase())
    );

    if (statusFilter && statusFilter !== "all") {
      result = result.filter((a) => {
        const apps = getApplicantApplications(a.id);
        return apps.some((app) => app.status === statusFilter);
      });
    }

    return result;
  }, [applicants, applications, search, statusFilter]);

  const createMutation = useMutation({
    mutationFn: async (payload: typeof formState) => {
      const { vacancyId, ...applicantData } = payload;
      const applicant = await createApplicant(applicantData);
      
      // Create application with "Application Received" status if vacancy is selected
      if (vacancyId) {
        await createApplication({
          applicantId: applicant.id,
          vacancyId,
          dateApplied: new Date().toISOString().split("T")[0],
          remarks: "Created from applicant registration"
        });
      }
      
      // Upload documents sequentially with proper error handling
      const uploadErrors: string[] = [];
      
      try {
        if (documents.resume) {
          try {
            await uploadApplicantDocument(applicant.id, "resume", documents.resume);
          } catch (err) {
            uploadErrors.push(`Resume: ${(err as Error).message}`);
          }
        }
        
        if (documents.transcript) {
          try {
            await uploadApplicantDocument(applicant.id, "transcript", documents.transcript);
          } catch (err) {
            uploadErrors.push(`Transcript: ${(err as Error).message}`);
          }
        }
        
        // Upload multiple certificates
        for (let i = 0; i < documents.certificates.length; i++) {
          try {
            await uploadApplicantDocument(applicant.id, `certificate_${i + 1}`, documents.certificates[i]);
          } catch (err) {
            uploadErrors.push(`Certificate ${i + 1}: ${(err as Error).message}`);
          }
        }
        
        if (uploadErrors.length > 0) {
          throw new Error(`Some files failed to upload: ${uploadErrors.join('; ')}`);
        }
      } catch (error) {
        // If uploads fail but applicant was created, still throw the error
        throw error;
      }
      
      return applicant;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["applicants"] });
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      setShowCreate(false);
      setFormState({
        fullName: "",
        contactNumber: "",
        email: "",
        address: "",
        educationalBackground: "",
        workExperience: "",
        vacancyId: ""
      });
      setDocuments({ resume: null, transcript: null, certificates: [] });
      toast({ title: "Applicant added", description: "The applicant has been saved and is now in Application Tracking." });
    },
    onError: (error) => {
      const errorMessage = (error as Error).message || "Failed to save applicant";
      console.error("Applicant creation error:", error);
      toast({ title: "Save failed", description: errorMessage, variant: "destructive" });
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: typeof editFormState }) => updateApplicant(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["applicants"] });
      setShowEdit(false);
      setEditingApplicantId(null);
      toast({ title: "Applicant updated", description: "Changes saved." });
    },
    onError: (error) => {
      toast({ title: "Update failed", description: (error as Error).message, variant: "destructive" });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: deleteApplicant,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["applicants"] });
      toast({ title: "Applicant deleted", description: "The applicant was removed." });
    },
    onError: (error) => {
      toast({ title: "Delete failed", description: (error as Error).message, variant: "destructive" });
    }
  });
  const createAppMutation = useMutation({
    mutationFn: createApplication,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      setShowCreateApp(false);
      setSelectedApplicantForApp(null);
      setAppFormState({ vacancyId: "", dateApplied: new Date().toISOString().split("T")[0] });
      toast({ title: "Application added", description: "The applicant was added to application tracking." });
    },
    onError: (error) => {
      toast({ title: "Save failed", description: (error as Error).message, variant: "destructive" });
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display text-foreground">Applicants</h1>
          <p className="text-sm text-muted-foreground mt-1">{filtered.length} applicant(s)</p>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" /> Add Applicant</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Add New Applicant</DialogTitle></DialogHeader>
            <form className="space-y-4" onSubmit={(e) => {
              e.preventDefault();
              createMutation.mutate({
                fullName: formState.fullName,
                contactNumber: formState.contactNumber,
                email: formState.email,
                address: formState.address,
                educationalBackground: formState.educationalBackground,
                workExperience: formState.workExperience,
                vacancyId: formState.vacancyId
              });
            }}>
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input
                  placeholder="e.g., Juan Dela Cruz"
                  value={formState.fullName}
                  onChange={(e) => setFormState((prev) => ({ ...prev, fullName: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Contact Number</Label>
                  <Input
                    placeholder="09XXXXXXXXX"
                    value={formState.contactNumber}
                    onChange={(e) => setFormState((prev) => ({ ...prev, contactNumber: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    placeholder="email@example.com"
                    value={formState.email}
                    onChange={(e) => setFormState((prev) => ({ ...prev, email: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Address</Label>
                <Input
                  placeholder="City, Province"
                  value={formState.address}
                  onChange={(e) => setFormState((prev) => ({ ...prev, address: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Educational Background</Label>
                <Textarea
                  placeholder="Degree - School"
                  value={formState.educationalBackground}
                  onChange={(e) => setFormState((prev) => ({ ...prev, educationalBackground: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Work Experience</Label>
                <Textarea
                  placeholder="Years and relevant positions"
                  value={formState.workExperience}
                  onChange={(e) => setFormState((prev) => ({ ...prev, workExperience: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Apply for Position</Label>
                <Select value={formState.vacancyId} onValueChange={(value) => setFormState((prev) => ({ ...prev, vacancyId: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a job vacancy" />
                  </SelectTrigger>
                  <SelectContent>
                    {jobVacancies.map((job) => (
                      <SelectItem key={job.id} value={job.id}>
                        {job.positionTitle}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Optional: Select a position to automatically track this applicant</p>
              </div>
              <div className="space-y-2">
                <Label>Upload Documents</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { id: "resume", label: "Resume" },
                    { id: "transcript", label: "Transcript" }
                  ].map((doc) => {
                    const file = documents[doc.id as keyof typeof documents];
                    const isSelected = !!file;
                    
                    return (
                      <div key={doc.id} className="space-y-2">
                        <input
                          id={doc.id}
                          type="file"
                          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                          onChange={(e) => {
                            const selectedFile = e.target.files?.[0] ?? null;
                            setDocuments((prev) => ({ ...prev, [doc.id]: selectedFile }));
                          }}
                          className="hidden"
                        />
                        <label
                          htmlFor={doc.id}
                          className={`flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-3 py-4 text-sm transition-colors cursor-pointer ${
                            isSelected
                              ? "border-green-500 bg-green-50 text-green-700"
                              : "border-border bg-muted/40 text-muted-foreground hover:border-primary/60 hover:text-foreground"
                          }`}
                        >
                          {isSelected ? (
                            <>
                              <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                                <span className="text-white text-xs">✓</span>
                              </div>
                              <div className="text-center">
                                <div className="font-medium">{doc.label}</div>
                                <div className="text-xs truncate max-w-[120px]">{file.name}</div>
                              </div>
                            </>
                          ) : (
                            <>
                              <Upload className="w-5 h-5" />
                              <span>{doc.label}</span>
                            </>
                          )}
                        </label>
                      </div>
                    );
                  })}
                </div>
                <div className="space-y-2">
                  <Label>Certificates (Multiple Allowed)</Label>
                  <div className="space-y-2">
                    <input
                      id="certificates"
                      type="file"
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      multiple
                      onChange={(e) => {
                        const files = Array.from(e.target.files ?? []);
                        setDocuments((prev) => ({ ...prev, certificates: files }));
                      }}
                      className="hidden"
                    />
                    <label
                      htmlFor="certificates"
                      className={`flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-3 py-4 text-sm transition-colors cursor-pointer ${
                        documents.certificates.length > 0
                          ? "border-blue-500 bg-blue-50 text-blue-700"
                          : "border-border bg-muted/40 text-muted-foreground hover:border-primary/60 hover:text-foreground"
                      }`}
                    >
                      {documents.certificates.length > 0 ? (
                        <>
                          <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                            <span className="text-white text-xs">{documents.certificates.length}</span>
                          </div>
                          <div className="text-center">
                            <div className="font-medium">Certificates ({documents.certificates.length})</div>
                            <div className="text-xs space-y-1">
                              {documents.certificates.slice(0, 2).map((cert, idx) => (
                                <div key={idx} className="truncate max-w-[120px]">{cert.name}</div>
                              ))}
                              {documents.certificates.length > 2 && <div className="text-xs">+{documents.certificates.length - 2} more</div>}
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          <Upload className="w-5 h-5" />
                          <span>Add Certificates</span>
                        </>
                      )}
                    </label>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">Accepted: PDF, DOC, JPG</p>
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="outline" type="button" onClick={() => setShowCreate(false)}>Cancel</Button>
                <Button type="submit" disabled={createMutation.isPending}>Save Applicant</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
        <Dialog open={showEdit} onOpenChange={setShowEdit}>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Edit Applicant</DialogTitle></DialogHeader>
            <form className="space-y-4" onSubmit={(e) => {
              e.preventDefault();
              if (!editingApplicantId) return;
              updateMutation.mutate({ id: editingApplicantId, payload: editFormState });
            }}>
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input
                  placeholder="e.g., Juan Dela Cruz"
                  value={editFormState.fullName}
                  onChange={(e) => setEditFormState((prev) => ({ ...prev, fullName: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Contact Number</Label>
                  <Input
                    placeholder="09XXXXXXXXX"
                    value={editFormState.contactNumber}
                    onChange={(e) => setEditFormState((prev) => ({ ...prev, contactNumber: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    placeholder="email@example.com"
                    value={editFormState.email}
                    onChange={(e) => setEditFormState((prev) => ({ ...prev, email: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Address</Label>
                <Input
                  placeholder="City, Province"
                  value={editFormState.address}
                  onChange={(e) => setEditFormState((prev) => ({ ...prev, address: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Educational Background</Label>
                <Textarea
                  placeholder="Degree - School"
                  value={editFormState.educationalBackground}
                  onChange={(e) => setEditFormState((prev) => ({ ...prev, educationalBackground: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Work Experience</Label>
                <Textarea
                  placeholder="Years and relevant positions"
                  value={editFormState.workExperience}
                  onChange={(e) => setEditFormState((prev) => ({ ...prev, workExperience: e.target.value }))}
                />
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="outline" type="button" onClick={() => setShowEdit(false)}>Cancel</Button>
                <Button type="submit" disabled={updateMutation.isPending}>Save Changes</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Filter */}
      <Card className="border border-border/50 shadow-sm">
        <CardContent className="pt-4 pb-4 space-y-4">
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground">Search Applicants</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search by name or email..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground">Filter by Application Status</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="Application Received">Application Received</SelectItem>
                <SelectItem value="Under Initial Screening">Under Initial Screening</SelectItem>
                <SelectItem value="For Examination">For Examination</SelectItem>
                <SelectItem value="For Interview">For Interview</SelectItem>
                <SelectItem value="For Final Evaluation">For Final Evaluation</SelectItem>
                <SelectItem value="Approved">Approved</SelectItem>
                <SelectItem value="Hired">Hired</SelectItem>
                <SelectItem value="Rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border border-border/50 shadow-sm overflow-hidden">
        <CardContent className="pt-0 pb-0">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-sm font-medium">No applicants found</p>
              <p className="text-xs mt-1">Try adjusting your search or filters</p>
            </div>
          ) : (
            <div className="w-full overflow-x-hidden">
              <Table className="w-full">
                <TableHeader>
                  <TableRow className="border-b border-border/70 bg-muted/40 hover:bg-muted/40">
                    <TableHead className="h-11 px-2 py-2 text-xs font-semibold text-foreground lowercase tracking-wide w-32">Name</TableHead>
                    <TableHead className="h-11 px-2 py-2 text-xs font-semibold text-foreground lowercase tracking-wide flex-1 min-w-40">Email</TableHead>
                    <TableHead className="h-11 px-2 py-2 text-xs font-semibold text-foreground lowercase tracking-wide w-28">Contact</TableHead>
                    <TableHead className="h-11 px-2 py-2 text-xs font-semibold text-foreground lowercase tracking-wide w-32">Address</TableHead>
                    <TableHead className="h-11 px-2 py-2 text-xs font-semibold text-foreground lowercase tracking-wide w-28">Status</TableHead>
                    <TableHead className="h-11 px-2 py-2 text-xs font-semibold text-right text-foreground lowercase tracking-wide w-16">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((applicant, idx) => {
                    const apps = getApplicantApplications(applicant.id);
                    const latestApp = apps.length > 0 ? apps[0] : null;
                    return (
                      <TableRow
                        key={applicant.id}
                        className={`border-b border-border/20 h-11 transition-colors ${
                          idx % 2 === 0 ? "bg-background hover:bg-muted/30" : "bg-muted/10 hover:bg-muted/20"
                        }`}
                      >
                        <TableCell className="px-2 py-2 text-xs font-medium text-foreground truncate w-32">
                          {applicant.fullName}
                        </TableCell>
                        <TableCell className="px-2 py-2 text-xs text-muted-foreground truncate flex-1 min-w-40">
                          {applicant.email}
                        </TableCell>
                        <TableCell className="px-2 py-2 text-xs text-muted-foreground w-28">
                          {applicant.contactNumber}
                        </TableCell>
                        <TableCell className="px-2 py-2 text-xs text-muted-foreground truncate w-32">
                          {applicant.address}
                        </TableCell>
                        <TableCell className="px-2 py-2 w-28">
                          {latestApp ? (
                            <span className={`status-badge text-xs ${getStatusColor(latestApp.status)}`}>
                              {latestApp.status}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">No app</span>
                          )}
                        </TableCell>
                        <TableCell className="px-2 py-2 text-right w-16">
                          <div className="flex justify-end">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" aria-label="Open actions menu">
                                  <Ellipsis className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-40">
                                <DropdownMenuItem
                                  onClick={() => {
                                    setViewingApplicantId(applicant.id);
                                    setShowView(true);
                                  }}
                                >
                                  <Eye className="w-4 h-4 mr-2" />
                                  View
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    setEditingApplicantId(applicant.id);
                                    setEditFormState({
                                      fullName: applicant.fullName,
                                      contactNumber: applicant.contactNumber,
                                      email: applicant.email,
                                      address: applicant.address,
                                      educationalBackground: applicant.educationalBackground,
                                      workExperience: applicant.workExperience
                                    });
                                    setShowEdit(true);
                                  }}
                                >
                                  <Pencil className="w-4 h-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedApplicantForApp(applicant.id);
                                    setShowCreateApp(true);
                                  }}
                                >
                                  <Plus className="w-4 h-4 mr-2" />
                                  Apply
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={() => {
                                    if (window.confirm(`Delete ${applicant.fullName}?`)) {
                                      deleteMutation.mutate(applicant.id);
                                    }
                                  }}
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={showView}
        onOpenChange={(open) => {
          setShowView(open);
          if (!open) {
            setViewingApplicantId(null);
          }
        }}
      >
        <DialogContent className="max-w-lg">
          {viewingApplicantId && (() => {
            const applicant = applicants.find((a) => a.id === viewingApplicantId);
            if (!applicant) return null;
            const apps = getApplicantApplications(applicant.id);
            return (
              <>
                <DialogHeader><DialogTitle>{applicant.fullName}</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="w-4 h-4 flex-shrink-0" /> <span className="truncate">{applicant.contactNumber}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="w-4 h-4 flex-shrink-0" /> <span className="truncate">{applicant.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground sm:col-span-2">
                      <MapPin className="w-4 h-4 flex-shrink-0" /> <span className="truncate">{applicant.address}</span>
                    </div>
                  </div>
                  <div className="text-sm space-y-2">
                    <div className="flex items-start gap-2">
                      <GraduationCap className="w-4 h-4 text-muted-foreground mt-0.5" />
                      <div><p className="text-xs text-muted-foreground">Education</p><p>{applicant.educationalBackground}</p></div>
                    </div>
                    <div className="flex items-start gap-2">
                      <Briefcase className="w-4 h-4 text-muted-foreground mt-0.5" />
                      <div><p className="text-xs text-muted-foreground">Experience</p><p>{applicant.workExperience}</p></div>
                    </div>
                  </div>
                  {apps.length > 0 && (
                    <div className="border-t pt-3">
                      <p className="text-xs font-medium text-muted-foreground mb-2">Applications ({apps.length})</p>
                      {apps.map((app) => {
                        const vac = jobVacancies.find((v) => v.id === app.vacancyId);
                        return (
                          <div key={app.id} className="flex items-center justify-between py-2 border-b last:border-0 text-sm">
                            <span>{vac?.positionTitle}</span>
                            <span className={`status-badge text-xs ${getStatusColor(app.status)}`}>{app.status}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {applicantDocuments.length > 0 && (
                    <div className="border-t pt-3">
                      <p className="text-xs font-medium text-muted-foreground mb-2">Uploaded Documents ({applicantDocuments.length})</p>
                      <div className="space-y-2">
                        {applicantDocuments.map((doc) => (
                          <div key={doc.id} className="flex items-start justify-between gap-2 p-2 rounded bg-muted/40 text-sm">
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-xs truncate">{doc.originalName}</div>
                              <div className="text-xs text-muted-foreground capitalize">{doc.docType.replace(/_/g, ' ')}</div>
                            </div>
                            <a
                              href={getFileUrl(doc.url)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs px-2 py-1 rounded bg-primary text-primary-foreground hover:bg-primary/90 flex-shrink-0 whitespace-nowrap"
                            >
                              View
                            </a>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      <Dialog
        open={showCreateApp}
        onOpenChange={(open) => {
          if (!open) {
            setShowCreateApp(false);
            setSelectedApplicantForApp(null);
            setAppFormState({ vacancyId: "", dateApplied: new Date().toISOString().split("T")[0] });
          }
        }}
      >
        <DialogContent>
          <DialogHeader><DialogTitle>Add Job Application</DialogTitle></DialogHeader>
          {selectedApplicantForApp && (
            <form className="space-y-4" onSubmit={(e) => {
              e.preventDefault();
              if (!appFormState.vacancyId) return;
              createAppMutation.mutate({
                applicantId: selectedApplicantForApp,
                vacancyId: appFormState.vacancyId,
                dateApplied: appFormState.dateApplied
              });
            }}>
              <div className="text-sm text-muted-foreground">
                Applicant: <span className="font-medium text-foreground">{applicants.find(a => a.id === selectedApplicantForApp)?.fullName}</span>
              </div>
              <div className="space-y-2">
                <Label>Job Vacancy</Label>
                <Select value={appFormState.vacancyId} onValueChange={(value) => setAppFormState((prev) => ({ ...prev, vacancyId: value }))}>
                  <SelectTrigger><SelectValue placeholder="Select a job vacancy" /></SelectTrigger>
                  <SelectContent>
                    {jobVacancies.filter(v => v.status === "Open").map((job) => (
                      <SelectItem key={job.id} value={job.id}>{job.positionTitle}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Date Applied</Label>
                <Input
                  type="date"
                  value={appFormState.dateApplied}
                  onChange={(e) => setAppFormState((prev) => ({ ...prev, dateApplied: e.target.value }))}
                />
              </div>
              <Button className="w-full" type="submit" disabled={createAppMutation.isPending}>Save Application</Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
