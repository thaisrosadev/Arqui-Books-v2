<script setup>
// ModalForm — a "moldura" de janela usada por TODOS os formulários de cadastro
defineProps({                                   // recebe o título de quem usa o componente
  titulo: { type: String, required: true },     // ex: "Cadastrar aluno"
})

const emit = defineEmits(['fechar', 'salvar'])  // avisos que a moldura manda para a tela que a usa
</script>

<template>
  <!-- fundo escuro; clicar fora da caixa (.self) fecha o modal -->
  <div class="modal-fundo" @click.self="emit('fechar')">
    <!-- submit.prevent: impede a página de recarregar e avisa "salvar" (o navegador valida os campos required antes) -->
    <form class="modal-caixa" @submit.prevent="emit('salvar')">
      <h4 class="mb-3">{{ titulo }}</h4>        <!-- título da janela -->
      <slot />                                  <!-- aqui entram os campos de cada formulário -->
      <div class="d-flex justify-content-end gap-2 mt-3">
        <button type="button" class="btn btn-secondary" @click="emit('fechar')">Cancelar</button>
        <button type="submit" class="btn btn-success">Salvar</button>
      </div>
    </form>
  </div>
</template>

<style scoped>
.modal-fundo {                                  /* fundo escuro que cobre a tela toda */
  position: fixed; inset: 0;                    /* gruda nas 4 bordas da tela */
  background: rgba(0, 0, 0, 0.5);               /* preto meio transparente */
  display: flex; justify-content: center; align-items: center; /* centraliza a caixa */
  z-index: 2000;                                /* fica por cima de tudo, inclusive da sidebar */
}
.modal-caixa {                                  /* a caixa branca */
  background: #fff; padding: 1.5rem; border-radius: 8px;
  width: 100%; max-width: 440px;
  max-height: 90vh; overflow-y: auto;           /* se for alta, rola dentro da caixa */
}
</style>
