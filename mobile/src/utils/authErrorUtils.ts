import { AxiosError } from 'axios';

export const isTokenExpired = (error: any): boolean => {
  if (!error?.response) return false;
  
  const status = error.response.status;
  const msg = error.response.data?.error || error.response.data?.message || '';

  if (status === 401 || status === 403) {
    if (typeof msg === 'string') {
      const lowerMsg = msg.toLowerCase();
      return (
        lowerMsg.includes('expired') ||
        lowerMsg.includes('invalid token') ||
        lowerMsg.includes('expirada') ||
        lowerMsg.includes('token inválido') ||
        lowerMsg.includes('jwt expired')
      );
    }
  }
  return false;
};

export const isPermissionError = (error: any): boolean => {
  if (!error?.response) return false;
  const status = error.response.status;
  const msg = error.response.data?.error || error.response.data?.message || '';
  
  // Se for 403 e NÃO for token expirado, é permissão
  if (status === 403 && !isTokenExpired(error)) {
    return true;
  }
  
  // Algumas APIs retornam 401 para permissão também, mas geralmente distinguem pela mensagem
  // Assumindo que 401 sem "expired" pode ser credencial inválida (login) ou permissão
  // Mas no contexto de interceptor (já logado), 403 é o padrão para Forbidden
  
  return false;
};
