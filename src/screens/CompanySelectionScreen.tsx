import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { CompanySelectionScreenProps } from '../types/navigation';
import companyService, { TenantWorkspace } from '../services/company.service';
import authService from '../services/auth.service';

export default function CompanySelectionScreen({ navigation }: CompanySelectionScreenProps) {
  const [companies, setCompanies] = useState<TenantWorkspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState(false);

  useEffect(() => {
    loadCompanies();
  }, []);

  const loadCompanies = async () => {
    try {
      const data = await companyService.getCompanies();
      setCompanies(data);
    } catch (error: any) {
      Alert.alert('Error', 'Failed to load companies. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCompany = async (company: TenantWorkspace) => {
    if (selecting) return;
    setSelecting(true);
    try {
      await authService.selectTenant(company.tenant_id);
      await companyService.selectCompany(company);
      await authService.fetchProfile();
      navigation.replace('ProcessingQueue');
    } catch (error: unknown) {
      const detail =
        (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        'Could not open this workspace. Please try again.';
      Alert.alert('Error', typeof detail === 'string' ? detail : 'Could not open this workspace.');
    } finally {
      setSelecting(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await authService.logout();
          // Explicit reset: session is cleared immediately; event-driven resetToLogin can
          // race if the container is not ready—this keeps UX and state aligned.
          navigation.reset({
            index: 0,
            routes: [{ name: 'Login' }],
          });
        },
      },
    ]);
  };

  const renderCompanyItem = ({ item }: { item: TenantWorkspace }) => (
    <TouchableOpacity
      style={styles.companyCard}
      onPress={() => handleSelectCompany(item)}
      disabled={selecting}
    >
      <View style={styles.companyInfo}>
        <Text style={styles.companyName}>{item.company_name || 'Workspace'}</Text>
        <Text style={styles.roleText}>{item.role}</Text>
      </View>
      <Text style={styles.arrow}>›</Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Select Company</Text>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={companies}
        renderItem={renderCompanyItem}
        keyExtractor={(item) => item.tenant_id}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No companies found</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  logoutButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  logoutText: {
    color: '#FF3B30',
    fontSize: 16,
  },
  listContainer: {
    padding: 16,
  },
  companyCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  companyInfo: {
    flex: 1,
  },
  companyName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  roleText: {
    fontSize: 13,
    color: '#888',
    marginTop: 4,
    textTransform: 'capitalize',
  },
  arrow: {
    fontSize: 28,
    color: '#ccc',
    marginLeft: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 48,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
});
