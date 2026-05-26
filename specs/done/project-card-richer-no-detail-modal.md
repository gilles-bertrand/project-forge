# Project card enrichie + suppression de ProjectDetailModal

## Contexte / objectif

`ProjectDetailModal` actuelle est un cul-de-sac UX : elle s'ouvre quand on clique n'importe où sur la card, mais elle n'affiche que des valeurs placeholder (`0/0` partout, "Liste des membres disponible quand la lib P5+ sera prête.", etc.). Pour un utilisateur, c'est juste une étape inutile avant d'arriver au Kanban.

Décisions retenues (via clarification utilisateur) :

1. **Clic sur card → transition directe vers `dashboard.kanban`** (avec `setCurrent(projectId)`). Plus de modale intermédiaire.
2. **Enrichir la card** avec les contenus utiles qui étaient dans la modale :
   - Conserver les 2 progress bars existantes (`User Stories`, `Sprint en cours`)
   - **Ajouter 4 mini-compteurs** : Épiques / User Stories / Tâches / Sprints (placeholders `0/0` pour l'instant, alimentables plus tard depuis l'API)
3. **Avatars membres** : conserver `MemberAvatarStack` mais ajouter un **tooltip daisyui** (`class="tooltip" data-tip="Prénom Nom"`) qui affiche le nom complet au hover/focus.
4. **Supprimer complètement** `ProjectDetailModal` + son test d'intégration + toutes les références (template parent, e2e).

---

## Architectural Context

- **Communautés touchées** : `projects-front` (composants card / detail-modal / template).
- **God nodes affectés** : `ProjectCard` (composant central de la grille, mounted N fois en parallèle). Suppression de `ProjectDetailModal` (déjà isolé).
- **Cross-cutting contracts** :
  - `@onOpen` arg sur `ProjectCard` — actuellement utilisé pour ouvrir la modale. Signature à revoir.
  - Pas de schéma backend impacté.

---

## État actuel (vérifié)

### `ProjectCard` (`@libs/projects-front/src/components/project-card.gts`)

Affiche déjà :
- ✅ Avatar (initials) + nom + StatusBadge
- ✅ Description (line-clamp-2)
- ✅ 2 progress bars : `userStoriesDone/Total` + `sprintDone/Total`
- ✅ Date de création
- ✅ `MemberAvatarStack` (3 avatars max + "+N")
- ✅ `responsibleShortName`
- ✅ `<ProjectActionBar>` (backlog/kanban/sprints)
- ✅ Boutons edit / delete

Comportement actuel :
- `role="button" tabindex="0"` + `{{on "click" (fn @onOpen @project)}}` ⇒ ouvre la modale détail.

### `ProjectDetailModal` (`@libs/projects-front/src/components/project-detail-modal.gts`)

Contenu unique (placeholder) :
- Header : avatar + nom + StatusBadge + `responsible: {name}` (placeholder)
- Description (déjà sur la card)
- Section Progression : 1 progress bar US (déjà sur la card)
- Section Statistiques : 4 cards (Épiques / User Stories / Tâches / Sprints) — **placeholders `0/0`** ← à rapatrier sur la card
- Section Équipe : `teamPlaceholder` → "Liste des membres disponible quand la lib P5+ sera prête." ← à supprimer
- Footer : boutons Supprimer / Fermer / Modifier / Voir le Kanban + `ProjectActionBar`

**Constat** : la modale n'apporte rien que la card n'apporte déjà, sauf les 4 mini-compteurs. Et même ceux-ci sont des placeholders.

### Références à supprimer

- `@libs/projects-front/src/components/project-detail-modal.gts` (fichier)
- `@libs/projects-front/tests/integration/project-detail-modal-test.gts` (fichier)
- `@libs/projects-front/src/templates/dashboard/projects.gts` :
  - Import `ProjectDetailModal`
  - `@tracked detailProject: Project | null`
  - `@action openDetail(p: Project)` (sera remplacé par une nouvelle action `goToKanban(p)`)
  - `@action closeDetail()` (devient inutile)
  - `requestDelete` clear `detailProject` — devient `requestDelete` simple
  - Render `<ProjectDetailModal ...>` dans le template
  - Passer `@onOpen={{this.openDetail}}` → `@onOpen={{this.goToKanban}}` (ou renommer)
- `@apps/e2e/tests/uat/project-lifecycle.spec.ts` : sélecteur `data-test-project-detail-modal` (vérifier ligne 37+)
- `@libs/projects-front/tests/integration/project-card-test.gts` : vérifier qu'aucune assertion ne dépend de la modale détail
- Clés i18n devenues mortes :
  - `projects.modal.detail.*` (closeAria, responsible, description, progress, userStoriesCompleted, userStoriesRatio, stats.*, team, teamPlaceholder, edit, delete, close, viewKanban) dans `@apps/front/translations/projects/{fr-fr,en-us}.yaml` + `tests/app.ts`

---

## Phase 1 — Enrichir ProjectCard avec les 4 mini-compteurs

### Étapes

1. Dans `project-card.gts`, ajouter des getters / props pour les 4 compteurs (placeholders `0/0` initialement) :
   ```typescript
   // class fields (peuvent devenir @tracked + chargés via service plus tard)
   epicsDone = 0;
   epicsTotal = 0;
   userStoriesCount = 0;
   tasksDone = 0;
   tasksTotal = 0;
   sprintsActive = 0;
   sprintsTotal = 0;
   ```

   Note : on évite de dupliquer `userStoriesDone/Total` qui existe déjà sur la card sous forme de progress bar — le mini-compteur "US" affiche le total brut.

2. **Décision implémentation** : créer un sous-composant `ProjectStatsRow` (`src/components/project-stats-row.gts`) pour factoriser le rendu des 4 chips, **OU** inliner dans `project-card.gts` ?
   - **Recommandation** : inline. C'est ≤ 30 lignes de markup, pas réutilisé ailleurs, KISS.

3. Markup à insérer dans le template de `ProjectCard`, entre la section "Sprint en cours" et la section "Créé le ..." :
   ```gts
   <div class="grid grid-cols-4 gap-1 mt-1">
     <div class="bg-base-100 rounded p-1.5 text-center">
       <div class="text-[10px] opacity-70 text-secondary">{{t "projects.card.epicsLabel"}}</div>
       <div class="text-sm font-bold">{{this.epicsDone}}/{{this.epicsTotal}}</div>
     </div>
     <div class="bg-base-100 rounded p-1.5 text-center">
       <div class="text-[10px] opacity-70 text-primary">{{t "projects.card.userStoriesLabel"}}</div>
       <div class="text-sm font-bold">{{this.userStoriesCount}}</div>
     </div>
     <div class="bg-base-100 rounded p-1.5 text-center">
       <div class="text-[10px] opacity-70 text-info">{{t "projects.card.tasksLabel"}}</div>
       <div class="text-sm font-bold">{{this.tasksDone}}/{{this.tasksTotal}}</div>
     </div>
     <div class="bg-base-100 rounded p-1.5 text-center">
       <div class="text-[10px] opacity-70 text-accent">{{t "projects.card.sprintsLabel"}}</div>
       <div class="text-sm font-bold">{{this.sprintsActive}}/{{this.sprintsTotal}}</div>
     </div>
   </div>
   ```

4. **i18n** : ajouter dans `@apps/front/translations/projects/{fr-fr,en-us}.yaml` (section `card:`)
   ```yaml
   card:
     ...existing...
     epicsLabel: 'Épiques'       # EN: 'Epics'
     userStoriesLabel: 'US'      # EN: 'US' (court pour tenir dans la mini-card)
     tasksLabel: 'Tâches'        # EN: 'Tasks'
     sprintsLabel: 'Sprints'     # EN: 'Sprints'
   ```
   Et dans `tests/app.ts` (TRANSLATIONS_FR + TRANSLATIONS_EN).

### Critères
- 4 mini-cards visibles entre les progress bars et la date.
- Couleurs cohérentes avec la palette (secondary/primary/info/accent — mêmes couleurs que la modale supprimée).
- Pas de cassure responsive (la card doit rester lisible en `md:` 2 colonnes et `lg:` 3 colonnes).

---

## Phase 2 — Tooltip nom au hover sur les avatars

### Étapes

1. Modifier `MemberAvatarStack` (`@libs/projects-front/src/components/member-avatar-stack.gts`) pour wrapper chaque avatar dans un container daisyui tooltip :
   ```gts
   {{#each this.visible as |m|}}
     <div class="tooltip" data-tip="{{m.firstName}} {{m.lastName}}">
       <div class="avatar avatar-placeholder">
         <div class="w-7 rounded-full ring-2 ring-base-200 {{this.colorClass m.id}}">
           <span class="text-xs font-semibold">{{this.initials m}}</span>
         </div>
       </div>
     </div>
   {{/each}}
   {{#if this.extra}}
     <div class="tooltip" data-tip="{{this.extra}} {{t "projects.card.moreMembers"}}">
       <div class="avatar avatar-placeholder">
         <div class="bg-neutral text-neutral-content w-7 rounded-full ring-2 ring-base-200">
           <span class="text-xs">+{{this.extra}}</span>
         </div>
       </div>
     </div>
   {{/if}}
   ```

2. **Style daisyui** : par défaut `.tooltip` affiche le tip au hover. Optionnel : `tooltip-top` ou `tooltip-bottom` pour forcer la direction (recommandé `tooltip-top` car les avatars sont en bas de card).

3. **i18n** :
   ```yaml
   card:
     moreMembers: 'membres supplémentaires'    # EN: 'more members'
   ```

4. **Compatibilité** : daisyui `.tooltip` est déjà chargé via `@plugin "daisyui"` dans `app.css`. Pas d'import supplémentaire.

5. **Note** : injecter `IntlService` dans `MemberAvatarStack` si le composant n'y a pas accès — actuellement il n'a aucun service. Alternative simple : passer le label via `@moreLabel` arg depuis ProjectCard, ce qui évite la dépendance i18n dans le composant générique.
   - **Décision** : passer via `@moreLabel` arg. `MemberAvatarStack` reste pur.

### Critères
- Hover sur un avatar affiche le nom dans une bulle daisyui.
- Focus clavier (Tab) déclenche le même tooltip.
- L'avatar "+N" affiche aussi un tip ("N membres supplémentaires").

---

## Phase 3 — Click card → Kanban (suppression du `@onOpen` → modale détail)

### Étapes

1. **`ProjectCard`** : retirer l'effet "ouvre la modale" et remplacer par une transition vers le kanban.
   - Modifier la signature : renommer `onOpen` en `onKanbanClick` (plus explicite) OU garder `onOpen` et changer son contrat.
   - **Recommandation** : renommer en `onActivate` (sémantique neutre, le parent décide quelle route).
   - Conserver `role="button"` + `tabindex="0"` + handler clavier (Enter/Espace) pour l'accessibilité.

   ```typescript
   interface ProjectCardSignature {
     Args: {
       project: Project;
       members?: MemberLite[];
       responsibleShortName?: string;
       onActivate: (project: Project) => void;   // renamed from onOpen
       onEdit?: (project: Project) => void;
       onDelete?: (project: Project) => void;
     };
     Element: HTMLDivElement;
   }
   ```

   ```gts
   <div
     role="button"
     tabindex="0"
     class="card bg-base-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
     {{on "click" (fn @onActivate @project)}}
     {{on "keydown" this.onKeydown}}
     data-test-project-card
     ...attributes
   >
   ```

   Avec `onKeydown` géré :
   ```typescript
   @action onKeydown(e: KeyboardEvent) {
     if (e.key === 'Enter' || e.key === ' ') {
       e.preventDefault();
       this.args.onActivate(this.args.project);
     }
   }
   ```

2. **`DashboardProjectsTemplate`** (`templates/dashboard/projects.gts`) :
   - Supprimer `@tracked detailProject`, `openDetail`, `closeDetail`.
   - Ajouter :
     ```typescript
     @action goToKanban(project: Project) {
       if (project.id) {
         this.currentProject.setCurrent(project.id);
         void this.router.transitionTo('dashboard.kanban');
       }
     }
     ```
   - Passer `@onActivate={{this.goToKanban}}` à `<ProjectCard>` et `<ProjectsTable>` (`rowClick`).
   - Pour `ProjectsTable`, renommer `@onOpen` en `@onActivate` aussi (cohérence).

3. **`ProjectsTable`** : le `tableParams.rowClick` doit appeler `args.onActivate` au lieu de `args.onOpen`.

### Critères
- Click n'importe où sur la card (sauf boutons) ⇒ va au `/dashboard/kanban` avec le bon `currentProject` set.
- Enter/Espace sur card focusée ⇒ même comportement.
- Les boutons (ActionBar, edit, delete) gardent leur `stopPropagation` pour ne pas déclencher la transition kanban.
- Click sur ligne TpkTable (mode liste) ⇒ même transition.

---

## Phase 4 — Supprimer ProjectDetailModal et ses traces

### Étapes

1. **Supprimer les fichiers** :
   - `rm @libs/projects-front/src/components/project-detail-modal.gts`
   - `rm @libs/projects-front/tests/integration/project-detail-modal-test.gts`

2. **Nettoyer les références** :
   - `@libs/projects-front/src/templates/dashboard/projects.gts` :
     - Retirer `import ProjectDetailModal from '../../components/project-detail-modal.gts';`
     - Retirer le bloc `{{#if this.detailProject}}<ProjectDetailModal ... />{{/if}}`
   - `@apps/e2e/tests/uat/project-lifecycle.spec.ts` : vérifier l'usage de `data-test-project-detail-modal` / `data-test-project-detail-edit` / `data-test-project-detail-delete`. Retirer ou adapter ces assertions (typiquement remplacer par un check que `/dashboard/kanban` est bien atteint).

3. **Nettoyer les traductions devenues mortes** :
   - `@apps/front/translations/projects/fr-fr.yaml` : supprimer toute la sous-section `modal.detail:` (closeAria, responsible, description, progress, userStoriesCompleted, userStoriesRatio, stats.title, stats.epics, stats.userStories, stats.tasks, stats.sprints, stats.hint, team, teamPlaceholder, edit, delete, close, viewKanban). NB : la clé `modal.edit:` reste utilisée par ProjectFormModal.
   - Idem pour `en-us.yaml`.
   - `@libs/projects-front/tests/app.ts` (TRANSLATIONS_FR / TRANSLATIONS_EN) : supprimer la sous-section `modal.detail:`.

4. **Vérifier les tests d'intégration restants** :
   - `project-card-test.gts` : il rend `<ProjectCard @onOpen={{onOpen}} />`. Renommer en `@onActivate={{onActivate}}` et vérifier que toute assertion clic-card est cohérente.
   - `project-form-modal-test.gts` : indépendant, pas d'impact.

### Critères
- `pnpm build` projects-front clean.
- `pnpm test` projects-front : tous les fichiers passent (le test de detail-modal a été supprimé).
- `pnpm turbo lint` clean sur l'ensemble (pas d'imports orphelins).
- Aucun `grep -r "ProjectDetailModal\|project-detail-modal\|data-test-project-detail"` dans le repo (hors `specs/done/`).

---

## Phase 5 — Validation E2E manuelle

1. Lancer l'app, se connecter.
2. Aller sur `/dashboard/projects`.
3. Vérifier :
   - Chaque card affiche les 2 progress bars existantes PLUS les 4 mini-compteurs (placeholders 0/0).
   - Hover sur un avatar membre affiche le nom complet en tooltip.
   - Click sur le corps de la card ⇒ navigation vers `/dashboard/kanban`, le `localStorage` `sprintforge:current-project` contient bien l'id cliqué.
   - Click sur les boutons (Backlog/Kanban/Sprints/Modifier/Supprimer) ⇒ comportement attendu (pas de navigation kanban parasite).
   - Bascule en mode Liste (TpkTable) : click sur ligne ⇒ même comportement (kanban).
4. Pas de modale détail ouverte nulle part.

---

## Stratégie de tests d'intégration (bloquant `done/`)

| Fichier | Couverture |
|---|---|
| `@libs/projects-front/tests/integration/project-card-test.gts` | (mis à jour) `@onActivate` arg, présence des 4 mini-compteurs, présence des tooltips daisyui (`.tooltip` + `data-tip`), pas de référence aux clés `modal.detail.*` |
| `@libs/projects-front/tests/integration/project-detail-modal-test.gts` | (SUPPRIMÉ) |
| `@libs/projects-front/tests/integration/projects-template-test.gts` (si existe) | Adapter pour `@onActivate` au lieu de `@onOpen` |
| `@libs/projects-front/tests/integration/project-action-bar-test.gts` | Inchangé |
| `@libs/projects-front/tests/integration/project-form-modal-test.gts` | Inchangé |

**Nouveau test à ajouter** dans `project-card-test.gts` :
- "Click on card body fires onActivate with the project"
- "Pressing Enter on focused card fires onActivate"
- "Click on edit button does NOT fire onActivate (stopPropagation)"

---

## Critères de succès (vérifiables un par un)

1. ✅ `ProjectDetailModal` n'existe plus (fichier + test supprimés).
2. ✅ Aucune référence à `ProjectDetailModal` ou `data-test-project-detail*` dans `@libs/projects-front/src/`, `@apps/front/app/`, `@apps/e2e/tests/`.
3. ✅ Les clés i18n `projects.modal.detail.*` sont supprimées de `fr-fr.yaml`, `en-us.yaml`, `tests/app.ts`.
4. ✅ `ProjectCard` affiche 4 mini-compteurs (Épiques/US/Tâches/Sprints) entre les progress bars et la date.
5. ✅ Hover sur un avatar membre affiche le nom complet (Prénom Nom) via tooltip daisyui.
6. ✅ Hover sur l'avatar "+N" affiche un tip ("N membres supplémentaires").
7. ✅ Click sur le corps de la card (hors boutons) → transition vers `dashboard.kanban` + `setCurrent(projectId)`.
8. ✅ Enter/Espace sur card focusée → même transition.
9. ✅ Click sur les boutons internes (ActionBar, Modifier, Supprimer) ne déclenche PAS la transition kanban (`e.stopPropagation`).
10. ✅ Mode liste : clic sur une ligne TpkTable → même transition.
11. ✅ Test d'intégration `project-card-test.gts` couvre l'activation par click + clavier + stopPropagation.
12. ✅ Tous les tests d'intégration passent (`pnpm test` dans `projects-front` et `dashboard-front`).
13. ✅ Lint clean (`pnpm turbo lint`).
14. ✅ Pas de régression visible : le bouton "Voir le Kanban" du `ProjectActionBar` continue de fonctionner depuis la card.

---

## Risques & edge cases

| Risque | Mitigation |
|---|---|
| Renommer `onOpen` → `onActivate` casse des appelants non identifiés | Grep exhaustif `@onOpen=` avant changement. Si autre usage hors `dashboard/projects.gts` : adapter ou garder le nom `onOpen` et juste changer la sémantique. |
| Tooltip daisyui pas chargé dans certains environnements de test | `app.css` charge daisyui globalement. Les tests d'intégration n'ont pas besoin du visuel — vérifier juste la présence de `data-tip` attribute. |
| Mini-cards prennent trop de hauteur sur mobile | Tester en viewport `sm:` — fallback à 2 colonnes (`grid-cols-2`) si nécessaire. |
| Suppression de clés i18n casse un autre composant qui les utilise | Grep `modal.detail` dans tout le repo avant suppression. |
| Card devient trop dense visuellement | Si feedback utilisateur négatif, retirer les progress bars et garder uniquement les 4 mini-compteurs (Phase 1 alternative). |
| Tests E2E `project-lifecycle.spec.ts` cassent | L'utilisateur cliquait probablement sur la card pour ouvrir la modale détail. Adapter la spec : remplacer par navigation kanban check. |

---

## Plan de livraison

- **Ordre des phases** : 4 → 1 → 2 → 3 → 5 (supprimer d'abord la modale pour éviter d'éditer du code mort, puis enrichir la card, puis ajouter tooltips, puis brancher le click → kanban, enfin valider E2E).
- Une seule PR sur la branche courante `feat/projects-view-actions`.

---

## Prochaines actions

1. Lancer `/TPK-build specs/todo/project-card-richer-no-detail-modal.md` pour exécuter.
