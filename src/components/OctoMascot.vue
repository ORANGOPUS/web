<template>
  <span class="octo" :style="{ width: size + 'px', height: size + 'px' }" aria-hidden="true">
    <canvas v-show="ready" ref="canvas" class="octo-canvas"></canvas>
    <img v-if="!ready" src="/orangopus-icon.svg" alt="" class="octo-fallback" />
  </span>
</template>

<script lang="ts">
import { defineComponent, type PropType } from "vue";
import type { Octopus, OctopusMood } from "@/mascot/octopus";

// The flat logo shows until the 3D octopus is ready. three.js loads once the page is idle,
// so it never competes with the page itself, and it's fetched only once per visit.
function whenIdle(): Promise<void> {
  return new Promise(resolve => {
    const go = () => ("requestIdleCallback" in window
      ? window.requestIdleCallback(() => resolve(), { timeout: 3000 })
      : setTimeout(resolve, 300));
    if (document.readyState === "complete") go();
    else window.addEventListener("load", go, { once: true });
  });
}

export default defineComponent({
  name: "OctoMascot",
  props: {
    size: { type: Number, default: 48 },
    mood: { type: String as PropType<OctopusMood>, default: "idle" }
  },
  data() {
    return { ready: false };
  },
  created() {
    // Not reactive: the renderer handle only lives on the instance.
    (this as unknown as { octo: Octopus | null }).octo = null;
  },
  async mounted() {
    try {
      await whenIdle();
      if (!this.$refs.canvas) return;
      const { createOctopus } = await import(/* webpackChunkName: "octopus" */ "@/mascot/octopus");
      const canvas = this.$refs.canvas as HTMLCanvasElement | undefined;
      if (!canvas) return;
      const octo = createOctopus(canvas);
      octo.setMood(this.mood);
      (this as unknown as { octo: Octopus | null }).octo = octo;
      this.ready = true;
    } catch {
      // No WebGL, or the chunk failed to load: keep the flat logo.
    }
  },
  beforeUnmount() {
    const self = this as unknown as { octo: Octopus | null };
    self.octo?.destroy();
    self.octo = null;
  },
  watch: {
    mood(value: OctopusMood) {
      (this as unknown as { octo: Octopus | null }).octo?.setMood(value);
    }
  }
});
</script>

<style scoped>
.octo {
  display: inline-block;
  flex: none;
  position: relative;
}
.octo-canvas,
.octo-fallback {
  display: block;
  width: 100%;
  height: 100%;
}
.octo-fallback {
  padding: 12%;
}
</style>
