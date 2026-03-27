import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useState } from "react";
import { Plus, Copy, Mail, Calendar, CheckCircle, XCircle, Link as LinkIcon } from "lucide-react";
import { format } from "date-fns";

export default function InviteTokens() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    role: "user" as "user" | "admin" | "cro" | "paralegal",
    maxUses: 1,
    expiresInDays: 7,
  });

  const { data: tokens, refetch } = trpc.invites.list.useQuery();

  const createInvite = trpc.invites.create.useMutation({
    onSuccess: (data) => {
      toast.success("Invite token created successfully");
      setIsCreateOpen(false);
      setFormData({
        email: "",
        role: "user",
        maxUses: 1,
        expiresInDays: 7,
      });
      refetch();
      
      // Copy token to clipboard
      if (data.token) {
        const inviteUrl = `${window.location.origin}/signup?invite=${data.token}`;
        navigator.clipboard.writeText(inviteUrl);
        toast.success("Invite link copied to clipboard");
      }
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create invite token");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + formData.expiresInDays);

    createInvite.mutate({
      email: formData.email || undefined,
      role: formData.role,
      maxUses: formData.maxUses,
      expiresAt,
      origin: window.location.origin,
    });
  };

  const copyInviteLink = (token: string) => {
    const inviteUrl = `${window.location.origin}/signup?invite=${token}`;
    navigator.clipboard.writeText(inviteUrl);
    toast.success("Invite link copied to clipboard");
  };

  const activeTokens = tokens?.filter(t => {
    if (t.expiresAt && new Date(t.expiresAt) < new Date()) return false;
    if ((t.usedCount || 0) >= (t.maxUses || 1)) return false;
    return true;
  });

  const expiredTokens = tokens?.filter(t => {
    if (t.expiresAt && new Date(t.expiresAt) < new Date()) return true;
    if ((t.usedCount || 0) >= (t.maxUses || 1)) return true;
    return false;
  });

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Professional Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-slate-200 pb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-serif font-bold text-slate-900 tracking-tight">Invite Tokens</h1>
            <p className="text-slate-600 mt-2 text-lg">Generate and manage VIP invitation links for exclusive access</p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="bg-amber-600 hover:bg-amber-700 text-white h-12 px-6">
                <Plus className="w-5 h-5 mr-2" />
                Create Invite
              </Button>
            </DialogTrigger>
            <DialogContent className="border-slate-200">
              <DialogHeader>
                <DialogTitle className="text-2xl font-serif text-slate-900">Create Invite Token</DialogTitle>
                <DialogDescription className="text-base text-slate-600">
                  Generate a special invite link for VIP access
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-5 py-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Email (Optional)</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="user@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="border-slate-300"
                  />
                  <p className="text-sm text-slate-500">
                    If provided, an email will be sent automatically
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role" className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Role</Label>
                  <Select
                    value={formData.role}
                    onValueChange={(value: any) => setFormData({ ...formData, role: value })}
                  >
                    <SelectTrigger className="border-slate-300">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="cro">CRO</SelectItem>
                      <SelectItem value="paralegal">Paralegal</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="maxUses" className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Max Uses</Label>
                    <Input
                      id="maxUses"
                      type="number"
                      min="1"
                      value={formData.maxUses}
                      onChange={(e) => setFormData({ ...formData, maxUses: parseInt(e.target.value) || 1 })}
                      className="border-slate-300"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="expiresInDays" className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Expires In (Days)</Label>
                    <Input
                      id="expiresInDays"
                      type="number"
                      min="1"
                      value={formData.expiresInDays}
                      onChange={(e) => setFormData({ ...formData, expiresInDays: parseInt(e.target.value) || 7 })}
                      className="border-slate-300"
                    />
                  </div>
                </div>

                <DialogFooter className="pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCreateOpen(false)}
                    className="border-slate-300"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createInvite.isPending}
                    className="bg-amber-600 hover:bg-amber-700 text-white"
                  >
                    {createInvite.isPending ? "Creating..." : "Create Invite"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Active Tokens */}
        <Card className="border-slate-200">
          <CardHeader className="border-b border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl font-serif text-slate-900">Active Invite Tokens</CardTitle>
                <CardDescription className="text-base text-slate-600 mt-1">
                  {activeTokens?.length || 0} active invitation links
                </CardDescription>
              </div>
              <CheckCircle className="w-8 h-8 text-emerald-500" />
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {activeTokens && activeTokens.length > 0 ? (
              <div className="space-y-4">
                {activeTokens.map((token) => (
                  <div
                    key={token.id}
                    className="flex items-start justify-between p-5 border border-slate-200 rounded-lg hover:border-amber-400 hover:shadow-md transition-all duration-300 group"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-3">
                        <Badge 
                          variant="default"
                          className={
                            token.role === "admin" ? "bg-red-100 text-red-700 border-red-200" :
                            token.role === "cro" ? "bg-blue-100 text-blue-700 border-blue-200" :
                            token.role === "paralegal" ? "bg-emerald-100 text-emerald-700 border-emerald-200" :
                            "bg-slate-100 text-slate-700 border-slate-200"
                          }
                        >
                          {token.role.toUpperCase()}
                        </Badge>
                        {token.email && (
                          <span className="text-sm text-slate-600 flex items-center gap-2">
                            <Mail className="w-4 h-4 text-slate-400" />
                            {token.email}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-6 text-sm text-slate-600 mb-3">
                        <div className="flex items-center gap-2">
                          <LinkIcon className="w-4 h-4 text-slate-400" />
                          <span>Used: <span className="font-semibold">{token.usedCount || 0}</span> / {token.maxUses || 1}</span>
                        </div>
                        {token.expiresAt && (
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-slate-400" />
                            <span>Expires {format(new Date(token.expiresAt), "MMM d, yyyy")}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-slate-400" />
                          <span>Created {format(new Date(token.createdAt), "MMM d, yyyy")}</span>
                        </div>
                      </div>
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono break-all text-slate-700 group-hover:bg-amber-50 group-hover:border-amber-200 transition-colors">
                        {window.location.origin}/signup?invite={token.token}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyInviteLink(token.token)}
                      className="ml-4 border-slate-300 hover:border-amber-400 hover:bg-amber-50"
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      Copy
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16">
                <LinkIcon className="w-16 h-16 text-slate-300 mb-4" />
                <p className="text-lg font-serif text-slate-600">No active invite tokens</p>
                <p className="text-slate-500 mt-2">Create an invite to get started</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Expired Tokens */}
        {expiredTokens && expiredTokens.length > 0 && (
          <Card className="border-slate-200">
            <CardHeader className="border-b border-slate-100">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl font-serif text-slate-900">Expired / Used Tokens</CardTitle>
                  <CardDescription className="text-base text-slate-600 mt-1">
                    {expiredTokens.length} expired or fully used tokens
                  </CardDescription>
                </div>
                <XCircle className="w-8 h-8 text-slate-400" />
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {expiredTokens.map((token) => (
                  <div
                    key={token.id}
                    className="flex items-start justify-between p-5 border border-slate-200 rounded-lg opacity-60"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <Badge variant="outline" className="border-slate-300 text-slate-600">
                          {token.role.toUpperCase()}
                        </Badge>
                        {token.email && (
                          <span className="text-sm text-slate-600 flex items-center gap-2">
                            <Mail className="w-4 h-4 text-slate-400" />
                            {token.email}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-slate-600">
                        <span>
                          Used: {token.usedCount || 0} / {token.maxUses || 1}
                        </span>
                        {token.expiresAt && new Date(token.expiresAt) < new Date() && (
                          <Badge variant="destructive" className="text-xs bg-red-100 text-red-700 border-red-200">Expired</Badge>
                        )}
                        {(token.usedCount || 0) >= (token.maxUses || 1) && (
                          <Badge variant="secondary" className="text-xs bg-slate-100 text-slate-700 border-slate-200">Fully Used</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
