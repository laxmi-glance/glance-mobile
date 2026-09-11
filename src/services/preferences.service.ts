import { apiClient } from "../config/api";
import type { UserPreferences } from "../types/dashboard";

class PreferencesService {
  async get(): Promise<UserPreferences> {
    const { data } = await apiClient.get<UserPreferences>("/users/preferences/");
    return data || {};
  }

  async patch(update: Partial<UserPreferences>): Promise<UserPreferences> {
    const { data } = await apiClient.patch<UserPreferences>("/users/preferences/", update);
    return data || {};
  }
}

export default new PreferencesService();
