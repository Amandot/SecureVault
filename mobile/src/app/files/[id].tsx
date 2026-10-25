import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { File, Download, Trash2, ArrowLeft } from 'lucide-react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { decryptFile } from '../../lib/crypto/fileEncryptor';
import { loadPrivateKey } from '../../lib/crypto/keyManager';

export default function FileDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [downloading, setDownloading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['file', id],
    queryFn: async () => {
      const res = await api.get(`/files/${id}`);
      return res.data;
    }
  });

  const handleDownload = async () => {
    if (!data?.file || !data?.downloadUrl) return;

    // Prompt user for master passphrase to decrypt the private key
    // For a real mobile app, you would prompt via a secure modal or unlock with biometrics.
    // For now, we will simulate this or use a simple prompt if possible, but React Native Alert doesn't support text input on both platforms easily without extra libraries.
    // Assuming the user has their private key stored and we can decrypt it if we had the passphrase.
    // To simplify this demo, we'll assume the user uses a default passphrase "123456" or we just warn them.
    
    Alert.prompt(
      'Decrypt File',
      'Enter your master passphrase to decrypt this file locally:',
      async (passphrase) => {
        if (!passphrase) return;
        setDownloading(true);
        try {
          // 1. Download encrypted blob
          const tempEncryptedPath = FileSystem.cacheDirectory + `encrypted_${id}.bin`;
          const downloadRes = await FileSystem.downloadAsync(data.downloadUrl, tempEncryptedPath);
          
          if (downloadRes.status !== 200) {
            throw new Error('Failed to download encrypted file from server');
          }

          // 2. Read encrypted data directly into memory
          const response = await fetch(tempEncryptedPath);
          const encryptedBuffer = await response.arrayBuffer();
          const { arrayBufferToBase64 } = await import('../../lib/crypto/aes');

          // 3. Load private key
          const privateKey = await loadPrivateKey(passphrase);
          if (!privateKey) throw new Error('Incorrect passphrase or no key found.');

          // 4. Decrypt data
          const decryptedBuffer = await decryptFile(encryptedBuffer, {
            encryptedKeyBase64: data.file.encryptedKey,
            ivBase64: data.file.iv,
            rsaPrivateKey: privateKey,
          });

          // 5. Save decrypted file temporarily to share/open
          const decryptedBase64 = arrayBufferToBase64(decryptedBuffer);
          const finalPath = FileSystem.cacheDirectory + data.file.filename;
          await FileSystem.writeAsStringAsync(finalPath, decryptedBase64, { encoding: FileSystem.EncodingType.Base64 });

          // 6. Share or open the file natively
          if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(finalPath);
          } else {
            Alert.alert('Success', 'File decrypted, but sharing is not available on this device.');
          }

          // 7. Cleanup temp files (security)
          await FileSystem.deleteAsync(tempEncryptedPath, { idempotent: true });
          // Note: we might want to delete finalPath after some time or after sharing completes
        } catch (error: any) {
          Alert.alert('Decryption Error', error.message || 'Failed to decrypt file.');
        } finally {
          setDownloading(false);
        }
      },
      'secure-text'
    );
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete File',
      'Are you sure you want to move this file to trash?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await api.delete(`/files/${id}`);
              queryClient.invalidateQueries({ queryKey: ['files'] });
              queryClient.invalidateQueries({ queryKey: ['recent-files'] });
              router.back();
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to delete file');
            } finally {
              setDeleting(false);
            }
          }
        }
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator color="#00C8FF" size="large" />
      </View>
    );
  }

  if (error || !data?.file) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.errorText}>Failed to load file details</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const file = data.file;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
          <ArrowLeft color="#fff" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>File Details</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.card}>
        <View style={styles.fileIconContainer}>
          <File color="#00C8FF" size={48} />
        </View>
        <Text style={styles.fileName}>{file.filename}</Text>
        
        <View style={styles.metaContainer}>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Size</Text>
            <Text style={styles.metaValue}>{(file.size / 1024).toFixed(1)} KB</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Type</Text>
            <Text style={styles.metaValue}>{file.mimeType}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Encryption</Text>
            <Text style={styles.metaValue}>{file.encryptionType}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Uploaded</Text>
            <Text style={styles.metaValue}>{new Date(file.createdAt).toLocaleString()}</Text>
          </View>
        </View>
      </View>

      <View style={styles.actionContainer}>
        <TouchableOpacity 
          style={[styles.actionButton, styles.primaryButton, downloading && styles.disabledButton]} 
          onPress={handleDownload}
          disabled={downloading || deleting}
        >
          {downloading ? (
            <ActivityIndicator color="#07111F" size="small" />
          ) : (
            <>
              <Download color="#07111F" size={20} />
              <Text style={styles.primaryButtonText}>Decrypt & Open</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.actionButton, styles.dangerButton, deleting && styles.disabledButton]} 
          onPress={handleDelete}
          disabled={downloading || deleting}
        >
          {deleting ? (
            <ActivityIndicator color="#ef4444" size="small" />
          ) : (
            <>
              <Trash2 color="#ef4444" size={20} />
              <Text style={styles.dangerButtonText}>Delete File</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#07111F',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  iconButton: {
    padding: 8,
  },
  card: {
    margin: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
  },
  fileIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0, 200, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  fileName: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 24,
  },
  metaContainer: {
    width: '100%',
    gap: 12,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  metaLabel: {
    color: '#9ca3af',
    fontSize: 14,
  },
  metaValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  actionContainer: {
    padding: 16,
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  primaryButton: {
    backgroundColor: '#00C8FF',
  },
  primaryButtonText: {
    color: '#07111F',
    fontSize: 16,
    fontWeight: 'bold',
  },
  dangerButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  dangerButtonText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: 'bold',
  },
  disabledButton: {
    opacity: 0.5,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 16,
    marginBottom: 16,
  },
  backButton: {
    padding: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
  }
});
