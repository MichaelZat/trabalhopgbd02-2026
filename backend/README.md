# Backend da bilheteria

API independente em TypeScript, Node.js, Express, Prisma ORM e PostgreSQL.

1. Instale Node.js 22+ e disponibilize PostgreSQL.
2. Copie .env.example para .env e preencha JWT_SECRET com um segredo aleatório de pelo menos 32 caracteres.
3. Configure DATABASE_URL e RESERVATION_TTL_SECONDS.
4. Execute npm ci, npm run db:migrate e npm run build.
5. Provisione o operador com npm run operator (OPERATOR_PASSWORD para uma conta nova).
6. Execute npm run dev ou npm start.

npm start aplica migrations, executa o bootstrap administrativo quando configurado e inicia o código compilado. npm run dev usa o código TypeScript e requer as migrations previamente aplicadas.

A API começa em /api. GET /api/openapi.json entrega a especificação OpenAPI; openapi.yaml é JSON válido, também aceito como YAML.

Controllers tratam transporte; services aplicam as regras; repositories usam Prisma. SQL de locks e CALL é parametrizado. As migrações incluem a trigger e uma procedure separada.

## Testes

Defina TEST_DATABASE_URL para um banco de testes separado, aplique nele npm run db:migrate usando DATABASE_URL correspondente e execute npm test. O teste não usa automaticamente DATABASE_URL de desenvolvimento, para evitar executar a massa de testes por engano no ambiente principal.

O workflow incluído utiliza PostgreSQL 16 real. A documentação do pacote completo contém o DER, casos de uso, matriz de requisitos e preparação AWS.

## Produção

O Dockerfile executa como usuário node. A infraestrutura AWS e seu guia estão no pacote completo entregue. O contêiner aceita DATABASE_URL ou DB_HOST/DB_NAME com DB_CREDENTIALS injetado pelo Secrets Manager, além de JWT_SECRET e prazo de reserva. BOOTSTRAP_OPERATOR_CREDENTIALS é apenas para provisionamento inicial controlado, nunca para cadastro público.

Não há URL de repositório ou de produção pré-preenchida: registre as URLs reais depois de publicar.


## Padronização aplicada

As pastas e as variáveis de ambiente permanecem com seus nomes anteriores. A terceira migração renomeia o banco sem apagar os dados. Consulte ../docs/ALTERACOES_PORTUGUES.md e ../docs/VERIFICACAO.md no pacote completo.

Login: POST /api/autenticacao/entrar. Usuário atual: GET /api/autenticacao/usuario-atual. As demais rotas não foram renomeadas. A adaptação JSON está documentada em openapi.yaml no backend e em src/api.ts no frontend.
