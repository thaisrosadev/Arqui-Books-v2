<script setup>
import { ref, computed } from 'vue'                // ref = caixinha de dado; computed = cálculo automático
import Sidebar from '../components/Sidebar.vue'    // menu lateral
import ModalForm from '../components/ModalForm.vue' // moldura do formulário
import { livros } from '../dados.js'               // lista de livros compartilhada com as outras telas

const busca = ref('')                              // texto da pesquisa
const filtroCategoria = ref('')                    // categoria escolhida ('' = todas)
const filtroStatus = ref('')                       // status escolhido ('' = todos)
const mostrarModal = ref(false)                    // modal começa fechado
const erro = ref('')                               // mensagem de erro do formulário

function vazio() {                                 // devolve um formulário limpo
  return { titulo: '', autor: '', categoria: '', isbn: '', exemplares: 1 }
}
const novo = ref(vazio())                          // dados digitados no formulário

function statusDe(l) {                             // texto do status, calculado dos exemplares
  return l.disponiveis > 0 ? 'Disponível' : 'Emprestado'
}
function badgeDe(l) {                              // classe CSS da etiqueta
  return l.disponiveis > 0 ? 'badge-disponivel' : 'badge-emprestado'
}

const categorias = computed(() =>                  // categorias para o <select>, tiradas dos próprios livros
  [...new Set(livros.value.map(l => l.categoria))] // Set remove as repetidas
)

const livrosFiltrados = computed(() =>             // lista que aparece na tabela
  livros.value.filter(l => {                       // decide livro a livro se fica (true) ou sai (false)
    const t = busca.value.toLowerCase()            // busca em minúsculas
    const bateBusca = l.titulo.toLowerCase().includes(t) || l.autor.toLowerCase().includes(t) || l.isbn.includes(t)
    const bateCategoria = !filtroCategoria.value || l.categoria === filtroCategoria.value
    const bateStatus = !filtroStatus.value || statusDe(l) === filtroStatus.value
    return bateBusca && bateCategoria && bateStatus // precisa passar nos três testes
  })
)

function abrirModal() {                            // botão "Cadastrar Livro"
  novo.value = vazio()                             // limpa o formulário
  erro.value = ''                                  // limpa o erro
  mostrarModal.value = true                        // abre o modal
}

function salvar() {                                // chamada quando o formulário é enviado
  const isbn = novo.value.isbn.trim()              // ISBN sem espaços nas pontas
  if (livros.value.some(l => l.isbn === isbn)) {   // já existe livro com esse ISBN?
    erro.value = 'Já existe um livro com esse ISBN.'
    return                                         // para aqui e mantém o modal aberto
  }
  const qtd = Number(novo.value.exemplares)        // input devolve texto, converte para número
  livros.value.push({                              // coloca o livro novo na lista
    titulo: novo.value.titulo.trim(),
    autor: novo.value.autor.trim(),
    categoria: novo.value.categoria.trim(),
    isbn,
    exemplares: qtd,
    disponiveis: qtd,                              // livro novo começa com todos disponíveis
  })
  mostrarModal.value = false                       // fecha o modal
}

function excluir(isbn) {                           // botão "Excluir"
  if (!confirm('Excluir este livro?')) return      // pergunta antes
  livros.value = livros.value.filter(l => l.isbn !== isbn) // mantém todos, menos esse ISBN
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
            <th>Exemplares</th><th>Disponíveis</th><th>Status</th><th>Ações</th>
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
            <td><span class="badge" :class="badgeDe(l)">{{ statusDe(l) }}</span></td>
            <td><button class="btn btn-danger btn-sm" @click="excluir(l.isbn)">Excluir</button></td>
          </tr>
          <tr v-if="livrosFiltrados.length === 0">
            <td colspan="8" class="text-center">Nenhum livro encontrado.</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- FORMULÁRIO DE CADASTRO DE LIVRO -->
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
  </Sidebar>
</template>
