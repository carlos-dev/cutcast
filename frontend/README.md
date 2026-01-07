# CutCast Frontend

Interface moderna e responsiva para o SaaS de processamento de vídeos CutCast.

## 🚀 Stack Tecnológica

- **Framework:** Next.js 15 (App Router)
- **Estilização:** Tailwind CSS com plugin `tailwindcss-animate`
- **Componentes:** Shadcn/UI
- **Gerenciamento de Estado:** TanStack Query v5 (React Query)
- **Animações:** Framer Motion
- **Ícones:** Lucide React
- **HTTP Client:** Axios
- **Supabase:** Preparado para autenticação futura

## ✨ Funcionalidades

### Hero Section
- Design minimalista e moderno
- Título com gradiente
- Descrição atrativa

### Input Híbrido (Tabs)
- **Tab 1 - Colar Link:** Input para URLs de vídeos (YouTube, Vimeo, etc.)
- **Tab 2 - Upload:** Área de Drag & Drop para upload de arquivos
  - Suporta: MP4, MOV, AVI, MKV, WEBM
  - Feedback visual durante drag
  - Animações com Framer Motion

### Feedback Visual
- Card de status do job com polling automático
- Estados: PENDING, PROCESSING, DONE, FAILED
- Barra de progresso durante processamento
- Exibição do vídeo processado quando concluído
- Botão de download

### Polling Inteligente
- React Query faz polling a cada 3 segundos
- Para automaticamente quando o job é concluído ou falha
- Notificações toast para feedback

## 🎨 Design System

- **Tema:** Dark Mode por padrão (Midnight/Zinc)
- **Estética:** Minimalista, bordas sutis, glassmorphism
- **Animações:** Fade-in, scale, e transições suaves
- **Responsivo:** Mobile-first design

## 📦 Instalação

```bash
# Instalar dependências
npm install

# Configurar variáveis de ambiente
cp .env.example .env.local
# Edite .env.local com suas credenciais

# Rodar em desenvolvimento
npm run dev

# Build para produção
npm run build
npm start
```

## 🌍 Variáveis de Ambiente

Crie um arquivo `.env.local` na raiz do projeto:

```env
NEXT_PUBLIC_API_URL=https://cutcast-production.up.railway.app
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

## 📁 Estrutura do Projeto

```
frontend/
├── app/
│   ├── layout.tsx           # Layout raiz com Providers
│   ├── page.tsx             # Página principal
│   └── globals.css          # Estilos globais (dark theme)
├── components/
│   ├── ui/                  # Componentes Shadcn/UI
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── card.tsx
│   │   ├── progress.tsx
│   │   ├── tabs.tsx
│   │   ├── dialog.tsx
│   │   ├── toast.tsx
│   │   └── toaster.tsx
│   ├── file-upload.tsx      # Componente de upload com drag & drop
│   ├── job-status-card.tsx  # Card de status do job
│   └── providers.tsx        # React Query Provider
├── lib/
│   ├── api.ts               # Cliente API (Axios)
│   ├── supabase.ts          # Cliente Supabase
│   └── utils.ts             # Funções utilitárias
├── hooks/
│   └── use-toast.ts         # Hook de toast
└── tailwind.config.ts       # Configuração do Tailwind
```

## 🔄 Fluxo de Dados

1. **Usuário escolhe método de input:**
   - Colar Link: submete URL via `POST /videos`
   - Upload: envia arquivo via `POST /videos` (multipart)

2. **Backend retorna `job_id`**

3. **Frontend inicia polling:**
   - React Query consulta `GET /videos/:job_id` a cada 3 segundos
   - Atualiza UI automaticamente com o status

4. **Quando concluído:**
   - Exibe vídeo processado
   - Mostra botão de download
   - Para o polling

## 🎯 Próximos Passos

- [ ] Implementar autenticação com Supabase
- [ ] Adicionar histórico de jobs
- [ ] Dashboard do usuário
- [ ] Sistema de pagamento
- [ ] Configurações de processamento personalizadas

## 📝 Licença

Proprietary - CutCast 2026
