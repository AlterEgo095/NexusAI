# NexusAI Workspace — AI Operating System

<p align="center">
  <strong>Plateforme IA de Productivité Ultime</strong><br>
  Chat IA • Recherche Web • Design Studio • Documents • Agents Autonomes • Automatisation • Command Center
</p>

---

## 🚀 Architecture

| Couche | Technologie |
|--------|------------|
| **Frontend** | Next.js 16 (App Router, Turbopack), React 19, TypeScript 5, Tailwind CSS 4, shadcn/ui, Framer Motion |
| **State** | Zustand (client), TanStack Query (server) |
| **Backend** | Next.js API Routes (11 routes) |
| **Database** | Prisma ORM + SQLite (production-ready, migrable to PostgreSQL) |
| **AI SDK** | `z-ai-web-dev-sdk` (LLM, Web Search, Image Generation) |
| **UI** | Glassmorphism, Dark/Light mode, Responsive, PWA-ready |
| **Deploy** | Docker, Standalone output, VPS-ready |

## 📦 Modules (8)

| Module | Fonctionnalités | Backend |
|--------|----------------|---------|
| **Chat IA** | Conversations multiples, Markdown, coloration syntaxique, persistance DB | ✅ CRUD API |
| **Recherche Web** | Recherche IA avec résumé, filtres par source, historique | ✅ Web Search SDK + DB |
| **Design Studio** | Génération d'images, 6 styles, 4 tailles, galerie, téléchargement | ✅ Image Gen SDK + DB |
| **Documents** | Éditeur Markdown, 6 templates, génération IA, export HTML/MD/TXT | ✅ CRUD API + AI |
| **Agents IA** | 6 agents pré-configurés, création personnalisée, **10 outils réels** | ✅ Autonomous Tool Execution |
| **Automatisation** | Workflow visuel drag-and-drop, **exécution réelle** des workflows | ✅ Workflow Engine |
| **Command Center** | Statistiques réelles, activité en direct, tendance 7 jours, statut agents | ✅ Stats API |
| **Home** | Dashboard, quick actions, stats live, activité récente | ✅ Stats API |

## 🛠️ Outils d'Agents (10 outils réels)

| Outil | Description |
|-------|-------------|
| `web_search` | Recherche web via SDK |
| `web_reader` | Lecture de pages web |
| `code_generation` | Génération de code via LLM |
| `code_review` | Review de code via LLM |
| `writing` | Rédaction de contenu via LLM |
| `editing` | Édition/amélioration de texte via LLM |
| `data_analysis` | Analyse de données via LLM |
| `visualization` | Recommandations de visualisation via LLM |
| `image_generation` | Génération d'images via SDK |
| `summarization` | Résumé de textes via LLM |

Les agents décident **autonomément** quels outils utiliser via un LLM de planification.

## 🗄️ Schéma DB (11 modèles)

`User` • `Conversation` • `Message` • `CustomAgent` • `AgentExecution` • `Document` • `Automation` • `WorkflowExecution` • `SearchHistory` • `ImageGeneration` • `ActivityLog` • `UsageStats`

## 🚀 Installation & Déploiement

### Développement
```bash
bun install
bun run db:push
bun run dev
```

### Docker (VPS)
```bash
docker compose up -d --build
```

### Build Production
```bash
bun run build
NODE_ENV=production bun .next/standalone/server.js
```

## 📊 API Routes

| Route | Methods | Description |
|-------|---------|-------------|
| `/api/chat` | GET, POST, PUT, DELETE | Conversations + Chat LLM |
| `/api/search` | GET, POST | Recherche web + historique |
| `/api/image` | GET, POST | Génération d'images |
| `/api/agents` | GET, POST | Agents CRUD + exécution avec outils |
| `/api/agents/[id]` | PUT, DELETE | Agent update/delete |
| `/api/documents` | GET, POST | Documents CRUD + génération IA |
| `/api/documents/[id]` | GET, PUT, DELETE | Document update/delete |
| `/api/automations` | GET, POST | Workflows CRUD + exécution |
| `/api/automations/[id]` | PUT, DELETE | Workflow update/delete |
| `/api/activity` | GET | Journal d'activité |
| `/api/stats` | GET | Statistiques réelles + tendance 7j |

## 📄 Licence

MIT