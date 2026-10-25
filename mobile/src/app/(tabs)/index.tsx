import React from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useAuth } from '../../hooks/useAuth';
import { useRouter } from 'expo-router';
import { File, Folder } from 'lucide-react-native';

export default function Dashboard() {
  const { user } = useAuth();
  const router = useRouter();

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['recent-files'],
    queryFn: async () => {
      const res = await api.get('/files?sort=createdAt&order=desc');
      return res.data;
    }
  });

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#00C8FF" />}
    >
      <View style={styles.header}>
        <Text style={styles.greeting}>Welcome, {user?.displayName || 'User'}</Text>
        <Text style={styles.subtitle}>Your SecureVault is active</Text>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <File color="#00C8FF" size={24} />
          <Text style={styles.statNumber}>{data?.files?.length || 0}</Text>
          <Text style={styles.statLabel}>Total Files</Text>
        </View>
        <View style={styles.statCard}>
          <Folder color="#00C8FF" size={24} />
          <Text style={styles.statNumber}>--</Text>
          <Text style={styles.statLabel}>Folders</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Recent Files</Text>
      
      {isLoading ? (
        <Text style={styles.emptyText}>Loading...</Text>
      ) : data?.files?.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No files yet</Text>
          <TouchableOpacity style={styles.uploadButton} onPress={() => router.push('/(tabs)/files')}>
            <Text style={styles.uploadButtonText}>Upload a file</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.fileList}>
          {data?.files?.slice(0, 5).map((file: any) => (
            <TouchableOpacity 
              key={file.id} 
              style={styles.fileItem}
              onPress={() => router.push(`/files/${file.id}`)}
            >
              <File color="#9ca3af" size={20} />
              <View style={styles.fileInfo}>
                <Text style={styles.fileName} numberOfLines={1}>{file.filename}</Text>
                <Text style={styles.fileMeta}>{new Date(file.createdAt).toLocaleDateString()}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#07111F',
    padding: 16,
  },
  header: {
    marginBottom: 24,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  subtitle: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    marginHorizontal: 4,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  emptyText: {
    color: '#9ca3af',
    marginBottom: 16,
  },
  uploadButton: {
    backgroundColor: '#00C8FF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  uploadButtonText: {
    color: '#07111F',
    fontWeight: 'bold',
  },
  fileList: {
    gap: 12,
    paddingBottom: 24,
  },
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  fileInfo: {
    marginLeft: 12,
    flex: 1,
  },
  fileName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  fileMeta: {
    color: '#9ca3af',
    fontSize: 12,
    marginTop: 4,
  }
});
