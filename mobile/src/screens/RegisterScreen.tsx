import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import { SafeAreaView } from "react-native-safe-area-context";
import Input from "../ui/components/Input";
import Button from "../ui/components/Button";
import { colors } from "../ui/theme";
import Logo from "../ui/components/Logo";
import { useNavigation } from "@react-navigation/native";
import { MaterialIcons } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";

const RegisterScreen = () => {
  const [accountType, setAccountType] = useState<
    "INDIVIDUAL" | "COMPANY" | "SUPPLIER" | "OPERATOR"
  >("INDIVIDUAL");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [accountName, setAccountName] = useState(""); // Nome da Loja ou Empresa
  const [document, setDocument] = useState(""); // CPF ou CNPJ
  const [inviteCode, setInviteCode] = useState("");
  
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [termsModalVisible, setTermsModalVisible] = useState(false);
  const [privacyModalVisible, setPrivacyModalVisible] = useState(false);

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const { signUp } = useAuth();
  const navigation = useNavigation();

  const handleRegister = async () => {
    if (!name || !email || !password || !confirmPassword) {
      Alert.alert("Erro", "Preencha os campos obrigatórios");
      return;
    }

    if (accountType !== 'OPERATOR' && !accountName) {
        Alert.alert("Erro", "Preencha o nome da Loja ou Empresa");
        return;
    }

    if (!termsAccepted) {
        Alert.alert("Erro", "Você deve aceitar os Termos de Uso e Política de Privacidade");
        return;
    }

    if (password.length < 6) {
      Alert.alert("Erro", "A senha deve ter no mínimo 6 caracteres");
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Erro", "As senhas não coincidem");
      return;
    }

    setLoading(true);
    try {
      await signUp({
        name,
        email,
        password,
        accountName,
        accountType,
        document,
        inviteCode
      });
      setSuccess(true);
    } catch (error: any) {
      console.log(error);
      const msg =
        error.response?.data?.message || "Falha no cadastro. Tente novamente.";
      Alert.alert("Erro", msg);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <SafeAreaView style={styles.container}>
        <View
          style={[
            styles.content,
            { alignItems: "center", justifyContent: "center", padding: 24 },
          ]}
        >
          <View style={styles.iconContainer}>
            <MaterialIcons
              name="mark-email-read"
              size={80}
              color={colors.primary}
            />
          </View>
          <Text style={[styles.title, { marginTop: 24, textAlign: "center" }]}>
            Conta Criada!
          </Text>
          <Text
            style={[
              styles.subtitle,
              { marginTop: 8, marginBottom: 32, maxWidth: 300 },
            ]}
          >
            Bem-vindo(a) à plataforma. Verifique seu email para confirmar o
            cadastro.
          </Text>
          <Button
            title="Ir para Login"
            onPress={() => navigation.navigate("Login" as never)}
            style={{ width: "100%" }}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.content}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Logo size={70} variant="dark" style={styles.logoContainer} />
            <Text style={styles.title}>Crie sua conta</Text>
            <Text style={styles.subtitle}>Comece a vender hoje mesmo</Text>
          </View>

          <View style={styles.form}>
            {/* Account Type Selector - 4 Options */}
            <View style={styles.typeSelectorContainer}>
                <Text style={styles.sectionLabel}>Tipo de Conta</Text>
                <View style={styles.typeGrid}>
                    <TouchableOpacity
                        style={[styles.typeCard, accountType === 'INDIVIDUAL' && styles.typeCardActive]}
                        onPress={() => setAccountType('INDIVIDUAL')}
                    >
                        <Ionicons name="person" size={24} color={accountType === 'INDIVIDUAL' ? colors.primary : '#6E7687'} />
                        <Text style={[styles.typeCardText, accountType === 'INDIVIDUAL' && styles.typeCardTextActive]}>Vendedor CPF</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.typeCard, accountType === 'COMPANY' && styles.typeCardActive]}
                        onPress={() => setAccountType('COMPANY')}
                    >
                        <Ionicons name="business" size={24} color={accountType === 'COMPANY' ? colors.primary : '#6E7687'} />
                        <Text style={[styles.typeCardText, accountType === 'COMPANY' && styles.typeCardTextActive]}>Empresa</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.typeCard, accountType === 'SUPPLIER' && styles.typeCardActive]}
                        onPress={() => setAccountType('SUPPLIER')}
                    >
                        <Ionicons name="cube" size={24} color={accountType === 'SUPPLIER' ? colors.primary : '#6E7687'} />
                        <Text style={[styles.typeCardText, accountType === 'SUPPLIER' && styles.typeCardTextActive]}>Fornecedor</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.typeCard, accountType === 'OPERATOR' && styles.typeCardActive]}
                        onPress={() => setAccountType('OPERATOR')}
                    >
                        <Ionicons name="people" size={24} color={accountType === 'OPERATOR' ? colors.primary : '#6E7687'} />
                        <Text style={[styles.typeCardText, accountType === 'OPERATOR' && styles.typeCardTextActive]}>Operador</Text>
                    </TouchableOpacity>
                </View>
                
                <Text style={styles.typeDescription}>
                    {accountType === 'INDIVIDUAL' && "Ideal para autônomos. Comece a vender usando seu CPF."}
                    {accountType === 'COMPANY' && "Para empresas estabelecidas. Emissão de NFe e gestão completa."}
                    {accountType === 'SUPPLIER' && "Indústria ou Importador? Forneça produtos para nossos vendedores."}
                    {accountType === 'OPERATOR' && "Junte-se a uma equipe existente usando um código de convite."}
                </Text>
            </View>

            <Input
              label="Seu Nome Completo"
              placeholder="Seu nome"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />

            {accountType !== 'OPERATOR' && (
                <Input
                label={
                    accountType === "INDIVIDUAL" ? "Nome da Loja" : 
                    accountType === "COMPANY" ? "Nome da Empresa" : "Razão Social"
                }
                placeholder={
                    accountType === "INDIVIDUAL" ? "Ex: Minha Loja" : "Ex: Empresa Ltda"
                }
                value={accountName}
                onChangeText={setAccountName}
                autoCapitalize="words"
                />
            )}

            {accountType !== 'OPERATOR' && (
                <Input
                    label={accountType === "INDIVIDUAL" ? "CPF (Opcional)" : "CNPJ"}
                    placeholder={accountType === "INDIVIDUAL" ? "000.000.000-00" : "00.000.000/0000-00"}
                    value={document}
                    onChangeText={setDocument}
                    keyboardType="numeric"
                />
            )}

            {accountType === 'OPERATOR' && (
                <Input
                    label="Código de Convite (Opcional)"
                    placeholder="Cole o código aqui"
                    value={inviteCode}
                    onChangeText={setInviteCode}
                    autoCapitalize="characters"
                />
            )}

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

            {/* Terms Checkbox */}
            <View style={styles.termsContainer}>
                <TouchableOpacity onPress={() => setTermsAccepted(!termsAccepted)} style={styles.checkbox}>
                    {termsAccepted ? (
                        <Ionicons name="checkbox" size={24} color={colors.primary} />
                    ) : (
                        <Ionicons name="square-outline" size={24} color={colors.muted} />
                    )}
                </TouchableOpacity>
                <Text style={styles.termsText}>
                    Li e aceito os{' '}
                    <Text style={styles.linkText} onPress={() => setTermsModalVisible(true)}>Termos de Uso</Text>
                    {' '}e{' '}
                    <Text style={styles.linkText} onPress={() => setPrivacyModalVisible(true)}>Política de Privacidade</Text>
                </Text>
            </View>

            <Button
              title={loading ? "Criando conta..." : "Cadastrar"}
              onPress={handleRegister}
              disabled={loading || !termsAccepted}
              style={{ marginTop: 16, opacity: (!termsAccepted || loading) ? 0.7 : 1 }}
            />
          </View>

          <TouchableOpacity
            style={styles.footerButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.footerText}>
              Já tem uma conta?{" "}
              <Text style={styles.footerLink}>Faça Login</Text>
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Terms Modal */}
      <Modal visible={termsModalVisible} animationType="slide" presentationStyle="pageSheet">
          <SafeAreaView style={styles.modalSafeArea} edges={['top']}>
            <View style={styles.modalContainer}>
                <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Termos de Uso</Text>
                    <TouchableOpacity onPress={() => setTermsModalVisible(false)} style={styles.closeButton}>
                        <Ionicons name="close" size={24} color={colors.text} />
                    </TouchableOpacity>
                </View>
                <ScrollView contentContainerStyle={styles.modalContent}>
                    <Text style={styles.legalTitle}>TERMOS E CONDIÇÕES GERAIS DE USO</Text>
                    {/* ... content ... */}
                    <Text style={styles.legalSection}>1. ACEITAÇÃO DOS TERMOS</Text>
                    <Text style={styles.legalText}>
                        Ao criar uma conta e utilizar a plataforma PMS ("Plataforma"), você concorda expressamente com estes Termos de Uso. Se você não concordar com qualquer disposição, não deverá utilizar a Plataforma.
                    </Text>

                    <Text style={styles.legalSection}>2. O SERVIÇO</Text>
                    <Text style={styles.legalText}>
                        A PMS é uma plataforma de gestão de vendas e intermediação de negócios que conecta vendedores ("Vendedores") a fornecedores de produtos ("Fornecedores"). A Plataforma oferece ferramentas para gestão de pedidos, controle financeiro e processamento de pagamentos.
                    </Text>

                    <Text style={styles.legalSection}>3. CADASTRO E CONTAS</Text>
                    <Text style={styles.legalText}>
                        3.1. Para utilizar os serviços, você deve fornecer informações verdadeiras, completas e atualizadas. A PMS não se responsabiliza por dados incorretos inseridos pelos usuários.{'\n'}
                        3.2. Você é o único responsável pela segurança de sua senha e por qualquer atividade realizada em sua conta.{'\n'}
                        3.3. Contas de "Empresa" ou "Fornecedor" exigem CNPJ válido e regular. Contas "Individuais" podem operar com CPF, sujeitas aos limites legais de faturamento.
                    </Text>

                    <Text style={styles.legalSection}>4. TAXAS E PAGAMENTOS</Text>
                    <Text style={styles.legalText}>
                        4.1. O uso da Plataforma está sujeito ao pagamento de mensalidades (conforme plano escolhido) e taxas sobre transações (comissões).{'\n'}
                        4.2. A PMS retém automaticamente as comissões sobre as vendas realizadas através da Plataforma.{'\n'}
                        4.3. Os saques de saldo estão sujeitos a prazos de liberação (D+14 ou D+30) e limites mensais conforme o nível da conta.{'\n'}
                        4.4. Em caso de chargeback (contestação de compra pelo cliente final), o valor será descontado do saldo do Vendedor/Fornecedor responsável.
                    </Text>

                    <Text style={styles.legalSection}>5. RESPONSABILIDADES</Text>
                    <Text style={styles.legalText}>
                        5.1. A PMS atua como intermediadora tecnológica e não é proprietária dos produtos ofertados pelos Fornecedores, nem se responsabiliza pela qualidade, entrega ou garantia dos mesmos, salvo disposição legal em contrário.{'\n'}
                        5.2. O Vendedor é responsável pelo atendimento ao cliente final e pela emissão de nota fiscal quando obrigatório.{'\n'}
                        5.3. É proibida a venda de produtos ilegais, falsificados ou que violem direitos de terceiros.
                    </Text>

                    <Text style={styles.legalSection}>6. CANCELAMENTO E SUSPENSÃO</Text>
                    <Text style={styles.legalText}>
                        A PMS reserva-se o direito de suspender ou cancelar contas que violem estes Termos, apresentem alto índice de reclamações, ou suspeita de fraude, sem aviso prévio.
                    </Text>

                    <View style={{ height: 40 }} />
                </ScrollView>
            </View>
          </SafeAreaView>
      </Modal>

      {/* Privacy Modal */}
      <Modal visible={privacyModalVisible} animationType="slide" presentationStyle="pageSheet">
          <SafeAreaView style={styles.modalSafeArea} edges={['top']}>
            <View style={styles.modalContainer}>
                <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Política de Privacidade</Text>
                    <TouchableOpacity onPress={() => setPrivacyModalVisible(false)} style={styles.closeButton}>
                        <Ionicons name="close" size={24} color={colors.text} />
                    </TouchableOpacity>
                </View>
                <ScrollView contentContainerStyle={styles.modalContent}>
                    <Text style={styles.legalTitle}>POLÍTICA DE PRIVACIDADE</Text>
                    {/* ... content ... */}
                    <Text style={styles.legalText}>
                        A sua privacidade é importante para nós. Esta Política de Privacidade descreve como a PMS coleta, usa e protege suas informações pessoais, em conformidade com a Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018).
                    </Text>

                    <Text style={styles.legalSection}>1. DADOS COLETADOS</Text>
                    <Text style={styles.legalText}>
                        Coletamos os seguintes tipos de informações:{'\n'}
                        • Dados de Identificação: Nome, CPF/CNPJ, endereço, telefone, e-mail.{'\n'}
                        • Dados Financeiros: Dados bancários, histórico de transações, chaves PIX.{'\n'}
                        • Dados de Uso: Logs de acesso, endereço IP, tipo de dispositivo e navegador.
                    </Text>

                    <Text style={styles.legalSection}>2. FINALIDADE DO USO DOS DADOS</Text>
                    <Text style={styles.legalText}>
                        Seus dados são utilizados para:{'\n'}
                        • Processar pagamentos e repasses financeiros.{'\n'}
                        • Verificar sua identidade e prevenir fraudes.{'\n'}
                        • Emitir notas fiscais de serviço (quando aplicável).{'\n'}
                        • Melhorar a experiência de uso da Plataforma e oferecer suporte técnico.
                    </Text>

                    <Text style={styles.legalSection}>3. COMPARTILHAMENTO DE DADOS</Text>
                    <Text style={styles.legalText}>
                        Não vendemos seus dados pessoais. Podemos compartilhar informações com:{'\n'}
                        • Processadores de Pagamento (ex: Stripe, Mercado Pago) para efetuar transações.{'\n'}
                        • Autoridades governamentais, quando exigido por lei ou ordem judicial.{'\n'}
                        • Parceiros logísticos, estritamente para fins de entrega de produtos.
                    </Text>

                    <Text style={styles.legalSection}>4. SEGURANÇA</Text>
                    <Text style={styles.legalText}>
                        Adotamos medidas técnicas e administrativas de segurança para proteger seus dados contra acessos não autorizados, perdas ou alterações. Utilizamos criptografia em transações financeiras e armazenamento seguro de senhas.
                    </Text>

                    <Text style={styles.legalSection}>5. SEUS DIREITOS</Text>
                    <Text style={styles.legalText}>
                        Você tem direito a:{'\n'}
                        • Acessar seus dados pessoais.{'\n'}
                        • Corrigir dados incompletos ou inexatos.{'\n'}
                        • Solicitar a exclusão de seus dados (ressalvada a guarda obrigatória por lei).{'\n'}
                        • Revogar o consentimento para uso de dados.
                    </Text>

                    <Text style={styles.legalSection}>6. CONTATO</Text>
                    <Text style={styles.legalText}>
                        Para exercer seus direitos ou tirar dúvidas sobre esta política, entre em contato através do canal de suporte no aplicativo.
                    </Text>

                    <View style={{ height: 40 }} />
                </ScrollView>
            </View>
          </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F0F2F5",
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
  },
  header: {
    alignItems: "center",
    marginBottom: 32,
  },
  logoContainer: {
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1A1D1E",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#6E7687",
    textAlign: "center",
  },
  form: {
    backgroundColor: "#FFF",
    padding: 24,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    gap: 0,
  },
  typeSelector: {
    flexDirection: "row",
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
    padding: 4,
    marginBottom: 20,
  },
  typeSelectorContainer: {
      marginBottom: 24,
  },
  sectionLabel: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 12,
  },
  typeGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      gap: 8,
  },
  typeCard: {
      width: '48%',
      backgroundColor: '#F8F9FA',
      borderRadius: 12,
      padding: 16,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: 'transparent',
      marginBottom: 8,
  },
  typeCardActive: {
      backgroundColor: '#EEF2FF',
      borderColor: colors.primary,
  },
  typeCardText: {
      fontSize: 14,
      fontWeight: '500',
      color: '#6E7687',
      marginTop: 8,
  },
  typeCardTextActive: {
      color: colors.primary,
      fontWeight: '700',
  },
  typeDescription: {
      fontSize: 13,
      color: colors.muted,
      marginTop: 8,
      backgroundColor: '#F3F4F6',
      padding: 12,
      borderRadius: 8,
      fontStyle: 'italic',
  },
  typeOption: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 6,
  },
  typeOptionActive: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  typeText: {
    fontSize: 14,
    color: "#6E7687",
    fontWeight: "500",
  },
  typeTextActive: {
    color: colors.primary,
    fontWeight: "700",
  },
  termsContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 16,
      marginBottom: 8,
  },
  checkbox: {
      marginRight: 12,
  },
  termsText: {
      flex: 1,
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 20,
  },
  linkText: {
      color: colors.primary,
      fontWeight: '600',
      textDecorationLine: 'underline',
  },
  modalSafeArea: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  modalContainer: {
      flex: 1,
      backgroundColor: '#FFF',
  },
  modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: '#F0F0F0',
  },
  closeButton: {
      padding: 8,
      backgroundColor: '#F3F4F6',
      borderRadius: 20,
  },
  modalTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.text,
  },
  modalContent: {
      padding: 24,
  },
  legalText: {
      fontSize: 14,
      color: colors.text,
      lineHeight: 22,
      marginBottom: 16,
  },
  legalTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 24,
      textAlign: 'center',
  },
  legalSection: {
      fontSize: 16,
      fontWeight: 'bold',
      color: colors.primary,
      marginTop: 16,
      marginBottom: 8,
  },
  footerButton: {
    marginTop: 24,
    alignItems: "center",
    padding: 16,
  },
  footerText: {
    color: "#6E7687",
    fontSize: 14,
  },
  footerLink: {
    color: colors.primary,
    fontWeight: "bold",
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#E0E7FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
});

export default RegisterScreen;
