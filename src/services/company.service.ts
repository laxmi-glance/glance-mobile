import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../config/api';

export interface Company {
  id: number;
  name: string;
  logo?: string;
  // Add other company fields as needed
}

class CompanyService {
  async getCompanies(): Promise<Company[]> {
    try {
      const response = await apiClient.get<Company[]>('/companies/');
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async selectCompany(company: Company): Promise<void> {
    try {
      await AsyncStorage.setItem('selectedCompany', JSON.stringify(company));
    } catch (error) {
      console.error('Error selecting company:', error);
    }
  }

  async getSelectedCompany(): Promise<Company | null> {
    try {
      const companyStr = await AsyncStorage.getItem('selectedCompany');
      return companyStr ? JSON.parse(companyStr) : null;
    } catch (error) {
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
