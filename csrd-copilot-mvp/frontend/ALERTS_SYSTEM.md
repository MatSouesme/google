# Système d'alertes et de guidance utilisateur

## Vue d'ensemble

Un système d'alertes intelligent a été ajouté pour guider les utilisateurs à travers le workflow CSRD en 3 étapes :

1. **Import de données** (Smart Import)
2. **Configuration des data points** (Data Points)
3. **Génération du rapport final** (Final Report)

## Composants ajoutés

### 1. Composant Alert (`/components/Alert.jsx`)
Composant réutilisable avec 4 types :
- `success` ✅ - Confirmations et succès
- `warning` ⚠️ - Avertissements non critiques
- `error` ❌ - Erreurs bloquantes
- `info` ℹ️ - Informations et conseils

**Props :**
- `type` - Type d'alerte (success/warning/error/info)
- `title` - Titre de l'alerte
- `message` - Message détaillé
- `action` - Objet `{ label, onClick }` pour bouton d'action
- `onClose` - Callback pour fermer l'alerte
- `dismissible` - Alerte fermable ou non (défaut: true)

### 2. Hook useDataStatus (`/hooks/useDataStatus.js`)
Hook personnalisé pour tracker l'état des données :

**État trackés :**
- `hasImportedData` - Données importées ou non
- `hasDataPoints` - Data points configurés ou non
- `lastImportDate` - Date du dernier import

**Méthodes :**
- `markDataImported()` - Marquer les données comme importées
- `updateDataPoints(points)` - Mettre à jour les data points
- `clearDataStatus()` - Réinitialiser le statut

**Stockage :** LocalStorage avec les clés :
- `ecoply_data_imported`
- `ecoply_data_points`
- `ecoply_last_import_date`

## Alertes par page

### Page Home
- **Pas de données** → Info : Guider vers Smart Import
- **Données importées sans data points** → Warning : Recommander configuration
- **Tout configuré** → Success : Féliciter et diriger vers rapport final

### Page Generator
- **Pas de données** → Warning (non-dismissible) : Bloquer jusqu'à import

### Page Data Points
- **Pas de données** → Warning : Recommander d'importer d'abord
- **Données importées, 0 data points configurés** → Info : Encourager à commencer

### Page Final Report
- **Pas de données** → Error (non-dismissible) : Bloquer génération
- **Données sans data points** → Warning : Recommander configuration
- **Données sans brouillons** → Info : Guider vers générateur

### Page Smart Import
- **Première utilisation** → Info : Expliquer le processus
- **Import réussi** → Success : Confirmer et guider vers prochaine étape

## Workflow guidé

```
┌─────────────────┐
│   Smart Import  │ ← Étape 1 : Importer les données
│   📤           │
└────────┬────────┘
         │ ✅ Données importées
         ↓
┌─────────────────┐
│   Data Points   │ ← Étape 2 : Configurer les indicateurs
│   📋           │
└────────┬────────┘
         │ ✅ Data points configurés
         ↓
┌─────────────────┐
│  Final Report   │ ← Étape 3 : Générer le rapport
│   📄           │
└─────────────────┘
```

## Exemples d'utilisation

### Ajouter une alerte simple
```jsx
import Alert from '../components/Alert';

<Alert
  type="info"
  title="Information"
  message="Ceci est un message d'information"
  onClose={() => console.log('Fermé')}
/>
```

### Alerte avec action
```jsx
<Alert
  type="warning"
  title="Action requise"
  message="Vous devez compléter cette étape"
  action={{
    label: "Compléter maintenant",
    onClick: () => navigate('/next-page')
  }}
/>
```

### Utiliser le hook de statut
```jsx
import { useDataStatus } from '../hooks/useDataStatus';

const MyComponent = () => {
  const { hasImportedData, markDataImported } = useDataStatus();
  
  if (!hasImportedData) {
    return <Alert type="warning" message="Importez d'abord vos données" />;
  }
  
  return <div>Contenu...</div>;
};
```

## Personnalisation

### Modifier les couleurs
Les alertes utilisent les variables CSS définies dans `App.css` :
- `--success` et `--success-bg`
- `--warning` et `--warning-bg`
- `--error` et `--error-bg`
- `--accent-primary` pour info

### Ajouter de nouvelles alertes
1. Identifier le point de guidance nécessaire
2. Vérifier l'état avec `useDataStatus`
3. Ajouter le composant `Alert` avec le bon type
4. Configurer l'action pour guider vers la prochaine étape

## Avantages

✅ **Onboarding amélioré** - Les nouveaux utilisateurs comprennent le workflow
✅ **Réduction des erreurs** - Les alertes préviennent les actions invalides
✅ **Guidance contextuelle** - Les utilisateurs savent toujours quoi faire
✅ **Cohérence UX** - Design uniforme sur toute l'application
✅ **Accessibilité** - Icônes et couleurs distinctes pour chaque type
