import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../config/api';
import type { LoginTenant } from './auth.service';

export type TenantWorkspace = LoginTenant;

class CompanyService {
  /**
   * Tenants from login cache, or GET /users/my-tenants/ when cache is missing (e.g. cold start).
   */
  async getCompanies(): Promise<TenantWorkspace[]> {
    const cached = await AsyncStorage.getItem('loginTenants');
    if (cached) {
      try {
        const parsed = JSON.parse(cached) as TenantWorkspace[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch {
        // fall through to API
      }
    }

    const response = await apiClient.get<{ tenants: TenantWorkspace[] }>('/users/my-tenants/');
    const tenants = response.data.tenants ?? [];
    await AsyncStorage.setItem('loginTenants', JSON.stringify(tenants));
    return tenants;
  }

  async selectCompany(company: TenantWorkspace): Promise<void> {
    await AsyncStorage.setItem('selectedCompany', JSON.stringify(company));
  }

  async getSelectedCompany(): Promise<TenantWorkspace | null> {
    try {
      const companyStr = await AsyncStorage.getItem('selectedCompany');
      return companyStr ? (JSON.parse(companyStr) as TenantWorkspace) : null;
    } catch {
      return null;
    }
  }

  async clearSelectedCompany(): Promise<void> {
    try {
      await AsyncStorage.removeItem('selectedCompany');
    } catch (error) {
      console.error('Error clearing selected company:', error);
    }
  }
}

export default new CompanyService();
