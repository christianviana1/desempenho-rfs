# Desempenho RFS

Sistema web de gestão de produção diária, metas mensais e ranking de
operadores de vendas de seguros.

## Stack

- Next.js (App Router) + TypeScript strict + Tailwind CSS + shadcn/ui + Recharts
- Prisma ORM + MySQL
- Autenticação passwordless por sessão em cookie HTTP-only (JWT assinado com `jose`)
- Docker multi-stage, pronto para deploy no Coolify

## Desenvolvimento local

1. Instale as dependências:

   ```bash
   npm install
   ```

2. Copie `.env.example` para `.env` e preencha:
   - `DATABASE_URL`: connection string de um MySQL acessível (local ou remoto).
   - `SESSION_SECRET`: string aleatória com pelo menos 32 caracteres.

   Para subir um MySQL local via Docker (opcional):

   ```bash
   docker compose --profile dev up -d mysql
   # DATABASE_URL="mysql://app:app@localhost:3306/desempenho_rfs"
   ```

3. Aplique as migrations e rode o seed:

   ```bash
   npx prisma migrate dev
   npx prisma db seed
   ```

   O seed cria o operador `admin` (perfil ADMIN, sem senha — basta digitar
   `admin` na tela de login) e os tipos de seguro iniciais (Fatura, Cartão
   Protegido, Dados e Bens).

4. Rode o servidor de desenvolvimento:

   ```bash
   npm run dev
   ```

   Acesse http://localhost:3000.

## Migrations

- **Desenvolvimento** (cria uma nova migration a partir de mudanças no
  `schema.prisma` e aplica no banco de dev):

  ```bash
  npx prisma migrate dev --name descricao_da_mudanca
  ```

- **Produção** (aplica migrations já commitadas, sem gerar novas — é o que
  o `docker-entrypoint.sh` executa automaticamente a cada start do container):

  ```bash
  npx prisma migrate deploy
  ```

  Nunca use `prisma migrate dev` em produção: ele pode tentar resetar o
  banco caso detecte divergência de histórico.

- **Seed** (idempotente — pode ser rodado quantas vezes for preciso):

  ```bash
  npx prisma db seed
  ```

## Estrutura do projeto

```
prisma/               schema.prisma, migrations/, seed.ts
src/
  app/                 rotas (App Router) — páginas + API Route Handlers
    admin/              área do administrador
    dashboard/           área do operador
    api/                 endpoints REST internos
  components/
    ui/                  componentes shadcn/ui
    admin/, dashboard/, shared/
  lib/                 sessão, auth, prisma client, erros, utilitários
  services/            regras de negócio (única camada que fala com o Prisma)
  validations/         schemas Zod compartilhados entre frontend e backend
  generated/prisma/    Prisma Client gerado (não versionado)
```

## Decisões de segurança

- **Sessão**: cookie `httpOnly`, `secure` em produção, `sameSite=lax`,
  assinado com HS256 (`SESSION_SECRET`). O backend nunca confia em
  `operadorId` enviado pelo cliente — sempre lê da sessão.
- **Autorização em duas camadas**: `middleware.ts` (Edge) bloqueia
  `/admin/**` para não-admins antes de renderizar qualquer página; cada
  layout e cada Route Handler revalida a sessão/perfil novamente
  (`src/lib/auth.ts`), então uma chamada direta à API sem passar pelo
  middleware também é barrada.
- **Rate limiting** no login: em memória, por IP + login (10 tentativas/5min).
  Suficiente para uma instância única; não introduz Redis para isso.
- **Nunca excluímos operadores ou tipos de seguro fisicamente** —apenas
  desativação (`ativo=false`), preservando o histórico de produção.

## Deploy no Coolify

1. **Criar a aplicação** no Coolify apontando para este repositório Git,
   com "Build Pack" = Dockerfile (ele detecta o `Dockerfile` na raiz).
2. **Variáveis de ambiente** a configurar no Coolify:
   - `DATABASE_URL` — connection string do MySQL já hospedado no Coolify
     (ex.: `mysql://usuario:senha@host-interno:3306/desempenho_rfs`).
   - `SESSION_SECRET` — string aleatória de produção (não reutilize a de
     desenvolvimento). Gere com:
     `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`
   - `NODE_ENV=production` (o Dockerfile já define isso, mas confirme se o
     Coolify não sobrescreve).
3. **Porta**: a aplicação escuta na porta `3000` dentro do container
   (`EXPOSE 3000` no Dockerfile, `PORT=3000`/`HOSTNAME=0.0.0.0`). Configure
   o Coolify para expor essa porta atrás do proxy — não é necessário abrir
   nenhuma porta adicional.
4. **Banco de dados**: use o serviço MySQL que já roda no Coolify. Garanta
   que a aplicação e o banco estejam na mesma rede interna do Coolify (ou
   que o host do banco seja acessível a partir do container da app), e que
   o banco/usuário indicados em `DATABASE_URL` já existam.
5. **Migrations**: rodam automaticamente a cada deploy — o
   `docker-entrypoint.sh` executa `npx prisma migrate deploy` antes de
   iniciar o servidor. Não é necessário nenhum passo manual para isso.
6. **Seed inicial**: rode manualmente uma única vez após o primeiro deploy
   (ele é idempotente, então é seguro rodar de novo se precisar):

   ```bash
   # via terminal do Coolify ou docker exec no container da aplicação
   npx prisma db seed
   ```

7. **Primeiro deploy**: com as variáveis configuradas, clique em Deploy no
   Coolify. Ele fará o build da imagem (`docker build` usando o
   `Dockerfile` multi-stage), subirá o container, que por sua vez aplica as
   migrations e inicia o Next.js. Depois disso, rode o passo 6 (seed) uma
   vez e faça login com `admin`.

## Build e execução via Docker (sem Coolify)

```bash
docker build -t desempenho-rfs .
docker run -p 3000:3000 \
  -e DATABASE_URL="mysql://usuario:senha@host:3306/banco" \
  -e SESSION_SECRET="$(node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))")" \
  desempenho-rfs
```
