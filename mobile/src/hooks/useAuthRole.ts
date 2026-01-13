import { useAuth } from '../context/AuthContext';

export function useAuthRole() {
  const { user, account, supplier } = useAuth();

  const role = user?.role;

  // Role booleans
  const isSystemAdmin = role === 'SYSTEM_ADMIN';
  const isAccountAdmin = role === 'ACCOUNT_ADMIN' || role === 'ADMIN' || role === 'OWNER'; // Fallback for legacy ADMIN and OWNER
  const isSupplierAdmin = role === 'SUPPLIER_ADMIN';
  const isSupplierUser = role === 'SUPPLIER_USER';

  // Specific Logic for Navigation
  
  // SUPPLIER_USER: Pedidos, Produtos, Perfil
  // SUPPLIER_ADMIN: Pedidos, Produtos, Financeiro, Métricas, Perfil
  // ACCOUNT_ADMIN: Pedidos, Suppliers, Financeiro, Métricas, Configurações
  // SYSTEM_ADMIN: Visão Global, Contas, Suppliers, Financeiro Global, Sistema

  // Onboarding Logic
  // If Company and onboardingStatus is REQUIRES_SUPPLIER, redirect to Create First Supplier
  const requiresOnboarding = 
    account?.type === 'COMPANY' && 
    account?.onboardingStatus === 'REQUIRES_SUPPLIER' &&
    (isAccountAdmin);

  // Supplier Pending Approval
  const isSupplierPending = (isSupplierUser || isSupplierAdmin) && 
    (supplier?.status === 'PENDING' || supplier?.status === 'PENDING_APPROVAL' || supplier?.status === 'INACTIVE');

  return {
    role,
    isSystemAdmin,
    isAccountAdmin,
    isSupplierAdmin,
    isSupplierUser,
    requiresOnboarding,
    isSupplierPending,
    accountType: account?.type,
    onboardingStatus: account?.onboardingStatus,
    supplierId: supplier?.id,
  };
}
