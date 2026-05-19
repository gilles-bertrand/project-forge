import type { TOC } from '@ember/component/template-only';

interface AuthLayoutSignature {
  Element: HTMLDivElement;
  Blocks: {
    default: [];
  };
}

export default <template>
  <div
    class="min-h-screen flex flex-col items-center justify-center gap-8 p-6 bg-background text-foreground"
    ...attributes
  >
    <div class="text-center">
      <h1
        class="text-4xl font-bold text-primary tracking-tight"
      >SprintForge</h1>
      <p class="mt-2 text-sm opacity-60">Outil de gestion de projets Scrum</p>
    </div>
    <div
      class="bg-card text-card-foreground w-full max-w-md rounded-2xl shadow-xl border border-border p-8"
    >
      {{yield}}
    </div>
    <footer class="text-xs opacity-60">
      SprintForge © 2026 - Gestion de projets Scrum
    </footer>
  </div>
</template> as TOC<AuthLayoutSignature>
