import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createApplicant,
  fetchApplicants,
  fetchApplications,
  fetchJobs,
  updateApplicant,
  deleteApplicant,
  uploadApplicantDocument
} from "@/lib/api";
import { getStatusColor } from "@/lib/status";
import { Plus, Search, Eye, Mail, Phone, MapPin, GraduationCap, Briefcase, Upload, Pencil, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Applicants() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editingApplicantId, setEditingApplicantId] = useState<string | null>(null);
  const [formState, setFormState] = useState({
    fullName: "",
    contactNumber: "",
    email: "",
    address: "",
    educationalBackground: "",
    workExperience: ""
  });
  const [editFormState, setEditFormState] = useState({
    fullName: "",
    contactNumber: "",
    email: "",
    address: "",
    educationalBackground: "",
    workExperience: ""
  });
  const [documents, setDocuments] = useState<{ resume: File | null; transcript: File | null; certificate: File | null }>(
    { resume: null, transcript: null, certificate: null }
  );

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

  const createMutation = useMutation({
    mutationFn: async (payload: typeof formState) => {
      const applicant = await createApplicant(payload);
      const uploads: Array<Promise<unknown>> = [];
      if (documents.resume) {
        uploads.push(uploadApplicantDocument(applicant.id, "resume", documents.resume));
      }
      if (documents.transcript) {
        uploads.push(uploadApplicantDocument(applicant.id, "transcript", documents.transcript));
      }
      if (documents.certificate) {
        uploads.push(uploadApplicantDocument(applicant.id, "certificate", documents.certificate));
      }
      await Promise.all(uploads);
      return applicant;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["applicants"] });
      setShowCreate(false);
      setFormState({
        fullName: "",
        contactNumber: "",
        email: "",
        address: "",
        educationalBackground: "",
        workExperience: ""
      });
      setDocuments({ resume: null, transcript: null, certificate: null });
      toast({ title: "Applicant added", description: "The applicant was saved." });
    },
    onError: (error) => {
      toast({ title: "Save failed", description: (error as Error).message, variant: "destructive" });
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

  const filtered = useMemo(() => {
    return applicants.filter((a) =>
      a.fullName.toLowerCase().includes(search.toLowerCase()) ||
      a.email.toLowerCase().includes(search.toLowerCase())
    );
  }, [applicants, search]);

  const getApplicantApplications = (applicantId: string) =>
    applications.filter((app) => app.applicantId === applicantId);

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
                workExperience: formState.workExperience
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
              <div className="grid grid-cols-2 gap-4">
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
                <Label>Upload Documents</Label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { id: "resume", label: "Resume" },
                    { id: "transcript", label: "Transcript" },
                    { id: "certificate", label: "Certificate" }
                  ].map((doc) => (
                    <div key={doc.id} className="space-y-2">
                      <input
                        id={doc.id}
                        type="file"
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                        onChange={(e) => {
                          const file = e.target.files?.[0] ?? null;
                          setDocuments((prev) => ({ ...prev, [doc.id]: file }));
                        }}
                        className="hidden"
                      />
                      <label
                        htmlFor={doc.id}
                        className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-muted/40 px-3 py-4 text-sm text-muted-foreground hover:border-primary/60 hover:text-foreground transition-colors cursor-pointer"
                      >
                        <Upload className="w-5 h-5" />
                        <span>{doc.label}</span>
                      </label>
                    </div>
                  ))}
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
              <div className="grid grid-cols-2 gap-4">
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

      {/* Search */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search by name or email..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {/* List */}
      <div className="grid gap-4 md:grid-cols-2">
        {filtered.map((applicant) => {
          const apps = getApplicantApplications(applicant.id);
          return (
            <Card key={applicant.id} className="card-hover">
              <CardContent className="pt-5 pb-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-foreground">{applicant.fullName}</h3>
                    <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Mail className="w-3 h-3" /> {applicant.email}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Eye className="w-4 h-4 mr-1" /> View
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-lg">
                        <DialogHeader><DialogTitle>{applicant.fullName}</DialogTitle></DialogHeader>
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Phone className="w-4 h-4" /> {applicant.contactNumber}
                            </div>
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Mail className="w-4 h-4" /> {applicant.email}
                            </div>
                            <div className="flex items-center gap-2 text-muted-foreground col-span-2">
                              <MapPin className="w-4 h-4" /> {applicant.address}
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
                            <div>
                              <p className="text-xs font-medium text-muted-foreground mb-2">Applications</p>
                              {apps.map((app) => {
                                const vac = jobVacancies.find((v) => v.id === app.vacancyId);
                                return (
                                  <div key={app.id} className="flex items-center justify-between py-2 border-b last:border-0">
                                    <span className="text-sm">{vac?.positionTitle}</span>
                                    <span className={`status-badge ${getStatusColor(app.status)}`}>{app.status}</span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </DialogContent>
                    </Dialog>
                    <Button
                      variant="outline"
                      size="sm"
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
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => {
                        if (window.confirm(`Delete ${applicant.fullName}?`)) {
                          deleteMutation.mutate(applicant.id);
                        }
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {apps.map((app) => (
                    <span key={app.id} className={`status-badge ${getStatusColor(app.status)}`}>{app.status}</span>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
