<div align="center">

# 🌌 NexusAI — AI Workspace

### Plateforme IA de Productivité Ultime

**Un seul workspace pour remplacer ChatGPT, Perplexity, Gamma, Canva, Notion AI, et plus encore.**

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-38bdf8?logo=tailwindcss)](https://tailwindcss.com/)
[![shadcn/ui](https://img.shields.io/badge/shadcn%2Fui-latest-black)](https://ui.shadcn.com/)
[![Prisma](https://img.shields.io/badge/Prisma-SQLite-2d3748?logo=prisma)](https://prisma.io/)
[![Framer Motion](https://img.shields.io/badge/Framer_Motion-12-ff69b4?logo=framer)](https://motion.dev/)

<img src="https://img.shields.io/badge/License-MIT-green" alt="License"/>

</div>

---

## 🎯 Vue d'ensemble

NexusAI est un **système d'exploitation IA** complet — un workspace unifié qui rassemble tous vos outils de productivité IA en une seule interface. Conçu avec une esthétique glassmorphism, il offre une expérience fluide et professionnelle sur tous les écrans.

## ✨ Fonctionnalités

### 🏠 Home — Dashboard
- Vue d'ensemble avec statistiques en temps réel
- Actions rapides vers tous les modules
- Sparklines animées et activité récente
- Statuts des agents actifs

### 💬 Chat IA — Assistant Conversationnel
- Interface de chat multi-conversations style ChatGPT/Claude
- Rendu Markdown complet (titres, listes, tableaux, blockquotes)
- Coloration syntaxique du code avec bouton copier (Prism + OneDark)
- Indicateur de saisie animé (3 points)
- Historique des conversations avec suppression
- Suggestions de démarrage rapides
- Auto-resize du textarea, raccourcis clavier (Enter / Shift+Enter)
- Panneau latéral redimensionnable

### 🔍 Recherche Web IA — Moteur de Recherche Intelligent
- Recherche web avec filtres (Actualités, GitHub, Wikipedia, YouTube, Académique)
- Résumé IA automatique des résultats avec citations numérotées [1], [2]...
- Fiches de résultats avec favicon, domaine, extrait, date
- Historique des recherches dans un panneau latéral
- État d'accueil avec suggestions populaires
- Skeleton loading pendant la recherche

### 🎨 Design Studio — Générateur d'Images IA
- Génération d'images à partir de prompts textuels
- 6 styles prédéfinis (Photoréaliste, Illustration, Art numérique, 3D Render, Minimaliste, Cinéma)
- 4 formats (1:1, 16:9, 9:16, 4:3)
- Galerie avec grille de miniatures
- Prévisualisation plein écran avec modal
- Téléchargement et suppression d'images
- Barre de progression animée
- Prompts d'exemple thématiques

### 📝 Documents — Studio de Rédaction
- Éditeur Markdown/HTML avec prévisualisation live
- Système de templates (Rapport, Article, Lettre, Documentation technique)
- Génération de documents par IA
- Gestion de documents (créer, éditer, supprimer)
- Statuts (brouillon / finalisé)
- Split-view éditeur / aperçu

### 🤖 Agents IA — Constructeur d'Agents
- Création d'agents personnalisés avec système de prompts
- 4 agents pré-configurés (Research, Coding, Content, Data)
- Sélecteur d'avatar (10 emojis)
- Choix d'outils (Recherche Web, Code, Rédaction, Analyse, Images, Édition)
- Chat intégré par agent avec interface dédiée
- Grille de cartes avec statuts (Inactif / Actif / Erreur)
- Dialogue de confirmation pour la suppression

### ⚡ Automatisation — Moteur de Workflows
- Éditeur visuel de workflows
- Templates prédéfinis (Surveillance Web, Pipeline Contenu, Tri Email)
- Nœuds drag-and-drop (Trigger, Action, Condition, Output)
- Activation/désactivation de workflows
- Vue détaillée des workflows

### 📡 Command Center — Centre de Contrôle
- Tableau de bord de monitoring en temps réel
- 4 cartes statistiques (Requêtes IA, Coûts, Agents Actifs, Uptime)
- Journal d'activité avec icônes par type
- Statut des agents avec boutons Démarrer/Arrêter
- Ressources système (CPU, RAM, Stockage) avec barres animées
- Graphique d'utilisation API sur 7 jours

## 🏗️ Architecture

```
src/
├── app/
│   ├── layout.tsx              # Layout racine (ThemeProvider, fonts, Toaster)
│   ├── page.tsx                # Page principale (workspace router)
│   ├── globals.css             # Variables CSS, glassmorphism, animations
│   └── api/
│       ├── chat/route.ts       # LLM Chat (z-ai-web-dev-sdk)
│       ├── search/route.ts     # Web Search + Résumé IA
│       ├── image/route.ts      # Génération d'images
│       └── agents/route.ts     # Gestion des agents
├── components/
│   ├── modules/                # 8 modules de l'application
│   │   ├── home-module.tsx
│   │   ├── chat-module.tsx
│   │   ├── search-module.tsx
│   │   ├── design-module.tsx
│   │   ├── documents-module.tsx
│   │   ├── agents-module.tsx
│   │   ├── automation-module.tsx
│   │   └── command-center-module.tsx
│   ├── workspace/              # Composants du workspace
│   │   ├── sidebar.tsx         # Sidebar glassmorphism animée
│   │   ├── theme-toggle.tsx    # Bascule dark/light
│   │   └── command-palette.tsx # Palette de commandes (Ctrl+K)
│   └── ui/                     # Composants shadcn/ui
├── store/
│   └── workspace-store.ts      # État global Zustand
├── hooks/
│   └── use-mobile.ts           # Hook de détection mobile
└── lib/
    ├── db.ts                   # Client Prisma
    └── utils.ts                # Utilitaires (cn, etc.)
```

## 🛠️ Stack Technique

| Catégorie | Technologie |
|-----------|-------------|
| **Framework** | Next.js 16 (App Router, Turbopack) |
| **Langage** | TypeScript 5 |
| **UI** | shadcn/ui (New York) + Tailwind CSS 4 |
| **Animations** | Framer Motion 12 |
| **État client** | Zustand 5 |
| **Base de données** | Prisma ORM + SQLite |
| **Markdown** | react-markdown + remark-gfm |
| **Code Highlight** | react-syntax-highlighter (Prism) |
| **Thème** | next-themes (dark/light) |
| **Icons** | Lucide React |
| **Drag & Drop** | dnd-kit |
| **AI SDK** | z-ai-web-dev-sdk |

## 🚀 Installation

### Prérequis
- Node.js 18+ ou Bun
- Un compte [z-ai-web-dev-sdk](https://z-ai.dev) pour les fonctionnalités IA

### 1. Cloner le dépôt

```bash
git clone https://github.com/AlterEgo095/NexusAI.git
cd NexusAI
```

### 2. Installer les dépendances

```bash
bun install
# ou
npm install
```

### 3. Configurer la base de données

```bash
bun run db:push
# ou
npx prisma db push
```

### 4. Lancer le serveur de développement

```bash
bun run dev
# ou
npm run dev
```

L'application est accessible sur [http://localhost:3000](http://localhost:3000).

## 🎨 Design

### Glassmorphism
L'interface utilise 3 niveaux de glassmorphism via des classes CSS personnalisées :
- `.glass` — Flou léger (12px), saturation 150%
- `.glass-strong` — Flou fort (40px), saturation 200%
- `.glass-subtle` — Flou doux, bordure subtile

### Animations
- Transitions de modules avec Framer Motion (AnimatePresence)
- Sidebar avec animation spring sur le collapse/expand
- Sparklines SVG animées sur le dashboard
- Indicateur de saisie avec animation de points
- Cartes avec effet hover (translateY + shadow)
- Barres de progression animées

### Thème
- Mode sombre par défaut
- Basculé via next-themes (attribute="class")
- Variables CSS OKLCH pour des couleurs cohérentes
- Gradient de fond animé (4 couleurs, 15s cycle)

## ⌨️ Raccourcis

| Raccourci | Action |
|-----------|--------|
| `Ctrl+K` / `⌘+K` | Ouvrir la palette de commandes |
| `Enter` | Envoyer un message (Chat) |
| `Shift+Enter` | Nouvelle ligne (Chat) |
| `Ctrl+Enter` / `⌘+Enter` | Générer une image (Design Studio) |

## 📱 Responsive

- **Mobile** : Sidebar en Sheet (drawer), mise en page plein écran
- **Tablette** : Grilles adaptatives (2 colonnes)
- **Desktop** : Sidebar fixe avec collapse, multi-colonnes

## 🗄️ Schéma de Données

<details>
<summary>Modèles Prisma (cliquer pour déplier)</summary>

```
User           → Conversations, CustomAgents, Documents, Automations
Conversation   → Messages
Message        → (appartient à Conversation)
CustomAgent    → (appartient à User)
Document       → (appartient à User)
Automation     → (appartient à User)
SearchHistory  → (standalone)
ImageGeneration→ (standalone)
ActivityLog    → (standalone)
```

</details>

## 📄 Licence

Ce projet est sous licence **MIT**. Voir le fichier [LICENSE](LICENSE) pour plus de détails.

---

<div align="center">

**NexusAI** — Votre espace de travail IA tout-en-un

Construit avec ❤️ par [AlterEgo095](https://github.com/AlterEgo095)

</div>