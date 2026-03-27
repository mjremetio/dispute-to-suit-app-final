import CROLayout from "@/components/CROLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { FilePlus, Upload, X, FileText, User, AlertCircle, Image as ImageIcon } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useState, useRef } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

export default function CROIntakeForm() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const [uploadedFiles, setUploadedFiles] = useState<{ name: string; url: string; size: number; type: string; preview?: string }[]>([]);
  const [proofOfUpload, setProofOfUpload] = useState<{ name: string; url: string; size: number; type: string; preview?: string } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const proofInputRef = useRef<HTMLInputElement>(null);

  const { data: clients, isLoading: loadingClients } = trpc.cro.myClients.useQuery();

  // Determine if an existing client is selected (not "new" and not empty)
  const isExistingClient = selectedClientId !== "" && selectedClientId !== "new";

  const updateFormField = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleClientSelect = (clientId: string) => {
    setSelectedClientId(clientId);
    if (clientId === "new") {
      // Clear form for new client
      setFormData({
        clientFirstName: "",
        clientLastName: "",
        clientDateOfBirth: "",
        clientEmail: "",
        clientAddress: "",
        clientCity: "",
        clientState: "",
        clientZipCode: "",
      });
    } else {
      // Auto-populate from selected client
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
    const formData = new FormData();
    formData.append("file", file);
    const response = await fetch("/api/upload-intake-file", { method: "POST", body: formData });
    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: "Upload failed" }));
      throw new Error(err.error || "Upload failed");
    }
    return response.json();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const newFiles: { name: string; url: string; size: number; type: string; preview?: string }[] = [];

    for (const file of Array.from(files)) {
      try {
        const { fileUrl } = await uploadFileToS3(file);
        let preview: string | undefined;
        if (file.type.startsWith('image/')) {
          preview = URL.createObjectURL(file);
        }
        newFiles.push({
          name: file.name,
          url: fileUrl,
          size: file.size,
          type: file.type,
          preview
        });
      } catch (err: any) {
        toast.error(`Failed to upload ${file.name}: ${err.message}`);
      }
    }

    setUploadedFiles((prev) => [...prev, ...newFiles]);
    setIsUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleProofUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);

    try {
      const { fileUrl } = await uploadFileToS3(file);
      let preview: string | undefined;
      if (file.type.startsWith('image/')) {
        preview = URL.createObjectURL(file);
      }
      setProofOfUpload({
        name: file.name,
        url: fileUrl,
        size: file.size,
        type: file.type,
        preview
      });
    } catch (err: any) {
      toast.error(`Failed to upload proof: ${err.message}`);
    }

    setIsUploading(false);
    if (proofInputRef.current) proofInputRef.current.value = "";
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const removeFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.clientFirstName || !formData.clientLastName || !formData.clientEmail || 
        !formData.clientAddress || !formData.clientCity || !formData.clientState || !formData.clientZipCode) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (!proofOfUpload) {
      toast.error("Please upload proof of AnnualCreditReport.com upload");
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
      supportingDocuments: uploadedFiles.length > 0 ? uploadedFiles.map((f) => f.url) : undefined,
      annualCreditReportScreenshot: proofOfUpload?.url,
    });
  };

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
                  <Input
                    id="clientFirstName"
                    placeholder="John"
                    value={formData.clientFirstName}
                    onChange={(e) => updateFormField('clientFirstName', e.target.value)}
                    className={isExistingClient ? "bg-slate-50 border-slate-300" : "border-slate-300"}
                    disabled={isExistingClient}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="clientLastName" className="text-sm font-semibold">Client Last Name *</Label>
                  <Input
                    id="clientLastName"
                    placeholder="Doe"
                    value={formData.clientLastName}
                    onChange={(e) => updateFormField('clientLastName', e.target.value)}
                    className={isExistingClient ? "bg-slate-50 border-slate-300" : "border-slate-300"}
                    disabled={isExistingClient}
                    required
                  />
                </div>
              </div>

              {/* Client DOB */}
              <div className="space-y-2">
                <Label htmlFor="clientDateOfBirth" className="text-sm font-semibold">Client Date of Birth *</Label>
                <Input
                  id="clientDateOfBirth"
                  type="date"
                  value={formData.clientDateOfBirth}
                  onChange={(e) => updateFormField('clientDateOfBirth', e.target.value)}
                  className={isExistingClient ? "bg-slate-50 border-slate-300" : "border-slate-300"}
                  disabled={isExistingClient}
                  required
                />
              </div>

              {/* Client Email */}
              <div className="space-y-2">
                <Label htmlFor="clientEmail" className="text-sm font-semibold">Client Email *</Label>
                <Input
                  id="clientEmail"
                  type="email"
                  placeholder="client@example.com"
                  value={formData.clientEmail}
                  onChange={(e) => updateFormField('clientEmail', e.target.value)}
                  className={isExistingClient ? "bg-slate-50 border-slate-300" : "border-slate-300"}
                  disabled={isExistingClient}
                  required
                />
              </div>

              {/* Client Address */}
              <div className="space-y-2">
                <Label htmlFor="clientAddress" className="text-sm font-semibold">Street Address *</Label>
                <Input
                  id="clientAddress"
                  placeholder="123 Main St, Apt 4B"
                  value={formData.clientAddress}
                  onChange={(e) => updateFormField('clientAddress', e.target.value)}
                  className={isExistingClient ? "bg-slate-50 border-slate-300" : "border-slate-300"}
                  disabled={isExistingClient}
                  required
                />
              </div>

              {/* City, State, Zip */}
              <div className="grid grid-cols-1 sm:grid-cols-6 gap-4">
                <div className="sm:col-span-3 space-y-2">
                  <Label htmlFor="clientCity" className="text-sm font-semibold">City *</Label>
                  <Input
                    id="clientCity"
                    placeholder="Los Angeles"
                    value={formData.clientCity}
                    onChange={(e) => updateFormField('clientCity', e.target.value)}
                    className={isExistingClient ? "bg-slate-50 border-slate-300" : "border-slate-300"}
                    disabled={isExistingClient}
                    required
                  />
                </div>
                <div className="sm:col-span-2 space-y-2">
                  <Label htmlFor="clientState" className="text-sm font-semibold">State *</Label>
                  <Input
                    id="clientState"
                    placeholder="CA"
                    value={formData.clientState}
                    onChange={(e) => updateFormField('clientState', e.target.value)}
                    className={isExistingClient ? "bg-slate-50 border-slate-300" : "border-slate-300"}
                    disabled={isExistingClient}
                    required
                  />
                </div>
                <div className="sm:col-span-1 space-y-2">
                  <Label htmlFor="clientZipCode" className="text-sm font-semibold">ZIP *</Label>
                  <Input
                    id="clientZipCode"
                    placeholder="90001"
                    value={formData.clientZipCode}
                    onChange={(e) => updateFormField('clientZipCode', e.target.value)}
                    className={isExistingClient ? "bg-slate-50 border-slate-300" : "border-slate-300"}
                    disabled={isExistingClient}
                    required
                  />
                </div>
              </div>

              {/* AnnualCreditReport.com Proof of Upload - REQUIRED */}
              <div className="space-y-4">
                <Label className="text-sm font-semibold">AnnualCreditReport.com Proof of Upload *</Label>
                <p className="text-xs text-slate-500">Upload a screenshot or PDF showing you uploaded documents to annualcreditreport.com</p>
                <div
                  className="border-2 border-dashed border-amber-300 bg-amber-50 rounded-lg p-6 text-center cursor-pointer hover:border-amber-400 transition-colors"
                  onClick={() => proofInputRef.current?.click()}
                >
                  <Upload className="w-8 h-8 text-amber-600 mx-auto mb-2" />
                  <p className="text-sm text-slate-700 font-medium">Click to upload proof (Required)</p>
                  <p className="text-xs text-slate-500 mt-1">PDF or Screenshot (Max 10MB)</p>
                </div>
                <input
                  ref={proofInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.gif,.webp"
                  className="hidden"
                  onChange={handleProofUpload}
                />

                {proofOfUpload && (
                  <div className="border border-amber-200 bg-amber-50 rounded-lg p-4">
                    <div className="flex items-start gap-4">
                      {proofOfUpload.preview && proofOfUpload.type.startsWith('image/') ? (
                        <img src={proofOfUpload.preview} alt="Preview" className="w-20 h-20 object-cover rounded border" />
                      ) : (
                        <div className="w-20 h-20 bg-slate-100 rounded border flex items-center justify-center">
                          <FileText className="w-8 h-8 text-slate-400" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">{proofOfUpload.name}</p>
                        <p className="text-xs text-slate-500 mt-1">{formatFileSize(proofOfUpload.size)}</p>
                      </div>
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50" 
                        onClick={() => setProofOfUpload(null)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Supporting Documents */}
              <div className="space-y-4">
                <Label className="text-sm font-semibold">Additional Supporting Documents</Label>
                <p className="text-xs text-slate-500">Upload any additional documents (credit reports, dispute letters, etc.)</p>
                <div
                  className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center cursor-pointer hover:border-amber-400 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-sm text-slate-600">Click to upload files (PDFs, images)</p>
                  <p className="text-xs text-slate-400 mt-1">Max 50MB per file</p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png,.gif,.webp"
                  className="hidden"
                  onChange={handleFileChange}
                />

                {uploadedFiles.length > 0 && (
                  <div className="space-y-3">
                    {uploadedFiles.map((file, idx) => (
                      <div key={idx} className="border border-slate-200 bg-slate-50 rounded-lg p-4">
                        <div className="flex items-start gap-4">
                          {file.preview && file.type.startsWith('image/') ? (
                            <img src={file.preview} alt="Preview" className="w-20 h-20 object-cover rounded border" />
                          ) : (
                            <div className="w-20 h-20 bg-white rounded border flex items-center justify-center">
                              <FileText className="w-8 h-8 text-slate-400" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-900 truncate">{file.name}</p>
                            <p className="text-xs text-slate-500 mt-1">{formatFileSize(file.size)}</p>
                            <p className="text-xs text-slate-400 mt-1">{file.type}</p>
                          </div>
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50" 
                            onClick={() => removeFile(idx)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
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
                  {submitMutation.isPending ? "Submitting..." : "Submit Intake Inquiry"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </CROLayout>
  );
}
