<script setup>
import { ref, computed } from 'vue'
import Sidebar from '../components/Sidebar.vue'
import ModalForm from '../components/ModalForm.vue'
import Janela from '../components/Janela.vue'
import { livros, recarregar } from '../dados.js'
import { apiGet, apiPost, apiDelete } from '../api.js'

const busca = ref('')
const filtroCategoria = ref('')
const filtroStatus = ref('')
const mostrarModal = ref(false)
const erro = ref('')
const salvando = ref(false)

function vazio() { return { titulo: '', autor: '', categoria: '', isbn: '', exemplares: 1 } }
const novo = ref(vazio())

const statusDe = l => (l.disponiveis > 0 ? 'Disponível' : 'Emprestado')
const badgeDe = l => (l.disponiveis > 0 ? 'badge-disponivel' : 'badge-emprestado')

const categorias = computed(() => [...new Set(livros.value.map(l => l.categoria))])

const livrosFiltrados = computed(() =>
  livros.value.filter(l => {
    const t = busca.value.toLowerCase()
    const bateBusca = l.titulo.toLowerCase().includes(t) || l.autor.toLowerCase().includes(t) || l.isbn.includes(t)
    const bateCategoria = !filtroCategoria.value || l.categoria === filtroCategoria.value
    const bateStatus = !filtroStatus.value || statusDe(l) === filtroStatus.value
    return bateBusca && bateCategoria && bateStatus
  })
)

function abrirModal() { novo.value = vazio(); erro.value = ''; mostrarModal.value = true }

async function salvar() {
  if (salvando.value) return
  salvando.value = true
  erro.value = ''
  try {
    await apiPost('/api/livros.php', {
      titulo: novo.value.titulo, autor: novo.value.autor, categoria: novo.value.categoria,
      isbn: novo.value.isbn, exemplares: Number(novo.value.exemplares),
    })
    await recarregar()
    mostrarModal.value = false
  } catch (e) {
    erro.value = e.message
  } finally {
    salvando.value = false
  }
}

async function excluir(isbn) {
  if (!confirm('Excluir este livro?')) return
  try {
    await apiDelete('/api/livros.php?isbn=' + encodeURIComponent(isbn))
    await recarregar()
  } catch (e) {
    alert(e.message)
  }
}

// ---------- condição de cada exemplar ----------
const verLivro = ref(null)                         // livro cujas cópias estão abertas
const copias = ref([])
const erroCopias = ref('')
const editando = ref(null)                         // cópia que está sendo alterada
const edicao = ref({ condicao: 'Normal', observacao: '', emprestavel: false })

async function abrirCopias(l) {
  verLivro.value = l
  editando.value = null
  erroCopias.value = ''
  await carregarCopias()
}
async function carregarCopias() {
  try { copias.value = await apiGet('/api/exemplares.php?isbn=' + encodeURIComponent(verLivro.value.isbn)) }
  catch (e) { erroCopias.value = e.message }
}
function editar(c) {
  editando.value = c.tombo
  edicao.value = { condicao: c.condicao, observacao: c.observacao || '', emprestavel: c.emprestavel }
  erroCopias.value = ''
}
async function salvarCopia(c) {
  try {
    await apiPost('/api/exemplares.php', { tombo: c.tombo, ...edicao.value })
    editando.value = null
    await carregarCopias()
    await recarregar()
  } catch (e) {
    erroCopias.value = e.message
  }
}
</script>

<template>
  <Sidebar page-title="Livros" active="livros">
    <div class="page-header">
      <h1></h1>
      <button class="btn-primary-action" @click="abrirModal">Cadastrar Livro</button>
    </div>

    <div class="filter-bar">
      <input v-model="busca" type="text" placeholder="Pesquisar por título, autor ou ISBN..." />
      <select v-model="filtroCategoria">
        <option value="">Todas as categorias</option>
        <option v-for="c in categorias" :key="c" :value="c">{{ c }}</option>
      </select>
      <select v-model="filtroStatus">
        <option value="">Todos os status</option>
        <option value="Disponível">Disponível</option>
        <option value="Emprestado">Emprestado</option>
      </select>
    </div>

    <div class="table-card">
      <table class="data-table">
        <thead>
          <tr>
            <th>Título</th><th>Autor</th><th>Categoria</th><th>ISBN</th>
            <th>Exemplares</th><th>Disponíveis</th><th>Condição</th><th>Status</th><th>Ações</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="l in livrosFiltrados" :key="l.isbn">
            <td>{{ l.titulo }}</td>
            <td>{{ l.autor }}</td>
            <td>{{ l.categoria }}</td>
            <td>{{ l.isbn }}</td>
            <td>{{ l.exemplares }}</td>
            <td>{{ l.disponiveis }}</td>
            <td>
              <span v-if="l.avariados" class="cond aviso">{{ l.avariados }} avariado{{ l.avariados > 1 ? 's' : '' }}</span>
              <span v-if="l.extraviados" class="cond perda">{{ l.extraviados }} extraviado{{ l.extraviados > 1 ? 's' : '' }}</span>
              <span v-if="!l.avariados && !l.extraviados" class="sem">—</span>
            </td>
            <td><span class="badge" :class="badgeDe(l)">{{ statusDe(l) }}</span></td>
            <td class="acoes">
              <button class="btn btn-outline-primary btn-sm" @click="abrirCopias(l)">Exemplares</button>
              <button class="btn btn-danger btn-sm" @click="excluir(l.isbn)">Excluir</button>
            </td>
          </tr>
          <tr v-if="livrosFiltrados.length === 0">
            <td colspan="9" class="text-center">Nenhum livro encontrado.</td>
          </tr>
        </tbody>
      </table>
    </div>

    <ModalForm v-if="mostrarModal" titulo="Cadastrar livro" @fechar="mostrarModal = false" @salvar="salvar">
      <div v-if="erro" class="alert alert-danger py-2">{{ erro }}</div>
      <label class="form-label">Título</label>
      <input v-model="novo.titulo" class="form-control mb-2" required />
      <label class="form-label">Autor</label>
      <input v-model="novo.autor" class="form-control mb-2" required />
      <label class="form-label">Categoria</label>
      <input v-model="novo.categoria" class="form-control mb-2" placeholder="Ex: Romance" required />
      <label class="form-label">ISBN</label>
      <input v-model="novo.isbn" class="form-control mb-2" placeholder="978-85-..." required />
      <label class="form-label">Exemplares</label>
      <input v-model="novo.exemplares" type="number" min="1" class="form-control" required />
    </ModalForm>

    <!-- EXEMPLARES DO LIVRO -->
    <Janela v-if="verLivro" :titulo="'Exemplares · ' + verLivro.titulo" largura="640px" @fechar="verLivro = null">
      <div v-if="erroCopias" class="alert alert-danger py-2">{{ erroCopias }}</div>
      <table class="tabela-copias">
        <thead><tr><th>Tombo</th><th>Condição</th><th>Observação</th><th></th></tr></thead>
        <tbody>
          <template v-for="c in copias" :key="c.tombo">
            <tr>
              <td>{{ c.tombo }}</td>
              <td>
                <span class="cond" :class="{ aviso: c.condicao === 'Avariado', perda: c.condicao === 'Extraviado', ok: c.condicao === 'Normal' }">{{ c.condicao }}</span>
                <small v-if="c.emprestado" class="emp">emprestado</small>
              </td>
              <td>{{ c.observacao || '—' }}</td>
              <td><button class="btn btn-outline-secondary btn-sm" :disabled="c.emprestado" @click="editar(c)">Alterar</button></td>
            </tr>
            <tr v-if="editando === c.tombo" class="linha-edicao">
              <td colspan="4">
                <select v-model="edicao.condicao" class="form-select form-select-sm mb-2">
                  <option>Normal</option><option>Avariado</option><option>Extraviado</option>
                </select>
                <textarea v-if="edicao.condicao !== 'Normal'" v-model="edicao.observacao" class="form-control mb-2" rows="2" placeholder="Descreva o que aconteceu..."></textarea>
                <label v-if="edicao.condicao === 'Avariado'" class="troca"><input v-model="edicao.emprestavel" type="checkbox" /> Ainda pode ser emprestado</label>
                <button class="btn btn-primary btn-sm" @click="salvarCopia(c)">Salvar</button>
                <button class="btn btn-link btn-sm" @click="editando = null">Cancelar</button>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </Janela>
  </Sidebar>
</template>

<style scoped>
.acoes { white-space: nowrap; display: flex; gap: 0.4rem; }
.sem { color: #ced4da; }
.cond { display: inline-block; margin-right: 0.3rem; padding: 0.1rem 0.6rem; border-radius: 12px; font-size: 0.75rem; font-weight: 600; }
.cond.aviso { background: #fff4e6; color: #e8590c; }
.cond.perda { background: #fff5f5; color: #e03131; }
.cond.ok { background: #ebfbee; color: #2f9e44; }
.emp { margin-left: 0.3rem; color: #868e96; }
.tabela-copias { width: 100%; font-size: 0.85rem; }
.tabela-copias th { text-align: left; color: #868e96; font-size: 0.75rem; padding: 0.4rem 0.3rem; }
.tabela-copias td { padding: 0.45rem 0.3rem; border-top: 1px solid #f1f3f5; vertical-align: middle; }
.linha-edicao td { background: #f8f9fb; }
.troca { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem; font-size: 0.85rem; }
</style>
