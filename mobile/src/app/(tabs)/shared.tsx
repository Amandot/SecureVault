import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function SharedScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Shared with me</Text>
      <Text style={styles.subtitle}>Files shared with your account will appear here.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#07111F',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
  }
});
