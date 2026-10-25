import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity, Alert } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useRouter } from 'expo-router';
import { File, Plus } from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { encryptFile } from '../../lib/crypto/fileEncryptor';
import { useAuth } from '../../hooks/useAuth';
import { loadPrivateKey, exportPublicKeyToJwk } from '../../lib/crypto/keyManager';

export default function FilesScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['files'],
    queryFn: async () => {
      const res = await api.get('/files?sort=createdAt&order=desc');
      return res.data;
    }
  });

  const handleUpload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      setUploading(true);
      const asset = result.assets[0];

      // Use fetch to stream file into memory as a binary array buffer
      const response = await fetch(asset.uri);
      const fileBuffer = await response.arrayBuffer();
      const { arrayBufferToBase64 } = await import('../../lib/crypto/aes');

      // Ask for passphrase to load private key
      // In a real app, you'd cache the public key or ask user for passphrase to decrypt private key
      // For this demo, we assume we can fetch the user's public key from the backend to encrypt
      const userRes = await api.get('/auth/me');
      const publicKeyJwk = userRes.data.user.publicKey;
      
      if (!publicKeyJwk) {
        Alert.alert('Error', 'No public key found for your account.');
        setUploading(false);
        return;
      }
      
      const { importPublicKeyFromJwk } = await import('../../lib/crypto/keyManager');
      const publicKey = importPublicKeyFromJwk(publicKeyJwk);

      // Encrypt file
      const encryptedPackage = await encryptFile(fileBuffer, { rsaPublicKey: publicKey });

      // Prepare multipart form data
      const formData = new FormData();
      formData.append('filename', asset.name);
      formData.append('mimeType', asset.mimeType || 'application/octet-stream');
      formData.append('size', asset.size?.toString() || fileBuffer.byteLength.toString());
      formData.append('encryptionType', encryptedPackage.encryptionType);
      formData.append('encryptedKey', encryptedPackage.encryptedKey);
      formData.append('iv', encryptedPackage.iv);
      formData.append('layerCount', encryptedPackage.layerCount.toString());
      
      // Append file blob (React Native FormData supports uri)
      // Actually we need to write the encrypted buffer to a temp file and upload that
      const tempFilePath = FileSystem.cacheDirectory + 'temp_encrypted_upload';
      const encryptedBase64 = arrayBufferToBase64(encryptedPackage.encryptedData);
      await FileSystem.writeAsStringAsync(tempFilePath, encryptedBase64, { encoding: FileSystem.EncodingType.Base64 });
      
      formData.append('encryptedFile', {
        uri: tempFilePath,
        name: 'encrypted_file.bin',
        type: 'application/octet-stream',
      } as any);

      // Upload
      await api.post('/files/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      queryClient.invalidateQueries({ queryKey: ['files'] });
      queryClient.invalidateQueries({ queryKey: ['recent-files'] });
      Alert.alert('Success', 'File uploaded and encrypted successfully!');
    } catch (error: any) {
      console.error(error);
      Alert.alert('Upload Error', error.message || 'An error occurred during upload.');
    } finally {
      setUploading(false);
    }
  };

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity 
      style={styles.fileItem}
      onPress={() => router.push(`/files/${item.id}`)}
    >
      <File color="#9ca3af" size={24} />
      <View style={styles.fileInfo}>
        <Text style={styles.fileName} numberOfLines={1}>{item.filename}</Text>
        <Text style={styles.fileMeta}>
          {new Date(item.createdAt).toLocaleDateString()} • {(item.size / 1024).toFixed(1)} KB
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={data?.files || []}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#00C8FF" />}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No files in your vault.</Text>
            </View>
          ) : null
        }
      />
      
      <TouchableOpacity 
        style={[styles.fab, uploading && styles.fabDisabled]} 
        onPress={handleUpload}
        disabled={uploading}
      >
        <Plus color="#07111F" size={24} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#07111F',
  },
  listContent: {
    padding: 16,
    gap: 12,
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
    marginLeft: 16,
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
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: '#9ca3af',
    fontSize: 16,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#00C8FF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#00C8FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabDisabled: {
    opacity: 0.5,
  }
});
