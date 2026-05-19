import type { TOC } from '@ember/component/template-only';

interface PlaceholderPageSignature {
  Args: {
    title: string;
    description?: string;
  };
}

const PlaceholderPage: TOC<PlaceholderPageSignature> = <template>
  <div class="hero min-h-[60vh]">
    <div class="hero-content text-center">
      <div class="max-w-md">
        <h1 class="text-3xl font-bold">{{@title}}</h1>
        <p class="py-6 opacity-60">{{if @description @description "En construction"}}</p>
      </div>
    </div>
  </div>
</template>;

export default PlaceholderPage;
