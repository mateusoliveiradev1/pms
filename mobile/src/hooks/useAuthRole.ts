import { useAuth } from '../context/AuthContext';

export function useAuthRole() {
  const { 
    user, 
    role, 
    onboardingStatus, 
    activeAccountId, 
    activeSupplierId, 
    accountType 
  } = useAuth();

  // Role booleans
  const isSystemAdmin = role === 'SYSTEM_ADMIN';
  const isAccountAdmin = role === 'ACCOUNT_ADMIN';
  const isSupplierAdmin = role === 'SUPPLIER_ADMIN';
  const isSupplierUser = role === 'SUPPLIER_USER';

  // Onboarding Logic
  const requiresOnboarding = onboardingStatus === 'PENDING';

  // Supplier Pending Approval
  // Currently we treat everyone as active if they have passed onboarding.
  // Verification status handling can be added later if strict blocking is needed.
  const isSupplierPending = false;

  return {
    role,
    isSystemAdmin,
    isAccountAdmin,
    isSupplierAdmin,
    isSupplierUser,
    requiresOnboarding,
    isSupplierPending,
    accountType: accountType as 'INDIVIDUAL' | 'COMPANY' | undefined,
    onboardingStatus,
    supplierId: activeSupplierId,
    activeAccountId,
  };
}
