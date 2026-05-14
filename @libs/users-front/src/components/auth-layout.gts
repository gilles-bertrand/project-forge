import type { TOC } from '@ember/component/template-only';

interface AuthLayoutSignature {
  Element: HTMLDivElement;
  Blocks: {
    default: [];
  };
}

export default <template>
  <div
    class="min-h-screen flex flex-col items-center justify-center gap-8 p-6"
    ...attributes
  >
    <div class="text-center">
      <h1 class="text-3xl font-bold text-primary">SprintForge</h1>
      <p class="mt-2 opacity-60">Outil de gestion de projets Scrum</p>
    </div>
    <div class="card bg-card w-full max-w-md shadow-xl">
      <div class="card-body">
        {{yield}}
      </div>
    </div>
    <footer class="text-xs opacity-60">
      SprintForge © 2026 - Gestion de projets Scrum
    </footer>
  </div>
</template> as TOC<AuthLayoutSignature>
