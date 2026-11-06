# agent-tree

Mod Claude Code : un panneau live qui affiche l'arbre des agents et sous-agents d'une session (orchestrateur, managers, équipes).

Pour chaque agent : statut (en cours, en attente, inactif, terminé, échoué), nom, type, durée, description de la tâche, outil en cours et nombre d'outils utilisés. La liste se rafraîchit chaque seconde.

## Installation

```
/plugin install agent-tree --marketplace Nic0ooo/agent-tree
```

Répondre `y` pour ajouter le marketplace, puis choisir le scope `user` pour l'avoir dans toutes les sessions.

## Utilisation

Le panneau « Agents » s'ouvre au démarrage de session (à partir d'environ 144 colonnes de large). Sinon, tapez `/agent-tree`.
