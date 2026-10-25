import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { api } from '../lib/api';
import { generateKeyPair, exportPublicKeyToJwk, exportPrivateKeyToPkcs8, storePrivateKey } from '../lib/crypto/keyManager';

import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';

WebBrowser.maybeCompleteAuthSession();

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || 'your-web-client-id.apps.googleusercontent.com',
  });

  React.useEffect(() => {
    if (response?.type === 'success') {
      const { id_token } = response.params;
      const credential = GoogleAuthProvider.credential(id_token);
      setLoading(true);
      signInWithCredential(auth, credential)
        .then(async () => {
          if (!passphrase) {
             Alert.alert('Encryption Required', 'Please enter your Master Passphrase first, then click Google again to generate your keys.');
             setLoading(false);
             return;
          }
          try {
            const keypair = await generateKeyPair();
            const pubJwk = exportPublicKeyToJwk(keypair.publicKey);
            const privPkcs8 = exportPrivateKeyToPkcs8(keypair.privateKey);
            await storePrivateKey(privPkcs8, passphrase, pubJwk);
            
            await api.post('/auth/register', {
              name: auth.currentUser?.displayName || 'Google User',
              publicKey: pubJwk
            });
          } catch (err: any) {
            Alert.alert('Registration Error', err.message);
            auth.signOut();
          }
          setLoading(false);
        })
        .catch(error => {
          Alert.alert('Google Login Error', error.message);
          setLoading(false);
        });
    }
  }, [response]);

  const handleRegister = async () => {
    if (!name || !email || !password || !passphrase) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    
    setLoading(true);
    try {
      // 1. Create Firebase User
      await createUserWithEmailAndPassword(auth, email, password);
      
      // 2. Generate RSA Key Pair
      const keypair = await generateKeyPair();
      const pubJwk = exportPublicKeyToJwk(keypair.publicKey);
      const privPkcs8 = exportPrivateKeyToPkcs8(keypair.privateKey);
      
      // 3. Store private key locally, encrypted with passphrase
      await storePrivateKey(privPkcs8, passphrase, pubJwk);
      
      // 4. Register on Backend
      await api.post('/auth/register', {
        name,
        publicKey: pubJwk
      });
      
      // User is automatically redirected by the auth hook in _layout
    } catch (error: any) {
      Alert.alert('Registration Error', error.message || 'An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create Account</Text>
      
      <View style={styles.card}>
        <Text style={styles.label}>Name</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="John Doe"
          placeholderTextColor="#9ca3af"
        />

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholderTextColor="#9ca3af"
        />
        
        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="For account login"
          placeholderTextColor="#9ca3af"
        />

        <Text style={styles.label}>Master Passphrase (Do not lose!)</Text>
        <TextInput
          style={styles.input}
          value={passphrase}
          onChangeText={setPassphrase}
          secureTextEntry
          placeholder="Used to encrypt your local keys"
          placeholderTextColor="#9ca3af"
        />

        <TouchableOpacity 
          style={[styles.button, loading && styles.buttonDisabled]} 
          onPress={handleRegister}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#07111F" />
          ) : (
            <Text style={styles.buttonText}>Register</Text>
          )}
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.googleButton, loading && styles.buttonDisabled]} 
          onPress={() => promptAsync()}
          disabled={!request || loading}
        >
          <Text style={styles.googleButtonText}>Continue with Google</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.linkButton} onPress={() => router.back()}>
          <Text style={styles.linkText}>Already have an account? Log in</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#07111F',
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#00C8FF',
    textAlign: 'center',
    marginBottom: 40,
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  label: {
    color: '#fff',
    marginBottom: 8,
    fontSize: 14,
    fontWeight: '500',
  },
  input: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    color: '#fff',
    padding: 12,
    marginBottom: 20,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#00C8FF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#07111F',
    fontSize: 16,
    fontWeight: 'bold',
  },
  googleButton: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  googleButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  linkButton: {
    marginTop: 20,
    alignItems: 'center',
  },
  linkText: {
    color: '#9ca3af',
    fontSize: 14,
  },
});
