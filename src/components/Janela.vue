<script setup>
// Janela.vue — moldura simples de janela (modal). Uso: <Janela titulo="..." @fechar="...">conteúdo <template #rodape>botões</template></Janela>
defineProps({
  titulo: { type: String, required: true },
  largura: { type: String, default: '520px' },
})
defineEmits(['fechar'])
</script>

<template>
  <div class="fundo" @click.self="$emit('fechar')">
    <div class="caixa" :style="{ maxWidth: largura }" role="dialog" aria-modal="true">
      <header class="topo">
        <h3>{{ titulo }}</h3>
        <button class="fechar" @click="$emit('fechar')" aria-label="Fechar">×</button>
      </header>
      <div class="corpo"><slot /></div>
      <footer v-if="$slots.rodape" class="rodape"><slot name="rodape" /></footer>
    </div>
  </div>
</template>

<style scoped>
.fundo { position: fixed; inset: 0; z-index: 4000; background: rgba(11, 31, 75, 0.45); display: flex; align-items: center; justify-content: center; padding: 1rem; }
.caixa { width: 100%; max-height: 92vh; overflow-y: auto; background: #fff; border-radius: 12px; box-shadow: 0 16px 40px rgba(0, 0, 0, 0.25); }
.topo { display: flex; justify-content: space-between; align-items: flex-start; padding: 1.1rem 1.3rem 0.4rem; }
.topo h3 { margin: 0; font-size: 1.25rem; font-weight: 700; color: #0b1f4b; }
.fechar { background: none; border: none; font-size: 1.6rem; line-height: 1; color: #868e96; cursor: pointer; }
.corpo { padding: 0.4rem 1.3rem 1rem; }
.rodape { display: flex; justify-content: flex-end; gap: 0.6rem; padding: 0.9rem 1.3rem 1.2rem; }
</style>
