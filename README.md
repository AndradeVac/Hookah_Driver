# Hookah Driver

Cardápio digital (cliente pede e paga pelo celular via QR Code) e painel de gestão do lounge.

| Parte | Stack | Deploy |
|---|---|---|
| `backend/` | Python 3.12+, FastAPI, SQLAlchemy 2, Alembic, PostgreSQL 13+ | Render (`render.yaml`) |
| `frontend/` | React 19, TypeScript, Vite | Vercel (`frontend/vercel.json`) |
| Pagamentos | Mercado Pago (PIX e Checkout Pro) | webhook em `/payments/mercado-pago/webhook` |

Rotas do frontend: `/cliente` (cardápio público), `/login` e o painel (`/`, `/orders`, ...).

## Rodando localmente

### Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate            # Linux/macOS: source .venv/bin/activate
pip install -r requirements-dev.txt
copy .env.example .env.development   # e preencha DATABASE_URL / JWT_SECRET_KEY
alembic upgrade head                 # cria ou atualiza o schema
python -m scripts.seed_catalog       # cardápio base (idempotente)
python -m scripts.backfill_images    # liga as imagens ao banco
python -m scripts.create_admin --email voce@lounge.com --name "Seu nome"
uvicorn app.main:app --reload --port 8000
```

Documentação interativa: http://localhost:8000/docs (desligada em produção).

### Frontend

```bash
cd frontend
npm install
npm run dev        # http://localhost:5173 — /api é encaminhado para http://127.0.0.1:8000
```

Para apontar o proxy para outra porta: `API_PROXY_TARGET=http://127.0.0.1:8010 npm run dev`.

## Testes e verificação

```bash
cd backend
pytest -m "not integration"   # unitários (nunca acessam rede externa)
pytest -m integration         # ponta a ponta no banco do DATABASE_URL (cria e apaga os próprios dados)

cd ../frontend
npm run lint                  # checagem de tipos
npm run build
```

## Deploy em produção

### API (Render)

O `render.yaml` cria a API e o PostgreSQL. A cada deploy as migrações rodam antes do servidor subir.
Configure no painel da Render:

| Variável | Valor |
|---|---|
| `JWT_SECRET_KEY` | gerada automaticamente (mín. 32 caracteres — a API não sobe sem ela) |
| `FRONTEND_URL` | domínio(s) do frontend, separados por vírgula |
| `APP_BASE_URL` | URL pública da API (`https://...`) |
| `MERCADO_PAGO_ACCESS_TOKEN` / `MERCADO_PAGO_PUBLIC_KEY` | credenciais de produção |
| `MERCADO_PAGO_WEBHOOK_SECRET` | "Assinatura secreta" do webhook no painel do Mercado Pago |

Depois do primeiro deploy, no *Shell* da Render (em `backend/`):

```bash
python -m scripts.seed_catalog
python -m scripts.backfill_images
python -m scripts.create_admin --email voce@lounge.com --name "Seu nome"   # pede a senha
```

No Mercado Pago, cadastre o webhook `https://<sua-api>/payments/mercado-pago/webhook`
(eventos *Pagamentos*) e copie a assinatura secreta para `MERCADO_PAGO_WEBHOOK_SECRET`.

Saúde da API: `GET /health` (verifica o banco; usado pela Render).

### Frontend (Vercel)

- Root directory: `frontend`
- Variável de ambiente: `VITE_API_URL=https://<sua-api>` (sem barra no final)
- `vercel.json` já configura rotas da SPA, cache de assets e cabeçalhos de segurança.

## Imagens

Padrão, nomes e fluxo para adicionar fotos: [`frontend/design/IMAGENS.md`](frontend/design/IMAGENS.md).

## Segurança

- Rotas de clientes, pedidos, relatórios, usuários e auditoria exigem login (ADMIN/OPERATOR).
  Catálogo (`GET /products`, `/categories`, ...) e `/public/*` são públicos para o cardápio.
- Login e rotas públicas têm limite de requisições por IP.
- Webhook do Mercado Pago só é aceito com assinatura HMAC válida; o status do pagamento é sempre
  confirmado consultando a API do Mercado Pago.
- Nunca versione arquivos `.env*` (exceto `.env.example`).
