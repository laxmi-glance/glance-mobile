import { apiClient } from "../config/api";
import { StorageKeys, getJson, setJson } from "../core/storage";
import type { RbacConfig } from "../types/models";

class RbacService {
  async sync(): Promise<RbacConfig> {
    const { data } = await apiClient.get<RbacConfig>("/users/rbac-config/");
    await setJson(StorageKeys.rbacConfig, data);
    return data;
  }

  async getCached(): Promise<RbacConfig | null> {
    return getJson<RbacConfig>(StorageKeys.rbacConfig);
  }

  async getConfig(): Promise<RbacConfig> {
    const cached = await this.getCached();
    if (cached?.permissions) {
      void this.sync().catch(() => undefined);
      return cached;
    }
    return this.sync();
  }
}

export default new RbacService();
