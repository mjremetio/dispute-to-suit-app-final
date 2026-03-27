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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Save } from "lucide-react";
import { useState, useEffect } from "react";

interface TaskData {
  id: number;
  title: string;
  description: string | null;
  priority: "low" | "medium" | "high" | "urgent";
  status: "pending" | "in_progress" | "completed" | "cancelled";
  assignedTo: number | null;
  dueDate: string | Date | null;
}

interface TaskEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: TaskData | null;

  onSave: (taskId: number, updates: {
    title?: string;
    description?: string;
    priority?: string;
    status?: string;
    assignedTo?: number | null;
    dueDate?: Date | null;
  }) => void;
  isPending?: boolean;
  caseId: number;
}

export default function TaskEditDialog({
  open,
  onOpenChange,
  task,

  onSave,
  isPending = false,
  caseId,
}: TaskEditDialogProps) {
  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    priority: "medium" as string,
    status: "pending" as string,

    dueDate: "" as string,
  });

  useEffect(() => {
    if (task && open) {
      setEditForm({
        title: task.title,
        description: task.description || "",
        priority: task.priority,
        status: task.status,

        dueDate: task.dueDate
          ? new Date(task.dueDate).toISOString().split("T")[0]
          : "",
      });
    }
  }, [task, open]);

  const handleSave = () => {
    if (!task || !editForm.title.trim()) return;

    const updates: any = {};

    if (editForm.title !== task.title) updates.title = editForm.title;
    if (editForm.description !== (task.description || ""))
      updates.description = editForm.description || undefined;
    if (editForm.priority !== task.priority) updates.priority = editForm.priority;
    if (editForm.status !== task.status) updates.status = editForm.status;

    const newDueDate = editForm.dueDate ? new Date(editForm.dueDate) : null;
    const oldDueDate = task.dueDate ? new Date(task.dueDate).toISOString().split("T")[0] : "";
    if (editForm.dueDate !== oldDueDate) updates.dueDate = newDueDate;

    if (Object.keys(updates).length === 0) {
      onOpenChange(false);
      return;
    }

    onSave(task.id, updates);
  };

  if (!task) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg h-full sm:h-auto">
        <DialogHeader>
          <DialogTitle>Edit Task</DialogTitle>
          <DialogDescription>
            Update task details for case #{caseId}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="editTaskTitle">Task Title *</Label>
            <Input
              id="editTaskTitle"
              value={editForm.title}
              onChange={(e) =>
                setEditForm({ ...editForm, title: e.target.value })
              }
              placeholder="Task title"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="editTaskDescription">Description</Label>
            <Textarea
              id="editTaskDescription"
              value={editForm.description}
              onChange={(e) =>
                setEditForm({ ...editForm, description: e.target.value })
              }
              placeholder="Describe what needs to be done..."
              rows={3}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select
                value={editForm.priority}
                onValueChange={(v) =>
                  setEditForm({ ...editForm, priority: v })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={editForm.status}
                onValueChange={(v) =>
                  setEditForm({ ...editForm, status: v })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Due Date</Label>
            <Input
              type="date"
              value={editForm.dueDate}
              onChange={(e) =>
                setEditForm({ ...editForm, dueDate: e.target.value })
              }
              className="block"
            />
          </div>
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!editForm.title.trim() || isPending}
              className="flex-1"
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
