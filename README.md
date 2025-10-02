# Muzipics — Version de test (une seule page)

## Lancer en local

1. Inscrivez-vous sur Replicate et obtenez votre token API:
   - https://replicate.com (Sign up)
   - Account → API tokens
   - Copiez votre token (commence par `r8_...`)

2. Copier le fichier d'exemple d'environnement et ajouter votre token:

```bash
cp .env.local.example .env.local
# Éditez .env.local et mettez REPLICATE_API_TOKEN=r8_...
```

3. Installer les dépendances et démarrer:

```bash
npm install
npm run dev
```

4. Ouvrir http://localhost:3000

## Utilisation

- Entrez un prompt (FR ou EN).
- Cliquez "Générer". Une image 1024x1024 est créée via FLUX Schnell (rapide, ~3-5s).

## Avantages FLUX vs DALL-E

- Plus rapide et moins cher
- Politique de contenu plus souple (mieux pour visuels artistiques)
- Excellente qualité pour covers/banners musicaux

## Notes

- Cette version est une démo minimale (pas d'auth, pas de stockage persistant).
- Vous pouvez changer les paramètres dans `app/api/generate/route.ts`.
