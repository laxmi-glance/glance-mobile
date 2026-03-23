import React, { useEffect, useMemo, useState } from 'react';
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
import { useTheme } from '../theme';

export default function CompanySelectionScreen({ navigation }: CompanySelectionScreenProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
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
      if (!data.length) {
        Alert.alert(
          'No workspaces found',
          'No companies are currently available for this account. Please contact your admin or log in with another account.'
        );
      }
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
        <ActivityIndicator size="large" color={theme.colors.primaryAccent} />
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

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) =>
  StyleSheet.create({
    container: {
    flex: 1,
    backgroundColor: theme.colors.surfaceMuted,
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
    paddingHorizontal: theme.spacing[5],
    paddingVertical: theme.spacing[4],
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  title: {
    fontSize: theme.typography.size['2xl'],
    fontWeight: theme.typography.weight.bold,
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.fontFamilyPrimary,
  },
  logoutButton: {
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing[1] + 2,
  },
  logoutText: {
    color: theme.colors.error,
    fontSize: theme.typography.size.body,
    fontFamily: theme.typography.fontFamilyPrimary,
  },
  listContainer: {
    padding: theme.spacing[4],
  },
  companyCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing[4],
    marginBottom: theme.spacing[3],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: theme.colors.textPrimary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  companyInfo: {
    flex: 1,
  },
  companyName: {
    fontSize: theme.typography.size.lg,
    fontWeight: theme.typography.weight.semibold,
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.fontFamilyPrimary,
  },
  roleText: {
    fontSize: theme.typography.size.sm,
    color: theme.colors.textMuted,
    marginTop: theme.spacing[1],
    textTransform: 'capitalize',
    fontFamily: theme.typography.fontFamilyPrimary,
  },
  arrow: {
    fontSize: theme.typography.size['3xl'],
    color: theme.colors.textMuted,
    marginLeft: theme.spacing[3],
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: theme.spacing[12],
  },
  emptyText: {
    fontSize: theme.typography.size.body,
    color: theme.colors.textMuted,
    fontFamily: theme.typography.fontFamilyPrimary,
  },
  });
