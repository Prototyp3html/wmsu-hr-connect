import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
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
  parseApplicantDocument,
  fetchApplicantDocuments,
  getFileUrl
} from "@/lib/api";
import type { ParsedApplicantDraft } from "@/lib/types";
import { getStatusColor } from "@/lib/status";
import { Plus, Search, Eye, Mail, Phone, MapPin, GraduationCap, Briefcase, Upload, Pencil, Trash2, Ellipsis, Check, ChevronsUpDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type NameParts = {
  firstName: string;
  middleName: string;
  lastName: string;
  extensionName: string;
};

type AddressParts = {
  regionCode: string;
  cityCode: string;
  barangayCode: string;
  streetAddress: string;
};

type RegionUnit = {
  code: string;
  name: string;
};

type LocalityUnit = {
  code: string;
  name: string;
  type: "city" | "municipality";
};

type BarangayUnit = {
  code: string;
  name: string;
};

type SearchableOption = {
  value: string;
  label: string;
};

const PSGC_BASE_URL = "https://psgc.gitlab.io/api";

function normalizeLocationText(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function removeMatchedAddressPart(baseAddress: string, matchedPart?: string) {
  if (!matchedPart) return baseAddress;
  const escaped = matchedPart.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return baseAddress.replace(new RegExp(escaped, "ig"), "").replace(/\s{2,}/g, " ").replace(/^,|,$/g, "").trim();
}

function formatFullName(parts: NameParts) {
  return [parts.firstName.trim(), parts.middleName.trim(), parts.lastName.trim(), parts.extensionName.trim()]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function formatAddress(streetAddress: string, barangayName: string, cityName: string, regionName: string) {
  return [streetAddress.trim(), barangayName.trim(), cityName.trim(), regionName.trim()].filter(Boolean).join(", ");
}

function splitFullName(fullName: string): NameParts {
  const suffixes = new Set(["jr", "jr.", "sr", "sr.", "ii", "iii", "iv", "v"]);
  const parts = fullName.trim().replace(/\s+/g, " ").split(" ").filter(Boolean);

  if (parts.length === 0) {
    return { firstName: "", middleName: "", lastName: "", extensionName: "" };
  }

  let extensionName = "";
  const lastToken = parts[parts.length - 1]?.toLowerCase();
  if (lastToken && suffixes.has(lastToken)) {
    extensionName = parts.pop() ?? "";
  }

  const firstName = parts[0] ?? "";
  const lastName = parts.length > 1 ? parts[parts.length - 1] : "";
  const middleName = parts.length > 2 ? parts.slice(1, -1).join(" ") : "";

  return {
    firstName,
    middleName,
    lastName,
    extensionName
  };
}

function SearchableSelect({
  value,
  onValueChange,
  options,
  placeholder,
  searchPlaceholder,
  emptyMessage,
  loadingMessage,
  disabled = false
}: {
  value: string;
  onValueChange: (value: string) => void;
  options: SearchableOption[];
  placeholder: string;
  searchPlaceholder: string;
  emptyMessage: string;
  loadingMessage?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selectedOption = options.find((option) => option.value === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between" disabled={disabled}>
          <span className="truncate text-left">{selectedOption?.label || placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent portalled={false} className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{loadingMessage ?? emptyMessage}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.label}
                  onSelect={() => {
                    onValueChange(option.value);
                    setOpen(false);
                  }}
                >
                  <Check className={value === option.value ? "mr-2 h-4 w-4 opacity-100" : "mr-2 h-4 w-4 opacity-0"} />
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

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
    workExperience: ""
  });
  const [nameParts, setNameParts] = useState<NameParts>({
    firstName: "",
    middleName: "",
    lastName: "",
    extensionName: ""
  });
  const [addressParts, setAddressParts] = useState<AddressParts>({
    regionCode: "",
    cityCode: "",
    barangayCode: "",
    streetAddress: ""
  });
  const [regionUnits, setRegionUnits] = useState<RegionUnit[]>([]);
  const [cityUnits, setCityUnits] = useState<LocalityUnit[]>([]);
  const [barangayUnits, setBarangayUnits] = useState<BarangayUnit[]>([]);
  const [isLoadingRegions, setIsLoadingRegions] = useState(false);
  const [isLoadingCities, setIsLoadingCities] = useState(false);
  const [isLoadingBarangays, setIsLoadingBarangays] = useState(false);
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
  const [isScanningResume, setIsScanningResume] = useState(false);
  const [editDocuments, setEditDocuments] = useState<{ resume: File | null; transcript: File | null; certificates: File[] }>(
    { resume: null, transcript: null, certificates: [] }
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

  const { data: applicantDocuments = [] } = useQuery({
    queryKey: ["applicant-documents", viewingApplicantId],
    queryFn: () => (viewingApplicantId ? fetchApplicantDocuments(viewingApplicantId) : Promise.resolve([])),
    enabled: !!viewingApplicantId
  });

  const { data: editingApplicantDocuments = [] } = useQuery({
    queryKey: ["applicant-documents-edit", editingApplicantId],
    queryFn: () => (editingApplicantId ? fetchApplicantDocuments(editingApplicantId) : Promise.resolve([])),
    enabled: !!editingApplicantId
  });

  const selectedRegionName = useMemo(
    () => regionUnits.find((region) => region.code === addressParts.regionCode)?.name ?? "",
    [regionUnits, addressParts.regionCode]
  );

  const selectedCity = useMemo(
    () => cityUnits.find((city) => city.code === addressParts.cityCode),
    [cityUnits, addressParts.cityCode]
  );

  const selectedCityName = selectedCity?.name ?? "";

  const selectedBarangayName = useMemo(
    () => barangayUnits.find((barangay) => barangay.code === addressParts.barangayCode)?.name ?? "",
    [barangayUnits, addressParts.barangayCode]
  );

  const regionOptions = useMemo<SearchableOption[]>(
    () =>
      regionUnits
        .map((region) => ({ value: region.code, label: region.name }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [regionUnits]
  );

  const cityOptions = useMemo<SearchableOption[]>(
    () => cityUnits.map((city) => ({ value: city.code, label: city.name })),
    [cityUnits]
  );

  const barangayOptions = useMemo<SearchableOption[]>(
    () => barangayUnits.map((barangay) => ({ value: barangay.code, label: barangay.name })),
    [barangayUnits]
  );

  useEffect(() => {
    let isCancelled = false;

    const loadRegions = async () => {
      setIsLoadingRegions(true);
      try {
        const response = await fetch(`${PSGC_BASE_URL}/regions`);
        const data = (await response.json()) as RegionUnit[];
        if (!isCancelled) {
          setRegionUnits(data);
        }
      } catch {
        if (!isCancelled) {
          toast({
            title: "Address data unavailable",
            description: "Unable to load Philippines region list right now.",
            variant: "destructive"
          });
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingRegions(false);
        }
      }
    };

    loadRegions();

    return () => {
      isCancelled = true;
    };
  }, [toast]);

  useEffect(() => {
    let isCancelled = false;

    const loadLocalities = async () => {
      if (!addressParts.regionCode) {
        setCityUnits([]);
        setBarangayUnits([]);
        return;
      }

      setIsLoadingCities(true);
      setBarangayUnits([]);

      try {
        const [citiesResponse, municipalitiesResponse] = await Promise.all([
          fetch(`${PSGC_BASE_URL}/regions/${addressParts.regionCode}/cities`).then((response) =>
            response.ok ? response.json() : []
          ),
          fetch(`${PSGC_BASE_URL}/regions/${addressParts.regionCode}/municipalities`).then((response) =>
            response.ok ? response.json() : []
          )
        ]);

        if (!isCancelled) {
          const normalizedCities = (citiesResponse as Array<{ code: string; name: string }>).map((city) => ({
            code: city.code,
            name: city.name,
            type: "city" as const
          }));
          const normalizedMunicipalities = (municipalitiesResponse as Array<{ code: string; name: string }>).map((municipality) => ({
            code: municipality.code,
            name: municipality.name,
            type: "municipality" as const
          }));

          setCityUnits(
            [...normalizedCities, ...normalizedMunicipalities].sort((a, b) => a.name.localeCompare(b.name))
          );
        }
      } catch {
        if (!isCancelled) {
          toast({
            title: "Address data unavailable",
            description: "Unable to load cities and municipalities for the selected region.",
            variant: "destructive"
          });
          setCityUnits([]);
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingCities(false);
        }
      }
    };

    loadLocalities();

    return () => {
      isCancelled = true;
    };
  }, [addressParts.regionCode, toast]);

  useEffect(() => {
    let isCancelled = false;

    const loadBarangays = async () => {
      if (!selectedCity) {
        setBarangayUnits([]);
        return;
      }

      setIsLoadingBarangays(true);
      try {
        const endpoint = selectedCity.type === "city" ? "cities" : "municipalities";
        const response = await fetch(`${PSGC_BASE_URL}/${endpoint}/${selectedCity.code}/barangays`);
        const data = response.ok ? ((await response.json()) as BarangayUnit[]) : [];

        if (!isCancelled) {
          setBarangayUnits(data.sort((a, b) => a.name.localeCompare(b.name)));
        }
      } catch {
        if (!isCancelled) {
          toast({
            title: "Address data unavailable",
            description: "Unable to load barangays for the selected city/municipality.",
            variant: "destructive"
          });
          setBarangayUnits([]);
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingBarangays(false);
        }
      }
    };

    loadBarangays();

    return () => {
      isCancelled = true;
    };
  }, [selectedCity, toast]);

  const resetCreateForm = () => {
    setFormState({
      fullName: "",
      contactNumber: "",
      email: "",
      address: "",
      educationalBackground: "",
      workExperience: ""
    });
    setNameParts({ firstName: "", middleName: "", lastName: "", extensionName: "" });
    setAddressParts({ regionCode: "", cityCode: "", barangayCode: "", streetAddress: "" });
    setCityUnits([]);
    setBarangayUnits([]);
    setDocuments({ resume: null, transcript: null, certificates: [] });
  };

  const resolveParsedAddressToDropdowns = async (parsedAddress: string) => {
    const normalizedAddress = normalizeLocationText(parsedAddress);
    if (!normalizedAddress) return false;

    const availableRegions =
      regionUnits.length > 0
        ? regionUnits
        : ((await fetch(`${PSGC_BASE_URL}/regions`).then((response) => response.json())) as RegionUnit[]);

    if (regionUnits.length === 0) {
      setRegionUnits(availableRegions);
    }

    for (const region of availableRegions) {
      const [citiesResponse, municipalitiesResponse] = await Promise.all([
        fetch(`${PSGC_BASE_URL}/regions/${region.code}/cities`).then((response) => (response.ok ? response.json() : [])),
        fetch(`${PSGC_BASE_URL}/regions/${region.code}/municipalities`).then((response) => (response.ok ? response.json() : []))
      ]);

      const localities: LocalityUnit[] = [
        ...(citiesResponse as Array<{ code: string; name: string }>).map((city) => ({
          code: city.code,
          name: city.name,
          type: "city" as const
        })),
        ...(municipalitiesResponse as Array<{ code: string; name: string }>).map((municipality) => ({
          code: municipality.code,
          name: municipality.name,
          type: "municipality" as const
        }))
      ].sort((a, b) => b.name.length - a.name.length);

      const matchedLocality = localities.find((locality) => {
        const normalizedLocalityName = normalizeLocationText(locality.name);
        return normalizedLocalityName.length > 0 && normalizedAddress.includes(normalizedLocalityName);
      });

      if (!matchedLocality) {
        continue;
      }

      const endpoint = matchedLocality.type === "city" ? "cities" : "municipalities";
      const barangays = (await fetch(`${PSGC_BASE_URL}/${endpoint}/${matchedLocality.code}/barangays`).then((response) =>
        response.ok ? response.json() : []
      )) as BarangayUnit[];

      const matchedBarangay = barangays
        .sort((a, b) => b.name.length - a.name.length)
        .find((barangay) => normalizedAddress.includes(normalizeLocationText(barangay.name)));

      let streetAddress = parsedAddress.trim();
      streetAddress = removeMatchedAddressPart(streetAddress, region.name);
      streetAddress = removeMatchedAddressPart(streetAddress, matchedLocality.name);
      streetAddress = removeMatchedAddressPart(streetAddress, matchedBarangay?.name);
      streetAddress = streetAddress.replace(/^[,\s-]+|[,\s-]+$/g, "").trim();

      setCityUnits(localities.sort((a, b) => a.name.localeCompare(b.name)));
      setBarangayUnits(barangays.sort((a, b) => a.name.localeCompare(b.name)));
      setAddressParts({
        regionCode: region.code,
        cityCode: matchedLocality.code,
        barangayCode: matchedBarangay?.code ?? "",
        streetAddress
      });

      return true;
    }

    return false;
  };

  const applyParsedDraftToForm = (draft: ParsedApplicantDraft) => {
    if (draft.fullName) {
      setNameParts(splitFullName(draft.fullName));
    }

    setFormState((prev) => ({
      ...prev,
      contactNumber: draft.contactNumber || prev.contactNumber,
      email: draft.email || prev.email,
      educationalBackground: draft.educationalBackground || prev.educationalBackground,
      workExperience: draft.workExperience || prev.workExperience
    }));

    if (draft.address) {
      setAddressParts((prev) => ({
        ...prev,
        streetAddress: draft.address
      }));
    }
  };

  const handleScanResumeAutofill = async () => {
    if (!documents.resume) {
      toast({
        title: "Resume required",
        description: "Upload a resume first, then scan for autofill.",
        variant: "destructive"
      });
      return;
    }

    setIsScanningResume(true);
    try {
      const parsed = await parseApplicantDocument(documents.resume);
      applyParsedDraftToForm(parsed);

      if (parsed.address) {
        const mapped = await resolveParsedAddressToDropdowns(parsed.address);
        if (!mapped) {
          setAddressParts((prev) => ({ ...prev, streetAddress: parsed.address }));
          toast({
            title: "Address partially parsed",
            description: "Address text was captured, but please select region/city/barangay to complete it.",
            variant: "destructive"
          });
        }
      }

      toast({
        title: "Autofill ready",
        description: "Parsed resume data has been applied. Review and edit before saving."
      });
    } catch (error) {
      toast({
        title: "Scan failed",
        description: (error as Error).message,
        variant: "destructive"
      });
    } finally {
      setIsScanningResume(false);
    }
  };

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
      const applicant = await createApplicant(payload);
      const uploads: Array<Promise<unknown>> = [];
      if (documents.resume) {
        uploads.push(uploadApplicantDocument(applicant.id, "resume", documents.resume));
      }
      if (documents.transcript) {
        uploads.push(uploadApplicantDocument(applicant.id, "transcript", documents.transcript));
      }
      documents.certificates.forEach((cert, idx) => {
        uploads.push(uploadApplicantDocument(applicant.id, `certificate_${idx + 1}`, cert));
      });
      await Promise.all(uploads);
      return applicant;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["applicants"] });
      setShowCreate(false);
      resetCreateForm();
      toast({ title: "Applicant added", description: "The applicant was saved." });
    },
    onError: (error) => {
      toast({ title: "Save failed", description: (error as Error).message, variant: "destructive" });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: typeof editFormState }) => {
      await updateApplicant(id, payload);
      const uploads: Array<Promise<unknown>> = [];
      if (editDocuments.resume) {
        uploads.push(uploadApplicantDocument(id, "resume", editDocuments.resume));
      }
      if (editDocuments.transcript) {
        uploads.push(uploadApplicantDocument(id, "transcript", editDocuments.transcript));
      }
      editDocuments.certificates.forEach((cert, idx) => {
        uploads.push(uploadApplicantDocument(id, `certificate_${idx + 1}`, cert));
      });
      if (uploads.length > 0) {
        await Promise.all(uploads);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["applicants"] });
      queryClient.invalidateQueries({ queryKey: ["applicant-documents-edit"] });
      setShowEdit(false);
      setEditingApplicantId(null);
      setEditDocuments({ resume: null, transcript: null, certificates: [] });
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
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Add New Applicant</DialogTitle></DialogHeader>
            <form className="space-y-4" onSubmit={(e) => {
              e.preventDefault();

              if (!nameParts.firstName.trim() || !nameParts.lastName.trim()) {
                toast({ title: "Missing name fields", description: "First name and last name are required.", variant: "destructive" });
                return;
              }

              const hasStructuredAddress = Boolean(addressParts.regionCode && addressParts.cityCode && addressParts.barangayCode);
              const hasFallbackAddress = addressParts.streetAddress.trim().length > 0;

              const fullName = formatFullName(nameParts);
              const address = hasStructuredAddress
                ? formatAddress(addressParts.streetAddress, selectedBarangayName, selectedCityName, selectedRegionName)
                : (addressParts.streetAddress.trim() || "Address not provided");

              createMutation.mutate({
                fullName,
                contactNumber: formState.contactNumber,
                email: formState.email,
                address,
                educationalBackground: formState.educationalBackground,
                workExperience: formState.workExperience
              });
            }}>
              <div className="space-y-2">
                <Label>Name Details</Label>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <Input
                    placeholder="First Name"
                    value={nameParts.firstName}
                    onChange={(e) => setNameParts((prev) => ({ ...prev, firstName: e.target.value }))}
                    required
                  />
                  <Input
                    placeholder="Middle Name"
                    value={nameParts.middleName}
                    onChange={(e) => setNameParts((prev) => ({ ...prev, middleName: e.target.value }))}
                  />
                  <Input
                    placeholder="Last Name"
                    value={nameParts.lastName}
                    onChange={(e) => setNameParts((prev) => ({ ...prev, lastName: e.target.value }))}
                    required
                  />
                  <Input
                    placeholder="Ext. (Jr., Sr., III)"
                    value={nameParts.extensionName}
                    onChange={(e) => setNameParts((prev) => ({ ...prev, extensionName: e.target.value }))}
                  />
                </div>
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
                <div className="space-y-3">
                  <SearchableSelect
                    value={addressParts.regionCode}
                    onValueChange={(regionCode) =>
                      setAddressParts({
                        regionCode,
                        cityCode: "",
                        barangayCode: "",
                        streetAddress: ""
                      })
                    }
                    options={regionOptions}
                    placeholder="Select Region"
                    searchPlaceholder="Search region..."
                    emptyMessage="No region found"
                    loadingMessage={isLoadingRegions ? "Loading regions..." : undefined}
                  />
                  {addressParts.regionCode ? (
                    <SearchableSelect
                      value={addressParts.cityCode}
                      onValueChange={(cityCode) =>
                        setAddressParts((prev) => ({
                          ...prev,
                          cityCode,
                          barangayCode: "",
                          streetAddress: ""
                        }))
                      }
                      options={cityOptions}
                      placeholder="Select City / Municipality"
                      searchPlaceholder="Search city/municipality..."
                      emptyMessage="No city/municipality found"
                      loadingMessage={isLoadingCities ? "Loading cities/municipalities..." : undefined}
                    />
                  ) : null}
                  {addressParts.cityCode ? (
                    <SearchableSelect
                      value={addressParts.barangayCode}
                      onValueChange={(barangayCode) => setAddressParts((prev) => ({ ...prev, barangayCode }))}
                      options={barangayOptions}
                      placeholder="Select Barangay"
                      searchPlaceholder="Search barangay..."
                      emptyMessage="No barangay found"
                      loadingMessage={isLoadingBarangays ? "Loading barangays..." : undefined}
                    />
                  ) : null}
                  {addressParts.barangayCode || addressParts.streetAddress ? (
                    <Input
                      placeholder="Street / Purok / Sitio (Optional)"
                      value={addressParts.streetAddress}
                      onChange={(e) => setAddressParts((prev) => ({ ...prev, streetAddress: e.target.value }))}
                    />
                  ) : null}
                </div>
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
                <div className="space-y-3">
                  {/* Resume */}
                  <div className="space-y-1.5">
                    <span className="text-xs font-medium text-muted-foreground"><span className="text-red-500">*</span> Upload Resume</span>
                    <input
                      id="resume"
                      type="file"
                      accept=".pdf,.docx,.txt"
                      onChange={(e) => {
                        const file = e.target.files?.[0] ?? null;
                        setDocuments((prev) => ({ ...prev, resume: file }));
                      }}
                      className="hidden"
                    />
                    <label
                      htmlFor="resume"
                      className={`flex items-center justify-between gap-2 rounded-lg border-2 border-dashed px-3 py-4 text-sm transition-colors cursor-pointer ${
                        documents.resume
                          ? "border-green-500 bg-green-50 text-green-700"
                          : "border-border bg-muted/40 text-muted-foreground hover:border-primary/60 hover:text-foreground"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {documents.resume ? (
                          <Check className="w-5 h-5 text-green-600" />
                        ) : (
                          <Upload className="w-5 h-5" />
                        )}
                        <span>{documents.resume ? documents.resume.name : "Click to upload or drag file"}</span>
                      </div>
                    </label>
                  </div>

                  {/* Transcript */}
                  <div className="space-y-1.5">
                    <span className="text-xs font-medium text-muted-foreground"><span className="text-red-500">*</span> Upload Transcript</span>
                    <input
                      id="transcript"
                      type="file"
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      onChange={(e) => {
                        const file = e.target.files?.[0] ?? null;
                        setDocuments((prev) => ({ ...prev, transcript: file }));
                      }}
                      className="hidden"
                    />
                    <label
                      htmlFor="transcript"
                      className={`flex items-center justify-between gap-2 rounded-lg border-2 border-dashed px-3 py-4 text-sm transition-colors cursor-pointer ${
                        documents.transcript
                          ? "border-green-500 bg-green-50 text-green-700"
                          : "border-border bg-muted/40 text-muted-foreground hover:border-primary/60 hover:text-foreground"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {documents.transcript ? (
                          <Check className="w-5 h-5 text-green-600" />
                        ) : (
                          <Upload className="w-5 h-5" />
                        )}
                        <span>{documents.transcript ? documents.transcript.name : "Click to upload or drag file"}</span>
                      </div>
                    </label>
                  </div>

                  {/* Certificates */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground"><span className="text-red-500">*</span> Upload Certificates</span>
                      {documents.certificates.length > 0 && (
                        <span className="text-xs text-muted-foreground">({documents.certificates.length} file{documents.certificates.length !== 1 ? "s" : ""})</span>
                      )}
                    </div>
                    <input
                      id="certificate"
                      type="file"
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      onChange={(e) => {
                        const file = e.target.files?.[0] ?? null;
                        if (file) {
                          setDocuments((prev) => ({ ...prev, certificates: [...prev.certificates, file] }));
                          // Reset input so same file can be selected again
                          e.target.value = "";
                        }
                      }}
                      className="hidden"
                    />
                    {documents.certificates.length > 0 && (
                      <div className="space-y-2">
                        {documents.certificates.map((cert, idx) => (
                          <div key={idx} className="flex items-center justify-between gap-2 rounded-lg border border-green-500 bg-green-50 px-3 py-2 text-sm text-green-700">
                            <div className="flex items-center gap-2">
                              <Check className="w-4 h-4 text-green-600" />
                              <span className="truncate">{cert.name}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setDocuments((prev) => ({
                                  ...prev,
                                  certificates: prev.certificates.filter((_, i) => i !== idx)
                                }));
                              }}
                              className="text-green-600 hover:text-green-800 font-medium text-xs"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    <label
                      htmlFor="certificate"
                      className="flex items-center justify-between gap-2 rounded-lg border-2 border-dashed border-border bg-muted/40 px-3 py-4 text-sm text-muted-foreground hover:border-primary/60 hover:text-foreground transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <Upload className="w-5 h-5" />
                        <span>Click to upload or drag files</span>
                      </div>
                    </label>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">Supported formats: PDF, DOCX, DOC, JPG, PNG</p>
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full"
                  onClick={handleScanResumeAutofill}
                  disabled={!documents.resume || isScanningResume}
                >
                  {isScanningResume ? "Scanning Resume..." : "Scan Resume & Autofill Fields"}
                </Button>
              </div>

              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => {
                    setShowCreate(false);
                    resetCreateForm();
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>Save Applicant</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
        <Dialog open={showEdit} onOpenChange={(open) => {
          if (!open) {
            setShowEdit(false);
            setEditingApplicantId(null);
            setEditDocuments({ resume: null, transcript: null, certificates: [] });
          }
        }}>
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
              
              {/* Document Management */}
              <div className="space-y-3 pt-4 border-t">
                <Label>Manage Documents</Label>
                
                {/* Existing Documents */}
                {editingApplicantDocuments.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">Current Documents</p>
                    <div className="space-y-1 max-h-48 overflow-y-auto">
                      {editingApplicantDocuments.map((doc) => (
                        <div key={doc.id} className="flex items-center justify-between gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2 text-xs">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <span className="truncate">{doc.originalName}</span>
                            <span className="text-muted-foreground whitespace-nowrap">({doc.docType})</span>
                          </div>
                          <a
                            href={getFileUrl(doc.url)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 font-medium text-xs shrink-0"
                          >
                            View
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Add New Documents */}
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Add New Documents</p>
                  
                  {/* Resume */}
                  <div className="space-y-1.5">
                    <span className="text-xs font-medium text-muted-foreground"><span className="text-red-500">*</span> Upload Resume</span>
                    <input
                      id="edit-resume"
                      type="file"
                      accept=".pdf,.docx,.txt"
                      onChange={(e) => {
                        const file = e.target.files?.[0] ?? null;
                        setEditDocuments((prev) => ({ ...prev, resume: file }));
                        e.target.value = "";
                      }}
                      className="hidden"
                    />
                    <label
                      htmlFor="edit-resume"
                      className={`flex items-center justify-between gap-2 rounded-lg border-2 border-dashed px-3 py-2 text-xs transition-colors cursor-pointer ${
                        editDocuments.resume
                          ? "border-green-500 bg-green-50 text-green-700"
                          : "border-border bg-muted/40 text-muted-foreground hover:border-primary/60"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {editDocuments.resume ? (
                          <Check className="w-4 h-4 text-green-600" />
                        ) : (
                          <Upload className="w-4 h-4" />
                        )}
                        <span>{editDocuments.resume ? editDocuments.resume.name : "Click to upload or drag file"}</span>
                      </div>
                    </label>
                  </div>

                  {/* Transcript */}
                  <div className="space-y-1.5">
                    <span className="text-xs font-medium text-muted-foreground"><span className="text-red-500">*</span> Upload Transcript</span>
                    <input
                      id="edit-transcript"
                      type="file"
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      onChange={(e) => {
                        const file = e.target.files?.[0] ?? null;
                        setEditDocuments((prev) => ({ ...prev, transcript: file }));
                        e.target.value = "";
                      }}
                      className="hidden"
                    />
                    <label
                      htmlFor="edit-transcript"
                      className={`flex items-center justify-between gap-2 rounded-lg border-2 border-dashed px-3 py-2 text-xs transition-colors cursor-pointer ${
                        editDocuments.transcript
                          ? "border-green-500 bg-green-50 text-green-700"
                          : "border-border bg-muted/40 text-muted-foreground hover:border-primary/60"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {editDocuments.transcript ? (
                          <Check className="w-4 h-4 text-green-600" />
                        ) : (
                          <Upload className="w-4 h-4" />
                        )}
                        <span>{editDocuments.transcript ? editDocuments.transcript.name : "Click to upload or drag file"}</span>
                      </div>
                    </label>
                  </div>

                  {/* Certificates */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground"><span className="text-red-500">*</span> Upload Certificates</span>
                      {editDocuments.certificates.length > 0 && (
                        <span className="text-xs text-muted-foreground">({editDocuments.certificates.length} file{editDocuments.certificates.length !== 1 ? "s" : ""})</span>
                      )}
                    </div>
                    <input
                      id="edit-certificate"
                      type="file"
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      onChange={(e) => {
                        const file = e.target.files?.[0] ?? null;
                        if (file) {
                          setEditDocuments((prev) => ({ ...prev, certificates: [...prev.certificates, file] }));
                          e.target.value = "";
                        }
                      }}
                      className="hidden"
                    />
                    {editDocuments.certificates.length > 0 && (
                      <div className="space-y-2">
                        {editDocuments.certificates.map((cert, idx) => (
                          <div key={idx} className="flex items-center justify-between gap-2 rounded-lg border border-green-500 bg-green-50 px-3 py-2 text-sm text-green-700">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <Check className="w-4 h-4 text-green-600 shrink-0" />
                              <span className="truncate">{cert.name}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setEditDocuments((prev) => ({
                                  ...prev,
                                  certificates: prev.certificates.filter((_, i) => i !== idx)
                                }));
                              }}
                              className="text-green-600 hover:text-green-800 font-medium text-xs shrink-0"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    <label
                      htmlFor="edit-certificate"
                      className="flex items-center justify-between gap-2 rounded-lg border-2 border-dashed border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground hover:border-primary/60 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <Upload className="w-4 h-4" />
                        <span>Click to upload or drag files</span>
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <Button variant="outline" type="button" onClick={() => {
                  setShowEdit(false);
                  setEditingApplicantId(null);
                  setEditDocuments({ resume: null, transcript: null, certificates: [] });
                }}>Cancel</Button>
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
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-sm font-medium">No applicants found</p>
              <p className="text-xs mt-1">Try adjusting your search or filters</p>
            </div>
          ) : (
            <div className="w-full overflow-x-hidden">
              <Table className="w-full">
                <TableHeader>
                  <TableRow className="border-b border-border/70 bg-primary text-primary-foreground hover:bg-primary">
                    <TableHead className="h-12 px-4 text-[11px] font-semibold text-primary-foreground uppercase tracking-wide">Name</TableHead>
                    <TableHead className="h-12 px-4 text-[11px] font-semibold text-primary-foreground uppercase tracking-wide">Email</TableHead>
                    <TableHead className="h-12 px-4 text-[11px] font-semibold text-primary-foreground uppercase tracking-wide">Contact</TableHead>
                    <TableHead className="h-12 px-4 text-[11px] font-semibold text-primary-foreground uppercase tracking-wide">Address</TableHead>
                    <TableHead className="h-12 px-4 text-[11px] font-semibold text-primary-foreground uppercase tracking-wide">Status</TableHead>
                    <TableHead className="h-12 px-4 text-[11px] font-semibold text-right text-primary-foreground uppercase tracking-wide">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((applicant, idx) => {
                    const apps = getApplicantApplications(applicant.id);
                    const latestApp = apps.length > 0 ? apps[0] : null;
                    return (
                      <TableRow
                        key={applicant.id}
                        className={`border-b border-border/20 h-14 transition-colors ${
                          idx % 2 === 0 ? "bg-background hover:bg-muted/30" : "bg-muted/10 hover:bg-muted/20"
                        }`}
                      >
                        <TableCell className="px-4 py-3 text-sm font-medium text-foreground truncate">
                          {applicant.fullName}
                        </TableCell>
                        <TableCell className="px-4 py-3 text-sm text-muted-foreground truncate">
                          {applicant.email}
                        </TableCell>
                        <TableCell className="px-4 py-3 text-sm text-muted-foreground">
                          {applicant.contactNumber}
                        </TableCell>
                        <TableCell className="px-4 py-3 text-sm text-muted-foreground truncate">
                          {applicant.address}
                        </TableCell>
                        <TableCell className="px-4 py-3">
                          {latestApp ? (
                            <span className={`status-badge text-xs ${getStatusColor(latestApp.status)}`}>
                              {latestApp.status}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">No app</span>
                          )}
                        </TableCell>
                        <TableCell className="px-4 py-3 text-right">
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
                                    setEditDocuments({ resume: null, transcript: null, certificates: [] });
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
                      <p className="text-xs font-medium text-muted-foreground mb-2">Submitted Documents ({applicantDocuments.length})</p>
                      <div className="space-y-2">
                        {applicantDocuments.map((doc) => (
                          <div key={doc.id} className="flex items-center justify-between py-2 border-b last:border-0 text-sm">
                            <div className="flex-1">
                              <p className="font-medium text-xs">{doc.originalName}</p>
                              <p className="text-xs text-muted-foreground">{doc.docType}</p>
                            </div>
                            <a
                              href={getFileUrl(doc.url)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 text-xs font-medium"
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
