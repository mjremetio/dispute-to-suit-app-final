import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ResponsivePagination } from "@/components/ResponsivePagination";
import { trpc } from "@/lib/trpc";
import {
  Plus, Search, Users, Pencil, Trash2, KeyRound,
  ArrowUpDown, ArrowUp, ArrowDown, MoreHorizontal,
  UserCheck, UserX, Eye, AtSign, X, Send,
} from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";

type SortField = "name" | "email" | "phone" | "stage" | "city" | "cro" | "createdAt" | "portal";
type SortDirection = "asc" | "desc";

const ITEMS_PER_PAGE = 15;

const emptyForm = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  address: "",
  city: "",
  state: "",
  zipCode: "",
  stage: "lead" as string,
  notes: "",
  assignedCroId: "" as string,
  username: "",
  password: "",
};

type FormData = typeof emptyForm;

function ClientForm({
  formData,
  updateFormField,
  onSubmit,
  onCancel,
  submitLabel,
  isPending,
  showAccountFields,
  croUsers,
}: {
  formData: FormData;
  updateFormField: (field: keyof FormData, value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  submitLabel: string;
  isPending: boolean;
  showAccountFields: boolean;
  croUsers: { id: number; name: string | null; email: string | null; role: string }[];
}) {
  const croList = croUsers.filter((u) => u.role === "cro");
  return (
    <form onSubmit={onSubmit} className="space-y-6 py-4">
      <div className="space-y-4">
        <h3 className="text-lg font-serif font-semibold border-b border-slate-200 pb-2">Personal Information</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="firstName" className="text-sm font-semibold">First Name *</Label>
            <Input id="firstName" placeholder="John" value={formData.firstName} onChange={(e) => updateFormField("firstName", e.target.value)} className="border-slate-300" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName" className="text-sm font-semibold">Last Name *</Label>
            <Input id="lastName" placeholder="Doe" value={formData.lastName} onChange={(e) => updateFormField("lastName", e.target.value)} className="border-slate-300" required />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-serif font-semibold border-b border-slate-200 pb-2">Contact Information</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-semibold">Email</Label>
            <Input id="email" type="email" placeholder="john@example.com" value={formData.email} onChange={(e) => updateFormField("email", e.target.value)} className="border-slate-300" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone" className="text-sm font-semibold">Phone</Label>
            <Input id="phone" type="tel" placeholder="+1 (555) 123-4567" value={formData.phone} onChange={(e) => updateFormField("phone", e.target.value)} className="border-slate-300" />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-serif font-semibold border-b border-slate-200 pb-2">Address</h3>
        <Input placeholder="Street Address" value={formData.address} onChange={(e) => updateFormField("address", e.target.value)} className="border-slate-300" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input placeholder="City" value={formData.city} onChange={(e) => updateFormField("city", e.target.value)} className="border-slate-300" />
          <Input placeholder="State" value={formData.state} onChange={(e) => updateFormField("state", e.target.value)} className="border-slate-300" />
          <Input placeholder="ZIP Code" value={formData.zipCode} onChange={(e) => updateFormField("zipCode", e.target.value)} className="border-slate-300" />
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-serif font-semibold border-b border-slate-200 pb-2">Client Details</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Stage</Label>
            <Select value={formData.stage} onValueChange={(value) => updateFormField("stage", value)}>
              <SelectTrigger className="border-slate-300"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="lead">Lead</SelectItem>
                <SelectItem value="prospect">Prospect</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Assigned CRO</Label>
            <Select value={formData.assignedCroId} onValueChange={(value) => updateFormField("assignedCroId", value)}>
              <SelectTrigger className="border-slate-300"><SelectValue placeholder="Select CRO..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No CRO</SelectItem>
                {croList.map((u) => (
                  <SelectItem key={u.id} value={String(u.id)}>{u.name || u.email} (CRO)</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="notes" className="text-sm font-semibold">Notes</Label>
          <Textarea id="notes" placeholder="Additional notes..." value={formData.notes} onChange={(e) => updateFormField("notes", e.target.value)} rows={3} className="border-slate-300" />
        </div>
      </div>

      {showAccountFields && (
        <div className="space-y-4">
          <h3 className="text-lg font-serif font-semibold border-b border-slate-200 pb-2">Portal Account</h3>
          <p className="text-sm text-slate-500">Create portal login credentials for this client.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-sm font-semibold">Username (Email)</Label>
              <Input id="username" type="email" placeholder="client@example.com" value={formData.username} onChange={(e) => updateFormField("username", e.target.value)} className="border-slate-300" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-semibold">Password</Label>
              <Input id="password" type="password" placeholder="Minimum 6 characters" value={formData.password} onChange={(e) => updateFormField("password", e.target.value)} className="border-slate-300" minLength={6} />
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1">Cancel</Button>
        <Button type="submit" className="flex-1 bg-amber-600 hover:bg-amber-700" disabled={isPending}>
          {isPending ? "Saving..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}

export default function Clients() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isResetPasswordOpen, setIsResetPasswordOpen] = useState(false);
  const [resetPasswordClientId, setResetPasswordClientId] = useState<number | null>(null);
  const [resetPasswordClientName, setResetPasswordClientName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [croFilter, setCroFilter] = useState<string>("all");
  const [formData, setFormData] = useState(emptyForm);
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [currentPage, setCurrentPage] = useState(1);

  // Username editing
  const [isEditUsernameOpen, setIsEditUsernameOpen] = useState(false);
  const [editUsernameClientId, setEditUsernameClientId] = useState<number | null>(null);
  const [editUsernameClientName, setEditUsernameClientName] = useState("");
  const [newUsername, setNewUsername] = useState("");

  const utils = trpc.useUtils();
  const { data: clients, isLoading } = trpc.clients.list.useQuery();
  const { data: croUsers } = trpc.clients.croUsers.useQuery();
  const { data: croList } = trpc.clients.listCrosWithClientCounts.useQuery();

  const createMutation = trpc.clients.create.useMutation({
    onSuccess: () => {
      toast.success("Client created successfully");
      setIsCreateOpen(false);
      setFormData(emptyForm);
      utils.clients.list.invalidate();
      utils.clients.listCrosWithClientCounts.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const updateMutation = trpc.clients.update.useMutation({
    onSuccess: () => {
      toast.success("Client updated successfully");
      setIsEditOpen(false);
      setEditingId(null);
      setFormData(emptyForm);
      utils.clients.list.invalidate();
      utils.clients.listCrosWithClientCounts.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = trpc.clients.delete.useMutation({
    onSuccess: () => {
      toast.success("Client deleted successfully");
      utils.clients.list.invalidate();
      utils.clients.listCrosWithClientCounts.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const resetPasswordMutation = trpc.clients.resetPassword.useMutation({
    onSuccess: () => {
      toast.success("Password reset successfully");
      setIsResetPasswordOpen(false);
      setResetPasswordClientId(null);
      setNewPassword("");
    },
    onError: (err) => toast.error(err.message),
  });

  const resendCredentialsMutation = trpc.clients.resendCredentials.useMutation({
    onSuccess: () => {
      toast.success("Credentials email resent successfully");
    },
    onError: (err) => toast.error(err.message),
  });

  const updateUsernameMutation = trpc.clients.updatePortalUsername.useMutation({
    onSuccess: () => {
      toast.success("Username updated successfully");
      setIsEditUsernameOpen(false);
      setEditUsernameClientId(null);
      setNewUsername("");
      utils.clients.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const updateFormField = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email || undefined,
      phone: formData.phone || undefined,
      address: formData.address || undefined,
      city: formData.city || undefined,
      state: formData.state || undefined,
      zipCode: formData.zipCode || undefined,
      stage: formData.stage as any,
      notes: formData.notes || undefined,
      assignedCroId: formData.assignedCroId && formData.assignedCroId !== "none" ? Number(formData.assignedCroId) : undefined,
      username: formData.username || undefined,
      password: formData.password || undefined,
    });
  };

  const handleEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    updateMutation.mutate({
      id: editingId,
      firstName: formData.firstName || undefined,
      lastName: formData.lastName || undefined,
      email: formData.email || undefined,
      phone: formData.phone || undefined,
      address: formData.address || undefined,
      city: formData.city || undefined,
      state: formData.state || undefined,
      zipCode: formData.zipCode || undefined,
      stage: formData.stage as any,
      notes: formData.notes || undefined,
      assignedCroId: formData.assignedCroId && formData.assignedCroId !== "none" ? Number(formData.assignedCroId) : undefined,
    });
  };

  const openEdit = (client: any) => {
    setEditingId(client.id);
    setFormData({
      firstName: client.firstName || "",
      lastName: client.lastName || "",
      email: client.email || "",
      phone: client.phone || "",
      address: client.address || "",
      city: client.city || "",
      state: client.state || "",
      zipCode: client.zipCode || "",
      stage: client.stage || "lead",
      notes: client.notes || "",
      assignedCroId: client.createdBy ? String(client.createdBy) : "",
      username: "",
      password: "",
    });
    setIsEditOpen(true);
  };

  const handleCancel = () => {
    setIsCreateOpen(false);
    setIsEditOpen(false);
    setFormData(emptyForm);
  };

  const handleDelete = (client: any) => {
    if (confirm(`Are you sure you want to delete ${client.firstName} ${client.lastName}? This action cannot be undone.`)) {
      deleteMutation.mutate({ id: client.id });
    }
  };

  const openResetPassword = (client: any) => {
    setResetPasswordClientId(client.id);
    setResetPasswordClientName(`${client.firstName} ${client.lastName}`);
    setNewPassword("");
    setIsResetPasswordOpen(true);
  };

  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPasswordClientId) return;
    resetPasswordMutation.mutate({
      clientId: resetPasswordClientId,
      newPassword,
    });
  };

  const openEditUsername = (client: any) => {
    setEditUsernameClientId(client.id);
    setEditUsernameClientName(`${client.firstName} ${client.lastName}`);
    setNewUsername(client.portalUserEmail || "");
    setIsEditUsernameOpen(true);
  };

  const handleEditUsername = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUsernameClientId) return;
    updateUsernameMutation.mutate({
      clientId: editUsernameClientId,
      newUsername,
    });
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
    setCurrentPage(1);
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="w-4 h-4 ml-1 opacity-50" />;
    return sortDirection === "asc" ? <ArrowUp className="w-4 h-4 ml-1" /> : <ArrowDown className="w-4 h-4 ml-1" />;
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  const filteredAndSortedClients = useMemo(() => {
    if (!clients) return [];

    let filtered = clients.filter((c: any) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        c.firstName?.toLowerCase().includes(q) ||
        c.lastName?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.croName?.toLowerCase().includes(q);
      const matchesStage = stageFilter === "all" || c.stage === stageFilter;
      const matchesCro = croFilter === "all" || String(c.createdBy) === croFilter;
      return matchesSearch && matchesStage && matchesCro;
    });

    filtered.sort((a: any, b: any) => {
      let comparison = 0;
      switch (sortField) {
        case "name":
          comparison = `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
          break;
        case "email":
          comparison = (a.email || "").localeCompare(b.email || "");
          break;
        case "phone":
          comparison = (a.phone || "").localeCompare(b.phone || "");
          break;
        case "stage":
          comparison = (a.stage || "").localeCompare(b.stage || "");
          break;
        case "city":
          comparison = (a.city || "").localeCompare(b.city || "");
          break;
        case "cro":
          comparison = (a.croName || "").localeCompare(b.croName || "");
          break;
        case "portal":
          comparison = (a.portalAccess ? 1 : 0) - (b.portalAccess ? 1 : 0);
          break;
        case "createdAt":
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
      }
      return sortDirection === "asc" ? comparison : -comparison;
    });

    return filtered;
  }, [clients, searchQuery, stageFilter, croFilter, sortField, sortDirection]);

  const totalPages = Math.ceil(filteredAndSortedClients.length / ITEMS_PER_PAGE);
  const paginatedClients = filteredAndSortedClients.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  const getStageVariant = (stage: string) => {
    switch (stage) {
      case "active": return "default";
      case "completed": return "secondary";
      case "prospect": return "outline";
      default: return "outline";
    }
  };

  const activeCroFilter = croList?.find((c) => String(c.id) === croFilter);

  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-6 md:space-y-8">
        <div className="border-b border-slate-200 pb-4 sm:pb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-serif font-bold text-slate-900 tracking-tight">Client Management</h1>
              <p className="text-slate-600 mt-1 sm:mt-2 text-sm sm:text-lg">Comprehensive client relationship oversight and contact management</p>
            </div>
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button size="default" className="bg-amber-600 hover:bg-amber-700 text-white shadow-md sm:size-lg">
                  <Plus className="w-5 h-5 mr-2" /> New Client
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-3xl max-h-[calc(100vh-2rem)] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-serif">Add New Client</DialogTitle>
                  <DialogDescription>Create a client profile and optionally assign to a CRO</DialogDescription>
                </DialogHeader>
                <ClientForm
                  formData={formData}
                  updateFormField={updateFormField}
                  onSubmit={handleCreate}
                  onCancel={handleCancel}
                  submitLabel="Create Client"
                  isPending={createMutation.isPending}
                  showAccountFields={true}
                  croUsers={croUsers || []}
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* CRO Overview - View Clients per CRO */}
        {croList && croList.length > 0 && (
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-serif">CRO Partners</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                {croList.map((cro) => (
                  <Button
                    key={cro.id}
                    variant={croFilter === String(cro.id) ? "default" : "outline"}
                    size="sm"
                    className={croFilter === String(cro.id) ? "bg-amber-600 hover:bg-amber-700" : ""}
                    onClick={() => {
                      setCroFilter(croFilter === String(cro.id) ? "all" : String(cro.id));
                      setCurrentPage(1);
                    }}
                  >
                    <Eye className="w-4 h-4 mr-1.5" />
                    {cro.name || cro.email}
                    <Badge variant="secondary" className="ml-2 text-xs">{cro.clientCount}</Badge>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Active CRO filter indicator */}
        {activeCroFilter && (
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <span>Showing clients for CRO:</span>
            <Badge variant="default" className="bg-amber-600">{activeCroFilter.name || activeCroFilter.email}</Badge>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => { setCroFilter("all"); setCurrentPage(1); }}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* Search and Filters */}
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                <Input placeholder="Search by name, email, or CRO..." value={searchQuery} onChange={(e) => handleSearchChange(e.target.value)} className="pl-10 border-slate-300" />
              </div>
              <div className="w-full sm:w-48">
                <Select value={stageFilter} onValueChange={(v) => { setStageFilter(v); setCurrentPage(1); }}>
                  <SelectTrigger className="border-slate-300"><SelectValue placeholder="Filter by stage" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Stages</SelectItem>
                    <SelectItem value="lead">Lead</SelectItem>
                    <SelectItem value="prospect">Prospect</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-3xl max-h-[calc(100vh-2rem)] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl font-serif">Edit Client</DialogTitle>
              <DialogDescription>Update client information and CRO assignment</DialogDescription>
            </DialogHeader>
            <ClientForm
              formData={formData}
              updateFormField={updateFormField}
              onSubmit={handleEdit}
              onCancel={handleCancel}
              submitLabel="Save Changes"
              isPending={updateMutation.isPending}
              showAccountFields={false}
              croUsers={croUsers || []}
            />
          </DialogContent>
        </Dialog>

        {/* Reset Password Dialog */}
        <Dialog open={isResetPasswordOpen} onOpenChange={setIsResetPasswordOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl font-serif">Reset Portal Password</DialogTitle>
              <DialogDescription>Set a new password for {resetPasswordClientName}</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleResetPassword} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword" className="text-sm font-semibold">New Password</Label>
                <Input id="newPassword" type="password" placeholder="Minimum 6 characters" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="border-slate-300" required minLength={6} />
              </div>
              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setIsResetPasswordOpen(false)} className="flex-1">Cancel</Button>
                <Button type="submit" className="flex-1 bg-amber-600 hover:bg-amber-700" disabled={resetPasswordMutation.isPending}>
                  {resetPasswordMutation.isPending ? "Resetting..." : "Reset Password"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit Username Dialog */}
        <Dialog open={isEditUsernameOpen} onOpenChange={setIsEditUsernameOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl font-serif">Edit Portal Username</DialogTitle>
              <DialogDescription>Change the portal login email for {editUsernameClientName}</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleEditUsername} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="newUsername" className="text-sm font-semibold">New Username (Email)</Label>
                <Input id="newUsername" type="email" placeholder="newemail@example.com" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} className="border-slate-300" required />
              </div>
              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setIsEditUsernameOpen(false)} className="flex-1">Cancel</Button>
                <Button type="submit" className="flex-1 bg-amber-600 hover:bg-amber-700" disabled={updateUsernameMutation.isPending}>
                  {updateUsernameMutation.isPending ? "Updating..." : "Update Username"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Clients Table */}
        {isLoading ? (
          <Card className="border-slate-200">
            <CardContent className="py-16 text-center">
              <p className="text-slate-500">Loading clients...</p>
            </CardContent>
          </Card>
        ) : filteredAndSortedClients.length > 0 ? (
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="w-[50px] pl-4">#</TableHead>
                    <TableHead>
                      <button className="flex items-center font-medium hover:text-amber-600 transition-colors" onClick={() => handleSort("name")}>
                        Name {getSortIcon("name")}
                      </button>
                    </TableHead>
                    <TableHead className="hidden sm:table-cell">
                      <button className="flex items-center font-medium hover:text-amber-600 transition-colors" onClick={() => handleSort("email")}>
                        Email {getSortIcon("email")}
                      </button>
                    </TableHead>
                    <TableHead className="hidden lg:table-cell">
                      <button className="flex items-center font-medium hover:text-amber-600 transition-colors" onClick={() => handleSort("phone")}>
                        Phone {getSortIcon("phone")}
                      </button>
                    </TableHead>
                    <TableHead>
                      <button className="flex items-center font-medium hover:text-amber-600 transition-colors" onClick={() => handleSort("stage")}>
                        Stage {getSortIcon("stage")}
                      </button>
                    </TableHead>
                    <TableHead className="hidden md:table-cell">
                      <button className="flex items-center font-medium hover:text-amber-600 transition-colors" onClick={() => handleSort("cro")}>
                        Assigned CRO {getSortIcon("cro")}
                      </button>
                    </TableHead>
                    <TableHead className="hidden lg:table-cell">
                      <button className="flex items-center font-medium hover:text-amber-600 transition-colors" onClick={() => handleSort("portal")}>
                        Portal {getSortIcon("portal")}
                      </button>
                    </TableHead>
                    <TableHead className="hidden md:table-cell">
                      <button className="flex items-center font-medium hover:text-amber-600 transition-colors" onClick={() => handleSort("createdAt")}>
                        Created {getSortIcon("createdAt")}
                      </button>
                    </TableHead>
                    <TableHead className="w-[60px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedClients.map((client: any) => (
                    <TableRow key={client.id} className="hover:bg-amber-50/50">
                      <TableCell className="pl-4 text-slate-500 text-sm">{client.id}</TableCell>
                      <TableCell className="font-medium text-slate-900">{client.firstName} {client.lastName}</TableCell>
                      <TableCell className="text-slate-600 text-sm hidden sm:table-cell">{client.email || "--"}</TableCell>
                      <TableCell className="text-slate-600 text-sm hidden lg:table-cell">{client.phone || "--"}</TableCell>
                      <TableCell>
                        <Badge variant={getStageVariant(client.stage)} className="font-medium capitalize">{client.stage}</Badge>
                      </TableCell>
                      <TableCell className="text-sm hidden md:table-cell">
                        {client.croName ? (
                          <button
                            className="text-amber-700 hover:text-amber-900 hover:underline font-medium"
                            onClick={() => { setCroFilter(String(client.createdBy)); setCurrentPage(1); }}
                          >
                            {client.croName}
                          </button>
                        ) : (
                          <span className="text-slate-400">Unassigned</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {client.portalAccess ? (
                          <div className="flex items-center gap-1.5">
                            <UserCheck className="w-4 h-4 text-green-600" />
                            <span className="text-xs text-green-700">{client.portalUserEmail || "Active"}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <UserX className="w-4 h-4 text-slate-400" />
                            <span className="text-xs text-slate-400">None</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-slate-600 text-sm hidden md:table-cell">{new Date(client.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEdit(client)}>
                              <Pencil className="w-4 h-4 mr-2" /> Edit
                            </DropdownMenuItem>
                            {client.portalAccess && (
                              <>
                                <DropdownMenuItem onClick={() => openEditUsername(client)}>
                                  <AtSign className="w-4 h-4 mr-2" /> Edit Username
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => openResetPassword(client)}>
                                  <KeyRound className="w-4 h-4 mr-2" /> Reset Password
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    if (confirm(`Resend login credentials to ${client.firstName} ${client.lastName}? This will generate a new temporary password.`)) {
                                      resendCredentialsMutation.mutate({ clientId: client.id });
                                    }
                                  }}
                                >
                                  <Send className="w-4 h-4 mr-2" /> Resend Credentials
                                </DropdownMenuItem>
                              </>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={() => handleDelete(client)}>
                              <Trash2 className="w-4 h-4 mr-2" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
              <div className="px-4 pb-4">
                <ResponsivePagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={filteredAndSortedClients.length}
                  itemsPerPage={ITEMS_PER_PAGE}
                  onPageChange={setCurrentPage}
                  itemLabel="clients"
                />
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-slate-200">
            <CardContent className="py-16 text-center">
              <Users className="w-20 h-20 text-slate-300 mx-auto mb-4" />
              <h3 className="text-2xl font-serif font-semibold text-slate-900 mb-2">No Clients Found</h3>
              <p className="text-slate-600 text-lg mb-6">
                {searchQuery || stageFilter !== "all" || croFilter !== "all" ? "No clients match your search criteria" : "Begin by adding your first client"}
              </p>
              {!searchQuery && stageFilter === "all" && croFilter === "all" && (
                <Button onClick={() => setIsCreateOpen(true)} size="lg" className="bg-amber-600 hover:bg-amber-700">
                  <Plus className="w-5 h-5 mr-2" /> Add First Client
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
