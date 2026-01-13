import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { Button } from 'react-native';

export default function PendingApprovalScreen() {
  const { signOut } = useAuth();

  return (
    <View style={styles.container}>
      <Ionicons name="time-outline" size={80} color="#FFA500" />
      <Text style={styles.title}>Cadastro em Análise</Text>
      <Text style={styles.text}>
        Seu cadastro está em análise. Avisaremos quando for aprovado.
      </Text>
      <View style={styles.buttonContainer}>
        <Button title="Sair" onPress={signOut} color="#FF3B30" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
    textAlign: 'center',
  },
  text: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  buttonContainer: {
    width: '100%',
    maxWidth: 200,
  },
});
