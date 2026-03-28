import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useState } from "react";
import { Plus, Copy, Key, Shield, ShieldOff, Trash2, Clock, CheckCircle, XCircle, Eye, EyeOff } from "lucide-react";
import { format } from "date-fns";

export default function ApiKeys() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newKeyResult, setNewKeyResult] = useState<{ key: string; name: string } | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<{ id: number; name: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    partnerId: 1,
    expiresInDays: 0,
  });

  const { data: keys, refetch } = trpc.apiKeys.list.useQuery();

  const createKey = trpc.apiKeys.create.useMutation({
    onSuccess: (data) => {
      toast.success("API key created successfully");
      setIsCreateOpen(false);
      setNewKeyResult({ key: data.key, name: data.name });
      setFormData({ name: "", partnerId: 1, expiresInDays: 0 });
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create API key");
    },
  });

  const revokeKey = trpc.apiKeys.revoke.useMutation({
    onSuccess: () => {
      toast.success("API key revoked");
      setRevokeTarget(null);
      refetch();
    },
    onError: (error) => toast.error(error.message || "Failed to revoke API key"),
  });

  const activateKey = trpc.apiKeys.activate.useMutation({
    onSuccess: () => {
      toast.success("API key reactivated");
      refetch();
    },
    onError: (error) => toast.error(error.message || "Failed to activate API key"),
  });

  const deleteKey = trpc.apiKeys.delete.useMutation({
    onSuccess: () => {
      toast.success("API key permanently deleted");
      setDeleteTarget(null);
      refetch();
    },
    onError: (error) => toast.error(error.message || "Failed to delete API key"),
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error("Please enter a name for the API key");
      return;
    }
    createKey.mutate({
      name: formData.name.trim(),
      partnerId: formData.partnerId,
      permissions: ["dashboard:read", "clients:read", "cases:read", "documents:read"],
      expiresAt: formData.expiresInDays > 0
        ? new Date(Date.now() + formData.expiresInDays * 86400000).toISOString()
        : undefined,
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const activeKeys = keys?.filter(k => k.isActive && (!k.expiresAt || new Date(k.expiresAt) > new Date())) || [];
  const inactiveKeys = keys?.filter(k => !k.isActive || (k.expiresAt && new Date(k.expiresAt) <= new Date())) || [];

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-slate-200 pb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-serif font-bold text-slate-900 tracking-tight">API Keys</h1>
            <p className="text-slate-600 mt-2 text-lg">Manage API keys for external credit repair software integration</p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="bg-amber-600 hover:bg-amber-700 text-white h-12 px-6">
                <Plus className="w-5 h-5 mr-2" />
                Generate API Key
              </Button>
            </DialogTrigger>
            <DialogContent className="border-slate-200">
              <DialogHeader>
                <DialogTitle className="text-2xl font-serif text-slate-900">Generate New API Key</DialogTitle>
                <DialogDescription className="text-base text-slate-600">
                  Create a secure API key for external software to access dashboard data
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateSubmit} className="space-y-5 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
                    Key Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="name"
                    placeholder="e.g., Credit Repair CRM Production"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="border-slate-300"
                  />
                  <p className="text-sm text-slate-500">A descriptive name to identify this API key</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="partnerId" className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Partner ID</Label>
                  <Input
                    id="partnerId"
                    type="number"
                    min="1"
                    value={formData.partnerId}
                    onChange={(e) => setFormData({ ...formData, partnerId: parseInt(e.target.value) || 1 })}
                    className="border-slate-300"
                  />
                  <p className="text-sm text-slate-500">The partner organization this key grants access to</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="expiresInDays" className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Expiration (Days)</Label>
                  <Input
                    id="expiresInDays"
                    type="number"
                    min="0"
                    value={formData.expiresInDays}
                    onChange={(e) => setFormData({ ...formData, expiresInDays: parseInt(e.target.value) || 0 })}
                    className="border-slate-300"
                  />
                  <p className="text-sm text-slate-500">Set to 0 for no expiration</p>
                </div>

                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Permissions granted:</strong> Read access to dashboard stats, clients, cases, documents, timeline, and comments — all scoped to the selected partner.
                  </p>
                </div>

                <DialogFooter className="pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)} className="border-slate-300">
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createKey.isPending} className="bg-amber-600 hover:bg-amber-700 text-white">
                    {createKey.isPending ? "Generating..." : "Generate Key"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* New Key Result Dialog */}
        <Dialog open={!!newKeyResult} onOpenChange={() => { setNewKeyResult(null); setShowKey(false); }}>
          <DialogContent className="border-slate-200">
            <DialogHeader>
              <DialogTitle className="text-2xl font-serif text-slate-900">API Key Created</DialogTitle>
              <DialogDescription className="text-base text-slate-600">
                Copy this key now. It will <strong>never be shown again</strong>.
              </DialogDescription>
            </DialogHeader>
            {newKeyResult && (
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Key Name</Label>
                  <p className="text-slate-900 font-medium">{newKeyResult.name}</p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-semibold text-slate-700 uppercase tracking-wide">API Key</Label>
                    <Button size="sm" variant="ghost" onClick={() => setShowKey(!showKey)}>
                      {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg font-mono text-sm break-all">
                    {showKey ? newKeyResult.key : newKeyResult.key.slice(0, 12) + "•".repeat(32)}
                  </div>
                </div>
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm text-amber-800">
                    <strong>Important:</strong> Store this API key securely. Use it as a Bearer token in the <code className="bg-amber-100 px-1 rounded">Authorization</code> header when calling the API.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Example Usage</Label>
                  <div className="p-3 bg-slate-900 rounded-lg text-sm font-mono text-green-400 whitespace-pre-wrap break-all">
{`curl -H "Authorization: Bearer ${showKey ? newKeyResult.key : '<your-api-key>'}" \\
  ${window.location.origin}/api/v1/dashboard/stats`}
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => copyToClipboard(newKeyResult?.key || "")} className="border-slate-300">
                <Copy className="w-4 h-4 mr-2" />
                Copy Key
              </Button>
              <Button onClick={() => { setNewKeyResult(null); setShowKey(false); }} className="bg-amber-600 hover:bg-amber-700 text-white">
                Done
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* API Documentation Card */}
        <Card className="border-blue-200 bg-blue-50/50">
          <CardHeader>
            <CardTitle className="text-lg font-serif text-slate-900 flex items-center gap-2">
              <Key className="w-5 h-5 text-blue-600" />
              REST API Endpoints
            </CardTitle>
            <CardDescription className="text-slate-600">
              Use these endpoints with your API key to integrate with your credit repair software
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div className="p-3 bg-white border border-blue-200 rounded-lg">
                <code className="text-blue-700 font-semibold">GET /api/v1/dashboard/stats</code>
                <p className="text-slate-600 mt-1">Dashboard summary with aggregate metrics</p>
              </div>
              <div className="p-3 bg-white border border-blue-200 rounded-lg">
                <code className="text-blue-700 font-semibold">GET /api/v1/clients</code>
                <p className="text-slate-600 mt-1">List clients (paginated, filterable)</p>
              </div>
              <div className="p-3 bg-white border border-blue-200 rounded-lg">
                <code className="text-blue-700 font-semibold">GET /api/v1/clients/:id</code>
                <p className="text-slate-600 mt-1">Client detail with associated cases</p>
              </div>
              <div className="p-3 bg-white border border-blue-200 rounded-lg">
                <code className="text-blue-700 font-semibold">GET /api/v1/cases</code>
                <p className="text-slate-600 mt-1">List cases (paginated, filterable)</p>
              </div>
              <div className="p-3 bg-white border border-blue-200 rounded-lg">
                <code className="text-blue-700 font-semibold">GET /api/v1/cases/:id</code>
                <p className="text-slate-600 mt-1">Case detail with tasks and documents</p>
              </div>
              <div className="p-3 bg-white border border-blue-200 rounded-lg">
                <code className="text-blue-700 font-semibold">GET /api/v1/cases/:id/timeline</code>
                <p className="text-slate-600 mt-1">Activity timeline for a case</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Active Keys */}
        <Card className="border-slate-200">
          <CardHeader className="border-b border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl font-serif text-slate-900">Active API Keys</CardTitle>
                <CardDescription className="text-base text-slate-600 mt-1">
                  {activeKeys.length} active key{activeKeys.length !== 1 ? "s" : ""}
                </CardDescription>
              </div>
              <CheckCircle className="w-8 h-8 text-emerald-500" />
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {activeKeys.length > 0 ? (
              <div className="space-y-4">
                {activeKeys.map((apiKey) => (
                  <div
                    key={apiKey.id}
                    className="flex flex-col sm:flex-row items-start justify-between p-5 border border-slate-200 rounded-lg hover:border-amber-400 hover:shadow-md transition-all duration-300 gap-4"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <Shield className="w-5 h-5 text-emerald-500" />
                        <span className="font-semibold text-slate-900 text-lg">{apiKey.name}</span>
                        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Active</Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600 mb-2">
                        <span className="font-mono bg-slate-100 px-2 py-1 rounded text-xs">{apiKey.keyPrefix}••••••••</span>
                        <span>Partner ID: {apiKey.partnerId}</span>
                        {apiKey.expiresAt && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Expires {format(new Date(apiKey.expiresAt), "MMM d, yyyy")}
                          </span>
                        )}
                        {!apiKey.expiresAt && (
                          <span className="text-slate-400">No expiration</span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
                        <span>Created {format(new Date(apiKey.createdAt), "MMM d, yyyy")}</span>
                        {apiKey.lastUsedAt && (
                          <span>Last used {format(new Date(apiKey.lastUsedAt), "MMM d, yyyy 'at' h:mm a")}</span>
                        )}
                        {!apiKey.lastUsedAt && (
                          <span className="text-slate-400">Never used</span>
                        )}
                      </div>
                      {apiKey.permissions && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {(apiKey.permissions as string[]).map((perm) => (
                            <Badge key={perm} variant="outline" className="text-xs border-slate-300">{perm}</Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setRevokeTarget({ id: apiKey.id, name: apiKey.name })}
                        className="border-red-300 text-red-700 hover:bg-red-50"
                      >
                        <ShieldOff className="w-4 h-4 mr-1" />
                        Revoke
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16">
                <Key className="w-16 h-16 text-slate-300 mb-4" />
                <p className="text-lg font-serif text-slate-600">No active API keys</p>
                <p className="text-slate-500 mt-2">Generate an API key to start integrating</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Inactive / Revoked Keys */}
        {inactiveKeys.length > 0 && (
          <Card className="border-slate-200">
            <CardHeader className="border-b border-slate-100">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl font-serif text-slate-900">Revoked / Expired Keys</CardTitle>
                  <CardDescription className="text-base text-slate-600 mt-1">
                    {inactiveKeys.length} inactive key{inactiveKeys.length !== 1 ? "s" : ""}
                  </CardDescription>
                </div>
                <XCircle className="w-8 h-8 text-slate-400" />
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {inactiveKeys.map((apiKey) => (
                  <div
                    key={apiKey.id}
                    className="flex flex-col sm:flex-row items-start justify-between p-5 border border-slate-200 rounded-lg opacity-60 gap-4"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <ShieldOff className="w-5 h-5 text-slate-400" />
                        <span className="font-semibold text-slate-700">{apiKey.name}</span>
                        {!apiKey.isActive && (
                          <Badge className="bg-red-100 text-red-700 border-red-200">Revoked</Badge>
                        )}
                        {apiKey.isActive && apiKey.expiresAt && new Date(apiKey.expiresAt) <= new Date() && (
                          <Badge className="bg-amber-100 text-amber-700 border-amber-200">Expired</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-slate-500">
                        <span className="font-mono bg-slate-100 px-2 py-1 rounded text-xs">{apiKey.keyPrefix}••••••••</span>
                        <span>Partner ID: {apiKey.partnerId}</span>
                        <span>Created {format(new Date(apiKey.createdAt), "MMM d, yyyy")}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {!apiKey.isActive && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => activateKey.mutate({ id: apiKey.id })}
                          disabled={activateKey.isPending}
                          className="border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                        >
                          <Shield className="w-4 h-4 mr-1" />
                          Reactivate
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setDeleteTarget({ id: apiKey.id, name: apiKey.name })}
                        className="border-red-300 text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Revoke Confirmation */}
        <AlertDialog open={!!revokeTarget} onOpenChange={() => setRevokeTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Revoke API Key</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to revoke <strong>"{revokeTarget?.name}"</strong>? Any external software using this key will immediately lose access. You can reactivate it later.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setRevokeTarget(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => revokeTarget && revokeKey.mutate({ id: revokeTarget.id })}
                className="bg-red-600 hover:bg-red-700"
                disabled={revokeKey.isPending}
              >
                {revokeKey.isPending ? "Revoking..." : "Revoke Key"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delete Confirmation */}
        <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete API Key</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to permanently delete <strong>"{deleteTarget?.name}"</strong>? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setDeleteTarget(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteTarget && deleteKey.mutate({ id: deleteTarget.id })}
                className="bg-red-600 hover:bg-red-700"
                disabled={deleteKey.isPending}
              >
                {deleteKey.isPending ? "Deleting..." : "Permanently Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
