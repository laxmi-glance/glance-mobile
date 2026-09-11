import { useCallback, useEffect, useState } from "react";
import authService from "../services/auth.service";
import rbacService from "../services/rbac.service";
import type { RbacConfig } from "../types/models";
import {
  canApproveFinancialDocuments,
  canUploadFinancialDocuments,
  canViewFinancialDocuments,
  rbacAllows,
} from "../utils/rbac";

export function useRbac() {
  const [config, setConfig] = useState<RbacConfig | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    try {
      const [rbac, profile, id] = await Promise.all([
        rbacService.getConfig(),
        authService.getProfile().catch(() => null),
        authService.getStoredUserId(),
      ]);
      setConfig(rbac);
      setRole(profile?.role || null);
      setUsername(profile?.username || null);
      setUserId(id);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return {
    config,
    role,
    username,
    userId,
    loading,
    reload,
    allows: (module: string, action: string) => rbacAllows(config, role, module, action),
    canViewAp: canViewFinancialDocuments(config, role),
    canApprove: canApproveFinancialDocuments(config, role),
    canUpload: canUploadFinancialDocuments(config, role),
  };
}
