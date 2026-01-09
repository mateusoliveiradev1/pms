import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import Input from '../ui/components/Input';
import Button from '../ui/components/Button';
import { colors } from '../ui/theme';
import Logo from '../ui/components/Logo';
import { useNavigation } from '@react-navigation/native';

const RegisterScreen = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();
  const navigation = useNavigation();

  const handleRegister = async () => {
    if (!name || !email || !password || !confirmPassword || !supplierName) {
        Alert.alert('Erro', 'Preencha todos os campos');
        return;
    }

    if (password !== confirmPassword) {
        Alert.alert('Erro', 'As senhas não coincidem');
        return;
    }
    
    setLoading(true);
    try {
      await signUp({
        name,
        email,
        password,
        supplierName,
        role: 'SUPPLIER'
      });
    } catch (error: any) {
      console.log(error);
      const msg = error.response?.data?.message || 'Falha no cadastro. Tente novamente.';
      Alert.alert('Erro', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <View style={styles.header}>
                <Logo size={70} variant="dark" style={styles.logoContainer} />
                <Text style={styles.title}>Crie sua conta</Text>
                <Text style={styles.subtitle}>Comece a vender hoje mesmo</Text>
            </View>
            
            <View style={styles.form}>
            <Input
                label="Nome Completo"
                placeholder="Seu nome"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
            />
            <Input
                label="Nome da Loja/Fornecedor"
                placeholder="Ex: Minha Loja Inc"
                value={supplierName}
                onChangeText={setSupplierName}
                autoCapitalize="words"
            />
            <Input
                label="Email"
                placeholder="seu@email.com"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
            />
            <Input
                label="Senha"
                placeholder="Mínimo 6 caracteres"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
            />
            <Input
                label="Confirmar Senha"
                placeholder="Repita sua senha"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
            />

            <Button title={loading ? 'Criando conta...' : 'Cadastrar'} onPress={handleRegister} disabled={loading} style={{ marginTop: 16 }} />
            </View>

            <TouchableOpacity style={styles.footerButton} onPress={() => navigation.goBack()}>
                <Text style={styles.footerText}>Já tem uma conta? <Text style={styles.footerLink}>Faça Login</Text></Text>
            </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F2F5',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoContainer: {
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A1D1E',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6E7687',
    textAlign: 'center',
  },
  form: {
    backgroundColor: '#FFF',
    padding: 24,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    gap: 0, 
  },
  footerButton: {
    marginTop: 24,
    alignItems: 'center',
    padding: 16,
  },
  footerText: {
    color: '#6E7687',
    fontSize: 14,
  },
  footerLink: {
    color: colors.primary,
    fontWeight: 'bold',
  },
});

export default RegisterScreen;
