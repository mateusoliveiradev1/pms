import dotenv from 'dotenv';
dotenv.config();

async function testLoginProduction() {
  console.log('🚀 INICIANDO TESTE DE LOGIN EM PRODUÇÃO (RENDER)');
  console.log('------------------------------------------------');

  // 1. Ler DATABASE_URL (Requisito do usuário)
  const dbUrl = process.env.DATABASE_URL;
  if (dbUrl) {
    console.log(`ℹ️  Ambiente carregado. DATABASE_URL encontrada (Length: ${dbUrl.length})`);
  } else {
    console.warn('⚠️  DATABASE_URL não encontrada no .env (mas o teste HTTP pode funcionar se a URL da API for fixa)');
  }

  const API_URL = 'https://pms-ops-backend.onrender.com/api/auth/login';
  const CREDENTIALS = {
    email: 'admin@pms.com',
    password: 'AdminPassword123!' // Senha encontrada em scripts/create_admin.ts
  };

  console.log(`📡 Alvo: ${API_URL}`);
  console.log(`👤 Usuário: ${CREDENTIALS.email}`);
  console.log('⏳ Enviando requisição...');

  try {
    const start = Date.now();
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(CREDENTIALS)
    });
    const duration = Date.now() - start;

    console.log(`\n⏱️  Duração: ${duration}ms`);
    console.log(`📊 HTTP Status: ${response.status} ${response.statusText}`);

    const data = await response.json();
    
    console.log('\n📦 RESPOSTA JSON COMPLETA:');
    console.log(JSON.stringify(data, null, 2));

    if (response.ok) {
        console.log('\n✅ SUCESSO: Login realizado e token recebido!');
        if (data.token || data.session || data.accessToken) {
            console.log('🔑 Token detectado na resposta.');
        } else {
            console.warn('⚠️  Aviso: HTTP 200 mas campo de token não óbvio no JSON.');
        }
    } else {
        console.log('\n❌ FALHA: Login recusado pelo servidor.');
        console.log('🔍 Diagnóstico possível:');
        if (response.status === 401 || response.status === 403) console.log('   -> Credenciais inválidas ou usuário não confirmado.');
        if (response.status === 500) console.log('   -> Erro interno (Banco de dados, Prisma ou Supabase desconectado).');
        if (response.status === 404) console.log('   -> Rota não encontrada (Verifique a URL).');
    }

  } catch (error: any) {
    console.error('\n💥 ERRO DE CONEXÃO/EXECUÇÃO:');
    console.error(error);
    if (error.cause) console.error('Causa:', error.cause);
  }
}

testLoginProduction();
