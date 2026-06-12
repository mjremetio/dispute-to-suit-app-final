import CROLayout from "@/components/CROLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { FilePlus, Upload, X, FileText, User, AlertCircle, CheckCircle2, Images } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useState, useRef } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

type UploadedFile = { name: string; url: string; size: number; type: string; preview?: string };

export default function CROIntakeForm() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const proofInputRef = useRef<HTMLInputElement>(null);

  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [formData, setFormData] = useState({
    clientFirstName: "",
    clientLastName: "",
    clientDateOfBirth: "",
    clientEmail: "",
    clientAddress: "",
    clientCity: "",
    clientState: "",
    clientZipCode: "",
  });

  // Multiple proof screenshots (all three bureau screenshots can be uploaded)
  const [proofScreenshots, setProofScreenshots] = useState<UploadedFile[]>([]);
  // Additional supporting documents (credit reports, dispute letters, etc.)
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isDraggingProof, setIsDraggingProof] = useState(false);
  const [isDraggingDocs, setIsDraggingDocs] = useState(false);

  const { data: clients } = trpc.cro.myClients.useQuery();

  const isExistingClient = selectedClientId !== "" && selectedClientId !== "new";

  const updateFormField = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleClientSelect = (clientId: string) => {
    setSelectedClientId(clientId);
    if (clientId === "new") {
      setFormData({ clientFirstName: "", clientLastName: "", clientDateOfBirth: "", clientEmail: "", clientAddress: "", clientCity: "", clientState: "", clientZipCode: "" });
    } else {
      const client = clients?.find(c => c.id === parseInt(clientId));
      if (client) {
        setFormData({
          clientFirstName: client.firstName,
          clientLastName: client.lastName,
          clientDateOfBirth: client.dateOfBirth ? new Date(client.dateOfBirth).toISOString().split('T')[0] : "",
          clientEmail: client.email || "",
          clientAddress: client.address || "",
          clientCity: client.city || "",
          clientState: client.state || "",
          clientZipCode: client.zipCode || "",
        });
      }
    }
  };

  const submitMutation = trpc.cro.submitIntakeInquiry.useMutation({
    onSuccess: () => {
      toast.success("Intake inquiry submitted successfully");
      utils.cro.myInquiries.invalidate();
      utils.cro.dashboardStats.invalidate();
      setLocation("/cro-portal/inquiries");
    },
    onError: (err) => toast.error(err.message),
  });

  const uploadFileToS3 = async (file: File): Promise<{ fileKey: string; fileUrl: string }> => {
    const fd = new FormData();
    fd.append("file", file);
    const response = await fetch("/api/files/upload-intake-file", { method: "POST", body: fd });
    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: "Upload failed" }));
      throw new Error(err.error || "Upload failed");
    }
    return response.json();
  };

  const processFiles = async (
    files: File[],
    setter: React.Dispatch<React.SetStateAction<UploadedFile[]>>
  ) => {
    if (files.length === 0) return;
    setIsUploading(true);
    const results: UploadedFile[] = [];
    for (const file of files) {
      try {
        const { fileUrl } = await uploadFileToS3(file);
        const preview = file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined;
        results.push({ name: file.name, url: fileUrl, size: file.size, type: file.type, preview });
        toast.success(`Uploaded: ${file.name}`);
      } catch (err: any) {
        toast.error(`Failed to upload ${file.name}: ${err.message}`);
      }
    }
    setter(prev => [...prev, ...results]);
    setIsUploading(false);
  };

  const handleProofChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    await processFiles(files, setProofScreenshots);
    if (proofInputRef.current) proofInputRef.current.value = "";
  };

  const handleDocsChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    await processFiles(files, setUploadedFiles);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleProofDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingProof(false);
    const files = Array.from(e.dataTransfer.files).filter(f => /\.(pdf|jpe?g|png|gif|webp)$/i.test(f.name));
    await processFiles(files, setProofScreenshots);
  };

  const handleDocsDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingDocs(false);
    const files = Array.from(e.dataTransfer.files).filter(f => /\.(pdf|jpe?g|png|gif|webp)$/i.test(f.name));
    await processFiles(files, setUploadedFiles);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.clientFirstName || !formData.clientLastName || !formData.clientEmail ||
      !formData.clientAddress || !formData.clientCity || !formData.clientState || !formData.clientZipCode) {
      toast.error("Please fill in all required fields");
      return;
    }
    if (proofScreenshots.length === 0) {
      toast.error("Please upload at least one screenshot as proof of AnnualCreditReport.com upload");
      return;
    }
    const fullAddress = `${formData.clientAddress}, ${formData.clientCity}, ${formData.clientState}, ${formData.clientZipCode}`;
    submitMutation.mutate({
      clientId: selectedClientId && selectedClientId !== "new" ? parseInt(selectedClientId) : undefined,
      clientFirstName: formData.clientFirstName,
      clientLastName: formData.clientLastName,
      clientDateOfBirth: formData.clientDateOfBirth ? new Date(formData.clientDateOfBirth) : undefined,
      clientEmail: formData.clientEmail,
      clientFullAddress: fullAddress,
      clientAddress: formData.clientAddress,
      clientCity: formData.clientCity,
      clientState: formData.clientState,
      clientZipCode: formData.clientZipCode,
      supportingDocuments: uploadedFiles.length > 0 ? uploadedFiles.map(f => f.url) : undefined,
      annualCreditReportScreenshot: proofScreenshots.length === 1
        ? proofScreenshots[0].url
        : proofScreenshots.map(s => s.url),
    });
  };

  const FileCard = ({
    file,
    onRemove,
    accent = false,
  }: {
    file: UploadedFile;
    onRemove: () => void;
    accent?: boolean;
  }) => (
    <div className={`border rounded-lg p-3 flex items-start gap-3 ${accent ? "border-amber-200 bg-amber-50" : "border-slate-200 bg-slate-50"}`}>
      {file.preview ? (
        <img src={file.preview} alt="Preview" className="w-16 h-16 object-cover rounded border flex-shrink-0" />
      ) : (
        <div className={`w-16 h-16 rounded border flex items-center justify-center flex-shrink-0 ${accent ? "bg-amber-100" : "bg-white"}`}>
          <FileText className="w-7 h-7 text-slate-400" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-900 truncate">{file.name}</p>
        <p className="text-xs text-slate-500 mt-0.5">{formatFileSize(file.size)}</p>
        <div className="flex items-center gap-1 mt-1">
          <CheckCircle2 className="w-3 h-3 text-green-500" />
          <span className="text-xs text-green-600">Uploaded</span>
        </div>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50 flex-shrink-0"
        onClick={onRemove}
      >
        <X className="w-4 h-4" />
      </Button>
    </div>
  );

  return (
    <CROLayout>
      <div className="space-y-4 sm:space-y-6 md:space-y-8 max-w-3xl mx-auto">
        <div className="border-b border-slate-200 pb-6">
          <div className="flex items-center gap-3">
            <FilePlus className="w-8 h-8 text-amber-600" />
            <div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-serif font-bold text-slate-900 tracking-tight">File Intake Inquiry</h1>
              <p className="text-slate-600 mt-2 text-lg">Submit a new client intake inquiry for paralegal review</p>
            </div>
          </div>
        </div>

        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-xl font-serif">Client Information</CardTitle>
            <CardDescription>Provide the client details for this intake inquiry</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Required Disclaimer */}
              <Alert className="border-red-200 bg-red-50">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800 font-medium">
                  <strong>Required:</strong> Upload all supporting documents to annualcreditreport.com first. If documents are not uploaded/provided, this inquiry will be rejected by the Paralegal/Admin team.
                </AlertDescription>
              </Alert>

              {/* Client Selector */}
              <div className="space-y-2">
                <Label htmlFor="clientSelect" className="text-sm font-semibold">Select Client</Label>
                <Select value={selectedClientId} onValueChange={handleClientSelect}>
                  <SelectTrigger className="border-slate-300">
                    <SelectValue placeholder="Choose existing client or create new..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        <span>Create New Client</span>
                      </div>
                    </SelectItem>
                    {clients?.map((client) => (
                      <SelectItem key={client.id} value={client.id.toString()}>
                        {client.firstName} {client.lastName} {client.email && `(${client.email})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* CRO Name (auto-filled) */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">CRO Name</Label>
                <Input value={user?.name || "Unknown CRO"} disabled className="bg-slate-50 border-slate-300" />
              </div>

              {isExistingClient && (
                <Alert className="border-blue-200 bg-blue-50">
                  <AlertCircle className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-800 text-sm">
                    Client details are auto-filled from the selected client record. To edit, go to <strong>My Clients</strong> page.
                  </AlertDescription>
                </Alert>
              )}

              {/* Client Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="clientFirstName" className="text-sm font-semibold">Client First Name *</Label>
                  <Input id="clientFirstName" placeholder="John" value={formData.clientFirstName} onChange={(e) => updateFormField("clientFirstName", e.target.value)} className={isExistingClient ? "bg-slate-50 border-slate-300" : "border-slate-300"} disabled={isExistingClient} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="clientLastName" className="text-sm font-semibold">Client Last Name *</Label>
                  <Input id="clientLastName" placeholder="Doe" value={formData.clientLastName} onChange={(e) => updateFormField("clientLastName", e.target.value)} className={isExistingClient ? "bg-slate-50 border-slate-300" : "border-slate-300"} disabled={isExistingClient} required />
                </div>
              </div>

              {/* Client DOB */}
              <div className="space-y-2">
                <Label htmlFor="clientDateOfBirth" className="text-sm font-semibold">Client Date of Birth *</Label>
                <Input id="clientDateOfBirth" type="date" value={formData.clientDateOfBirth} onChange={(e) => updateFormField("clientDateOfBirth", e.target.value)} className={isExistingClient ? "bg-slate-50 border-slate-300" : "border-slate-300"} disabled={isExistingClient} required />
              </div>

              {/* Client Email */}
              <div className="space-y-2">
                <Label htmlFor="clientEmail" className="text-sm font-semibold">Client Email *</Label>
                <Input id="clientEmail" type="email" placeholder="client@example.com" value={formData.clientEmail} onChange={(e) => updateFormField("clientEmail", e.target.value)} className={isExistingClient ? "bg-slate-50 border-slate-300" : "border-slate-300"} disabled={isExistingClient} required />
              </div>

              {/* Client Address */}
              <div className="space-y-2">
                <Label htmlFor="clientAddress" className="text-sm font-semibold">Street Address *</Label>
                <Input id="clientAddress" placeholder="123 Main St, Apt 4B" value={formData.clientAddress} onChange={(e) => updateFormField("clientAddress", e.target.value)} className={isExistingClient ? "bg-slate-50 border-slate-300" : "border-slate-300"} disabled={isExistingClient} required />
              </div>

              {/* City, State, Zip */}
              <div className="grid grid-cols-1 sm:grid-cols-6 gap-4">
                <div className="sm:col-span-3 space-y-2">
                  <Label htmlFor="clientCity" className="text-sm font-semibold">City *</Label>
                  <Input id="clientCity" placeholder="Los Angeles" value={formData.clientCity} onChange={(e) => updateFormField("clientCity", e.target.value)} className={isExistingClient ? "bg-slate-50 border-slate-300" : "border-slate-300"} disabled={isExistingClient} required />
                </div>
                <div className="sm:col-span-2 space-y-2">
                  <Label htmlFor="clientState" className="text-sm font-semibold">State *</Label>
                  <Input id="clientState" placeholder="CA" value={formData.clientState} onChange={(e) => updateFormField("clientState", e.target.value)} className={isExistingClient ? "bg-slate-50 border-slate-300" : "border-slate-300"} disabled={isExistingClient} required />
                </div>
                <div className="sm:col-span-1 space-y-2">
                  <Label htmlFor="clientZipCode" className="text-sm font-semibold">ZIP *</Label>
                  <Input id="clientZipCode" placeholder="90001" value={formData.clientZipCode} onChange={(e) => updateFormField("clientZipCode", e.target.value)} className={isExistingClient ? "bg-slate-50 border-slate-300" : "border-slate-300"} disabled={isExistingClient} required />
                </div>
              </div>

              {/* AnnualCreditReport.com Proof Screenshots - REQUIRED, supports multiple */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-semibold">AnnualCreditReport.com Proof of Upload *</Label>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Upload screenshots from all three bureaus (Equifax, Experian, TransUnion). Multiple files supported.
                    </p>
                  </div>
                  {proofScreenshots.length > 0 && (
                    <Badge variant="secondary" className="bg-green-100 text-green-700 border-green-200">
                      {proofScreenshots.length} file{proofScreenshots.length !== 1 ? "s" : ""} uploaded
                    </Badge>
                  )}
                </div>

                {/* Drag-and-drop zone */}
                <div
                  className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all ${
                    isDraggingProof
                      ? "border-amber-500 bg-amber-100 scale-[1.01]"
                      : "border-amber-300 bg-amber-50 hover:border-amber-400 hover:bg-amber-100"
                  }`}
                  onClick={() => proofInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setIsDraggingProof(true); }}
                  onDragLeave={() => setIsDraggingProof(false)}
                  onDrop={handleProofDrop}
                >
                  <Images className="w-8 h-8 text-amber-600 mx-auto mb-2" />
                  <p className="text-sm text-slate-700 font-medium">
                    {isDraggingProof ? "Drop screenshots here" : "Click or drag & drop screenshots here"}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">PDF, JPG, PNG, WebP — Max 10MB each — Multiple files allowed</p>
                  {isUploading && (
                    <p className="text-xs text-amber-600 mt-2 font-medium animate-pulse">Uploading...</p>
                  )}
                </div>
                <input ref={proofInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.gif,.webp" multiple className="hidden" onChange={handleProofChange} />

                {/* Uploaded proof screenshots list */}
                {proofScreenshots.length > 0 && (
                  <div className="space-y-2">
                    {proofScreenshots.map((file, idx) => (
                      <FileCard
                        key={idx}
                        file={file}
                        accent
                        onRemove={() => setProofScreenshots(prev => prev.filter((_, i) => i !== idx))}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Supporting Documents */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-semibold">Additional Supporting Documents</Label>
                    <p className="text-xs text-slate-500 mt-0.5">Credit reports, dispute letters, ID copies, etc. Multiple files supported.</p>
                  </div>
                  {uploadedFiles.length > 0 && (
                    <Badge variant="secondary" className="bg-slate-100 text-slate-600">
                      {uploadedFiles.length} file{uploadedFiles.length !== 1 ? "s" : ""}
                    </Badge>
                  )}
                </div>

                {/* Drag-and-drop zone */}
                <div
                  className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all ${
                    isDraggingDocs
                      ? "border-slate-500 bg-slate-100 scale-[1.01]"
                      : "border-slate-300 hover:border-amber-400 hover:bg-slate-50"
                  }`}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setIsDraggingDocs(true); }}
                  onDragLeave={() => setIsDraggingDocs(false)}
                  onDrop={handleDocsDrop}
                >
                  <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-sm text-slate-600 font-medium">
                    {isDraggingDocs ? "Drop files here" : "Click or drag & drop files here"}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">PDF, JPG, PNG, WebP — Max 50MB per file</p>
                  {isUploading && (
                    <p className="text-xs text-slate-500 mt-2 font-medium animate-pulse">Uploading...</p>
                  )}
                </div>
                <input ref={fileInputRef} type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.gif,.webp" className="hidden" onChange={handleDocsChange} />

                {/* Uploaded supporting docs list */}
                {uploadedFiles.length > 0 && (
                  <div className="space-y-2">
                    {uploadedFiles.map((file, idx) => (
                      <FileCard
                        key={idx}
                        file={file}
                        onRemove={() => setUploadedFiles(prev => prev.filter((_, i) => i !== idx))}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Submit */}
              <div className="flex gap-3 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setLocation("/cro-portal/inquiries")} className="flex-1">
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-amber-600 hover:bg-amber-700"
                  disabled={submitMutation.isPending || isUploading}
                >
                  {submitMutation.isPending ? "Submitting..." : isUploading ? "Uploading files..." : "Submit Intake Inquiry"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </CROLayout>
  );
}
