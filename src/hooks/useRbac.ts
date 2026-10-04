import { useCallback, useEffect, useRef, useState } from "react";
import authService from "../services/auth.service";
import rbacService from "../services/rbac.service";
import type { RbacConfig } from "../types/models";
import {
  canApproveFinancialDocuments,
  canReadDocumentProcessor,
  canUploadFinancialDocuments,
  canViewFinancialDocumentsOnSide,
  canWriteDocumentProcessor,
  rbacAllows,
} from "../utils/rbac";

export function useRbac() {
  const [config, setConfig] = useState<RbacConfig | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const publishedConfig = useRef<RbacConfig | null>(null);

  const reload = useCallback(async () => {
    publishedConfig.current = null;
    try {
      const [rbac, profile, id] = await Promise.all([
        rbacService.getConfig(),
        authService.getProfile().catch(() => null),
        authService.getStoredUserId(),
      ]);
      setConfig(publishedConfig.current ?? rbac);
      setRole(profile?.role || null);
      setUsername(profile?.username || null);
      setUserId(id);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
    return rbacService.subscribe((next) => {
      publishedConfig.current = next;
      setConfig(next);
    });
  }, [reload]);

  return {
    config,
    role,
    username,
    userId,
    loading,
    reload,
    allows: (module: string, action: string) => rbacAllows(config, role, module, action),
    canViewAp: canViewFinancialDocumentsOnSide(config, role, "ap"),
    canApprove: canApproveFinancialDocuments(config, role),
    canUpload: canUploadFinancialDocuments(config, role),
    canReadDocumentProcessor: canReadDocumentProcessor(config, role),
    canWriteDocumentProcessor: canWriteDocumentProcessor(config, role),
  };
}
