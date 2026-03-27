import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ExternalLink, Pencil, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";

interface ExternalLinksManagerProps {
  caseId: number;
}

export function ExternalLinksManager({ caseId }: ExternalLinksManagerProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<{ id: number; label: string; url: string } | null>(null);
  const [newLabel, setNewLabel] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [urlError, setUrlError] = useState("");

  const { data: links = [], refetch } = trpc.externalLinks.list.useQuery({ caseId });
  const addMutation = trpc.externalLinks.add.useMutation();
  const updateMutation = trpc.externalLinks.update.useMutation();
  const deleteMutation = trpc.externalLinks.delete.useMutation();

  const validateUrl = (url: string): boolean => {
    if (!url) {
      setUrlError("URL is required");
      return false;
    }
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      setUrlError("URL must start with http:// or https://");
      return false;
    }
    try {
      new URL(url);
      setUrlError("");
      return true;
    } catch {
      setUrlError("Invalid URL format");
      return false;
    }
  };

  const handleAdd = async () => {
    if (!newLabel.trim()) {
      toast.error("Label is required");
      return;
    }
    if (!validateUrl(newUrl)) {
      return;
    }

    try {
      await addMutation.mutateAsync({ caseId, label: newLabel.trim(), url: newUrl.trim() });
      toast.success("External link added successfully");
      setIsAddDialogOpen(false);
      setNewLabel("");
      setNewUrl("");
      setUrlError("");
      refetch();
    } catch (error: any) {
      toast.error(`Failed to add link: ${error.message}`);
    }
  };

  const handleEdit = async () => {
    if (!editingLink) return;
    if (!newLabel.trim()) {
      toast.error("Label is required");
      return;
    }
    if (!validateUrl(newUrl)) {
      return;
    }

    try {
      await updateMutation.mutateAsync({ id: editingLink.id, label: newLabel.trim(), url: newUrl.trim() });
      toast.success("External link updated successfully");
      setIsEditDialogOpen(false);
      setEditingLink(null);
      setNewLabel("");
      setNewUrl("");
      setUrlError("");
      refetch();
    } catch (error: any) {
      toast.error(`Failed to update link: ${error.message}`);
    }
  };

  const handleDelete = async (id: number, label: string) => {
    if (!confirm(`Are you sure you want to delete "${label}"?`)) return;

    try {
      await deleteMutation.mutateAsync({ id });
      toast.success("External link deleted successfully");
      refetch();
    } catch (error: any) {
      toast.error(`Failed to delete link: ${error.message}`);
    }
  };

  const openEditDialog = (link: { id: number; label: string; url: string }) => {
    setEditingLink(link);
    setNewLabel(link.label);
    setNewUrl(link.url);
    setUrlError("");
    setIsEditDialogOpen(true);
  };

  const openAddDialog = () => {
    setNewLabel("");
    setNewUrl("");
    setUrlError("");
    setIsAddDialogOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ExternalLink className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-medium">External File Storage Links</h3>
        </div>
        <Button onClick={openAddDialog} size="sm" variant="outline">
          <Plus className="h-4 w-4 mr-2" />
          Add Link
        </Button>
      </div>

      {links.length === 0 ? (
        <p className="text-sm text-muted-foreground">No external links added yet</p>
      ) : (
        <div className="space-y-2">
          {links.map((link) => (
            <div key={link.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{link.label}</p>
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:underline truncate block"
                >
                  {link.url}
                </a>
              </div>
              <div className="flex items-center gap-2 ml-4">
                <Button
                  onClick={() => openEditDialog(link)}
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  onClick={() => handleDelete(link.id, link.label)}
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Link Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add External Storage Link</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="add-label">Label *</Label>
              <Input
                id="add-label"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="e.g., Google Drive Folder, Dropbox Files"
                maxLength={255}
              />
            </div>
            <div>
              <Label htmlFor="add-url">URL *</Label>
              <Input
                id="add-url"
                value={newUrl}
                onChange={(e) => {
                  setNewUrl(e.target.value);
                  if (urlError) validateUrl(e.target.value);
                }}
                placeholder="https://drive.google.com/..."
                type="url"
              />
              {urlError && <p className="text-sm text-destructive mt-1">{urlError}</p>}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAdd} disabled={addMutation.isPending}>
              {addMutation.isPending ? "Adding..." : "Add Link"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Link Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit External Storage Link</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-label">Label *</Label>
              <Input
                id="edit-label"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="e.g., Google Drive Folder, Dropbox Files"
                maxLength={255}
              />
            </div>
            <div>
              <Label htmlFor="edit-url">URL *</Label>
              <Input
                id="edit-url"
                value={newUrl}
                onChange={(e) => {
                  setNewUrl(e.target.value);
                  if (urlError) validateUrl(e.target.value);
                }}
                placeholder="https://drive.google.com/..."
                type="url"
              />
              {urlError && <p className="text-sm text-destructive mt-1">{urlError}</p>}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEdit} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
