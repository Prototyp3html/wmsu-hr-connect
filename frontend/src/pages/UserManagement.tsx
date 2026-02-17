import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createUser, fetchUsers, updateUser, deleteUser } from "@/lib/api";
import { Plus, Shield, ShieldCheck, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function UserManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [formState, setFormState] = useState({
    name: "",
    email: "",
    password: "",
    role: "staff"
  });
  const [editFormState, setEditFormState] = useState({
    name: "",
    email: "",
    password: "",
    role: "staff"
  });

  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: fetchUsers
  });

  const createMutation = useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setShowCreate(false);
      setFormState({ name: "", email: "", password: "", role: "staff" });
      toast({ title: "User created", description: "The user account was added." });
    },
    onError: (error) => {
      toast({ title: "Create failed", description: (error as Error).message, variant: "destructive" });
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: { name: string; email: string; role: string; password?: string } }) => updateUser(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setShowEdit(false);
      setEditingUserId(null);
      toast({ title: "User updated", description: "Changes saved." });
    },
    onError: (error) => {
      toast({ title: "Update failed", description: (error as Error).message, variant: "destructive" });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast({ title: "User deleted", description: "The user was removed." });
    },
    onError: (error) => {
      toast({ title: "Delete failed", description: (error as Error).message, variant: "destructive" });
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display text-foreground">User Management</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage system users and access roles</p>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" /> Add User</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add New User</DialogTitle></DialogHeader>
            <form className="space-y-4" onSubmit={(e) => {
              e.preventDefault();
              createMutation.mutate({
                name: formState.name,
                email: formState.email,
                password: formState.password,
                role: formState.role
              });
            }}>
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input
                  placeholder="e.g., Maria Santos"
                  value={formState.name}
                  onChange={(e) => setFormState((prev) => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Email Address</Label>
                <Input
                  type="email"
                  placeholder="user@wmsu.edu.ph"
                  value={formState.email}
                  onChange={(e) => setFormState((prev) => ({ ...prev, email: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Password</Label>
                <Input
                  type="password"
                  placeholder="Set initial password"
                  value={formState.password}
                  onChange={(e) => setFormState((prev) => ({ ...prev, password: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={formState.role} onValueChange={(value) => setFormState((prev) => ({ ...prev, role: value }))}>
                  <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">HR Admin</SelectItem>
                    <SelectItem value="staff">HR Staff</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full" type="submit" disabled={createMutation.isPending}>Create User</Button>
            </form>
          </DialogContent>
        </Dialog>
        <Dialog open={showEdit} onOpenChange={setShowEdit}>
          <DialogContent>
            <DialogHeader><DialogTitle>Edit User</DialogTitle></DialogHeader>
            <form className="space-y-4" onSubmit={(e) => {
              e.preventDefault();
              if (!editingUserId) return;
              updateMutation.mutate({
                id: editingUserId,
                payload: {
                  name: editFormState.name,
                  email: editFormState.email,
                  role: editFormState.role,
                  ...(editFormState.password ? { password: editFormState.password } : {})
                }
              });
            }}>
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input
                  placeholder="e.g., Maria Santos"
                  value={editFormState.name}
                  onChange={(e) => setEditFormState((prev) => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Email Address</Label>
                <Input
                  type="email"
                  placeholder="user@wmsu.edu.ph"
                  value={editFormState.email}
                  onChange={(e) => setEditFormState((prev) => ({ ...prev, email: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>New Password (optional)</Label>
                <Input
                  type="password"
                  placeholder="Leave blank to keep current"
                  value={editFormState.password}
                  onChange={(e) => setEditFormState((prev) => ({ ...prev, password: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={editFormState.role} onValueChange={(value) => setEditFormState((prev) => ({ ...prev, role: value }))}>
                  <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">HR Admin</SelectItem>
                    <SelectItem value="staff">HR Staff</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full" type="submit" disabled={updateMutation.isPending}>Save Changes</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {users.map((u) => (
          <Card key={u.id} className="card-hover">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    {u.role === "admin" ? (
                      <ShieldCheck className="w-5 h-5 text-primary" />
                    ) : (
                      <Shield className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{u.name}</h3>
                    <p className="text-sm text-muted-foreground">{u.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={u.role === "admin" ? "default" : "secondary"}>
                    {u.role === "admin" ? "HR Admin" : "HR Staff"}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditingUserId(u.id);
                      setEditFormState({
                        name: u.name,
                        email: u.email,
                        password: "",
                        role: u.role
                      });
                      setShowEdit(true);
                    }}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => {
                      if (window.confirm(`Delete ${u.name}?`)) {
                        deleteMutation.mutate(u.id);
                      }
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
