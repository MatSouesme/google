# 🚀 CSRD Copilot - Hackathon Setup Guide

Ce guide est pour toi, **l'ami qui pull le repo** ! Suis ces étapes pour que tout marche du premier coup sur ta machine.

## 1. Pré-requis
*   **Python 3.10+** installé.
*   **Node.js 18+** installé.
*   **Google Cloud CLI (`gcloud`)** installé.

## 2. Installation

### Backend
Allez à la racine du projet :
```bash
pip install -r backend/api/requirements.txt
```

### Frontend
```bash
cd frontend
npm install
```

## 3. ⚠️ CRITIQUE : Authentification Google (Vertex AI) ⚠️
L'IA (Gemini) tourne sur **Vertex AI** dans le cloud Google. Il faut que ton ordinateur soit authentifié pour avoir le droit de lui parler.

1.  Ouvre ton terminal.
2.  Lance cette commande magique :
    ```bash
    gcloud auth application-default login
    ```
3.  Connecte-toi avec ton compte Google (celui qui a accès au projet GCP `csrd-copilot`).
    *   *Si tu n'as pas accès au projet, demande à l'admin de t'ajouter comme "Editor" ou "Vertex AI User".*

## 4. Lancement

### Terminal 1 (Backend)
À la racine :
```bash
python -m uvicorn backend.api.main:app --host 0.0.0.0 --port 8080 --reload
```

### Terminal 2 (Frontend)
Dans `frontend/` :
```bash
npm run dev
```

Ouvre `http://localhost:5173` et va sur **EcoVadis Audit**. 
Les fichiers PDF de démo sont déjà dans `data/company_docs` (ils ont été commités pour toi).

Bonne chance pour la démo ! 🚀
