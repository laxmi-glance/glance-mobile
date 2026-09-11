import { apiClient } from "../config/api";

export type CompanyProfile = {
  id?: string;
  name?: string | null;
  logo?: string | null;
  logo_url?: string | null;
};

class CompanyService {
  async getCurrent(): Promise<CompanyProfile | null> {
    try {
      const { data } = await apiClient.get<CompanyProfile>("/company/");
      return data;
    } catch {
      return null;
    }
  }
}

export default new CompanyService();
