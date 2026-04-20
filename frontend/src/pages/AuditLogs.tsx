import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import { fetchAuditLogs } from "@/lib/api";
import { Search } from "lucide-react";

const actionBadgeStyles: Record<string, string> = {
  login_success: "bg-success/10 text-success",
  login_failed: "bg-destructive/10 text-destructive",
  logout: "bg-warning/10 text-warning"
};

const actionLabels: Record<string, string> = {
  login_success: "Login",
  login_failed: "Login Failed",
  logout: "Logout"
};

function formatLoginSource(ip?: string) {
  if (!ip) return "Unknown source";
  const normalized = ip.trim().toLowerCase();
  if (normalized === "::1" || normalized === "127.0.0.1" || normalized === "::ffff:127.0.0.1") {
    return "This computer (local)";
  }
  return "Network device";
}

function formatDeviceBrowser(userAgent?: string) {
  if (!userAgent) return "Unknown device/browser";

  const ua = userAgent.toLowerCase();
  let browser = "Browser";
  if (ua.includes("edg/")) browser = "Edge";
  else if (ua.includes("chrome/") && !ua.includes("edg/")) browser = "Chrome";
  else if (ua.includes("firefox/")) browser = "Firefox";
  else if (ua.includes("safari/") && !ua.includes("chrome/")) browser = "Safari";

  let os = "Device";
  if (ua.includes("windows")) os = "Windows";
  else if (ua.includes("android")) os = "Android";
  else if (ua.includes("iphone") || ua.includes("ipad") || ua.includes("ios")) os = "iOS";
  else if (ua.includes("mac os") || ua.includes("macintosh")) os = "macOS";
  else if (ua.includes("linux")) os = "Linux";

  return `${browser} on ${os}`;
}

export default function AuditLogs() {
  const [search, setSearch] = useState("");
  const { data: logs = [], isLoading, error } = useQuery({
    queryKey: ["audit-logs"],
    queryFn: () => fetchAuditLogs(300)
  });

  const filtered = useMemo(() => {
    if (!search.trim()) {
      return logs;
    }
    const needle = search.toLowerCase();
    return logs.filter((log) => {
      const detailEmail = typeof log.details?.email === "string" ? log.details.email : "";
      return (
        log.userName?.toLowerCase().includes(needle) ||
        log.userEmail?.toLowerCase().includes(needle) ||
        log.action.toLowerCase().includes(needle) ||
        log.ip?.toLowerCase().includes(needle) ||
        detailEmail.toLowerCase().includes(needle)
      );
    });
  }, [logs, search]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold font-display text-foreground">Audit Logs</h1>
          <p className="text-sm text-muted-foreground mt-1">Track login and logout activity</p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by user, action, or source"
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <Card>
        <CardContent className="pt-5">
          {isLoading && (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <p>Loading audit logs...</p>
            </div>
          )}
          {error && (
            <div className="flex items-center justify-center py-8">
              <p className="text-destructive">Error: {(error as Error).message}</p>
            </div>
          )}
          {!isLoading && !error && logs.length === 0 && (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <p>No audit logs found.</p>
            </div>
          )}
          {!isLoading && logs.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/70 bg-primary text-primary-foreground text-left">
                  <th className="h-12 px-4 text-[11px] font-semibold text-primary-foreground uppercase tracking-wide">Time</th>
                  <th className="h-12 px-4 text-[11px] font-semibold text-primary-foreground uppercase tracking-wide">User</th>
                  <th className="h-12 px-4 text-[11px] font-semibold text-primary-foreground uppercase tracking-wide">Action</th>
                  <th className="h-12 px-4 text-[11px] font-semibold text-primary-foreground uppercase tracking-wide">Login Source</th>
                  <th className="h-12 px-4 text-[11px] font-semibold text-primary-foreground uppercase tracking-wide">Device / Browser</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((log, idx) => {
                  const detailEmail = typeof log.details?.email === "string" ? log.details.email : null;
                  return (
                    <tr
                      key={log.id}
                      className={`border-b border-border/20 transition-colors ${
                        idx % 2 === 0 ? "bg-background hover:bg-muted/30" : "bg-muted/10 hover:bg-muted/20"
                      }`}
                    >
                      <td className="px-4 py-3 text-muted-foreground">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground">{log.userName ?? "Unknown"}</div>
                        <div className="text-xs text-muted-foreground">
                          {log.userEmail ?? detailEmail ?? "—"}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`status-badge ${actionBadgeStyles[log.action] ?? "bg-muted text-muted-foreground"}`}
                        >
                          {actionLabels[log.action] ?? log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground" title={log.ip ?? ""}>
                        {formatLoginSource(log.ip)}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground max-w-xs truncate" title={log.userAgent ?? ""}>
                        {formatDeviceBrowser(log.userAgent)}
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-sm text-muted-foreground">
                      No audit logs found for the selected filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
