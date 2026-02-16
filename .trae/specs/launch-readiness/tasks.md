# Tarefas

- [x] Tarefa 1: Otimizar Carregamento de Auth Mobile (Com Fallback Seguro)
  - [x] SubTarefa 1.1: Implementar salvamento seguro de sessão (`AsyncStorage`) no `AuthContext.tsx`.
  - [x] SubTarefa 1.2: Implementar restauração de sessão com verificação de erro (try/catch) - se falhar, segue fluxo normal de login.
  - [x] SubTarefa 1.3: Adicionar validação em background (`/auth/me`) sem bloquear a tela do usuário.

- [x] Tarefa 2: Implementar Cache do Dashboard (Apenas Leitura)
  - [x] SubTarefa 2.1: Criar lógica para salvar dados do dashboard apenas quando o carregamento for bem sucedido.
  - [x] SubTarefa 2.2: Ler dados salvos ao abrir a tela; se não existirem, mostrar loading normal.
  - [x] SubTarefa 2.3: Implementar persistência do filtro de fornecedor (apenas salva o ID selecionado).

- [x] Tarefa 3: Otimização Segura do Backend
  - [x] SubTarefa 3.1: Mover `ensureAdminUser()` para execução assíncrona após o servidor subir.
  - [x] SubTarefa 3.2: Garantir logs de erro claros caso a inicialização assíncrona falhe.

- [x] Tarefa 4: Geração de Build (APK)
  - [x] SubTarefa 4.1: Incrementar versão no `app.json` (ex: 1.0.0 -> 1.0.1).
  - [x] SubTarefa 4.2: Rodar comando de build local (`eas build --local` ou `gradlew`) para gerar o APK final.
  - [x] SubTarefa 4.3: Validar se o APK instala e abre corretamente.
