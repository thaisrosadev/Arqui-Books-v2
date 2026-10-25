// dados.js — "estoque central" do sistema. Os dados vêm do BANCO, através do PHP.
import { ref, computed } from 'vue'
import { apiGet } from './api.js'

export const livros = ref([])
export const alunos = ref([])
export const emprestimos = ref([])              // empréstimos ABERTOS (ainda com o aluno)
export const historico = ref([])                // empréstimos ENCERRADOS (devolvido, avariado ou extraviado)
export const turmas = ref([])

// pendências abertas (livro avariado/extraviado ainda não resolvido)
export const pendencias = computed(() => historico.value.filter(e => e.pendencia))

export const carregando = ref(true)
export const erroApi = ref('')

// notificações que a bibliotecária já marcou como lidas (por enquanto só na memória da página)
export const notificacoesLidas = ref([])

export async function recarregar() {
  try {
    const [l, a, t, e] = await Promise.all([
      apiGet('/api/livros.php'),
      apiGet('/api/alunos.php'),
      apiGet('/api/turmas.php'),
      apiGet('/api/emprestimos.php'),
    ])
    livros.value = l
    alunos.value = a
    turmas.value = t
    emprestimos.value = e.filter(x => x.devolucao === null)
    historico.value = e.filter(x => x.devolucao !== null)
    erroApi.value = ''
  } catch (err) {
    erroApi.value = err.message
  } finally {
    carregando.value = false
  }
}

recarregar()
