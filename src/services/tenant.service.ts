import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiClient } from "../config/api";
import { StorageKeys, getJson, setJson } from "../core/storage";
import type { Tenant } from "../types/models";

class TenantService {
  async listTenants(): Promise<Tenant[]> {
    const { data } = await apiClient.get<{ tenants: Tenant[] }>("/users/my-tenants/");
    const tenants = data.tenants ?? [];
    await setJson(StorageKeys.availableTenants, tenants);
    return tenants;
  }

  async getSelectedTenant(): Promise<Tenant | null> {
    return getJson<Tenant>(StorageKeys.selectedTenant);
  }

  async persistSelectedTenant(tenant: Tenant): Promise<void> {
    await AsyncStorage.setItem(StorageKeys.tenantId, tenant.tenant_id);
    await setJson(StorageKeys.selectedTenant, tenant);
  }

  async clearSelectedTenant(): Promise<void> {
    await AsyncStorage.multiRemove([StorageKeys.tenantId, StorageKeys.selectedTenant]);
  }
}

export default new TenantService();
