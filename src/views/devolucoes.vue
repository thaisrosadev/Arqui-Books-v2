<script setup>
import Sidebar from '../components/Sidebar.vue'

const ativos = [
  { rm: '10705', nome: 'Lucas Ferreira Costa', livro: 'O Pequeno Príncipe', emprestimo: '15/05/2026', devolucao: '30/05/2026', status: '2 ativos' },
  { rm: '10710', nome: 'Mariana Costa Santos', livro: 'O Senhor dos Anéis', emprestimo: '14/05/2026', devolucao: '29/05/2026', status: '1 ativo' },
  { rm: '10715', nome: 'Beatriz Oliveira Almeida', livro: '1984', emprestimo: '16/05/2026', devolucao: '31/05/2026', status: '3 ativos' },
  { rm: '10720', nome: 'Gabriel Santos Oliveira', livro: 'Reinações de Narizinho', emprestimo: '25/05/2026', devolucao: '09/06/2026', status: '1 ativo' },
  { rm: '10725', nome: 'Rafael Almeida Martins', livro: 'A Hora da Estrela', emprestimo: '01/06/2026', devolucao: '16/06/2026', status: '2 ativos' },
  { rm: '10730', nome: 'Thiago Rodrigues Pereira', livro: 'Iracema', emprestimo: '20/05/2026', devolucao: '04/06/2026', status: '1 ativo' },
]

const historico = [
  { aluno: 'Lucas Costa', livro: 'O Pequeno Príncipe', autor: 'Saint-Exupéry', emprestimo: '15/05/2026', devolucao: '---', renovacoes: 0, status: 'Ativo', badge: 'badge-ativo' },
  { aluno: 'Mariana Santos', livro: 'O Senhor dos Anéis', autor: 'Tolkien', emprestimo: '14/05/2026', devolucao: '---', renovacoes: 1, status: 'Ativo', badge: 'badge-ativo' },
  { aluno: 'Beatriz Oliveira Almeida', livro: '1984', autor: 'Clarice Lispector', emprestimo: '10/04/2026', devolucao: '25/04/2026', renovacoes: 2, status: 'Bloqueado', badge: 'badge-bloqueado' },
  { aluno: 'Gabriel Santos Oliveira', livro: 'Reinações de Narizinho', autor: 'Paulo Coelho', emprestimo: '15/03/2026', devolucao: '01/04/2026', renovacoes: 2, status: 'Ativo', badge: 'badge-ativo' },
  { aluno: 'Rafael Almeida Martins', livro: 'A Hora da Estrela', autor: 'George Orwell', emprestimo: '02/02/2026', devolucao: '18/02/2026', renovacoes: 1, status: 'Ativo', badge: 'badge-ativo' },
  { aluno: 'Thiago Rodrigues Pereira', livro: 'Iracema', autor: 'Machado de Assis', emprestimo: '10/01/2026', devolucao: '28/01/2026', renovacoes: 0, status: 'Bloqueado', badge: 'badge-bloqueado' },
]
</script>

<template>
  <Sidebar page-title="Devoluções" active="devolucoes">
    <div class="page-header">
      <h1></h1>
    </div>

    <div class="table-card">
      <div class="table-card-header">
        <h3>Empréstimos Ativos</h3>
        <div class="table-tools">
          <input type="text" placeholder="Filtrar..." />
        </div>
      </div>
      <table class="data-table">
        <thead>
          <tr>
            <th>RM</th>
            <th>Nome</th>
            <th>Livro</th>
            <th>Empréstimo</th>
            <th>Devolução Prevista</th>
            <th>Status</th>
            <th>Ação</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(a, i) in ativos" :key="i">
            <td>{{ a.rm }}</td>
            <td>{{ a.nome }}</td>
            <td>{{ a.livro }}</td>
            <td>{{ a.emprestimo }}</td>
            <td>{{ a.devolucao }}</td>
            <td><span class="badge badge-ativos">{{ a.status }}</span></td>
            <td>
              <button class="action-btn check">✓</button>
              <button class="action-btn renew">⟳</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="table-card">
      <div class="table-card-header">
        <h3>Histórico Geral de Empréstimos</h3>
        <div class="table-tools">
          <input type="text" placeholder="Filtrar..." />
        </div>
      </div>
      <table class="data-table">
        <thead>
          <tr>
            <th>Aluno</th>
            <th>Livro</th>
            <th>Autor</th>
            <th>Empréstimo</th>
            <th>Devolução</th>
            <th>Renovações</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(h, i) in historico" :key="i">
            <td>{{ h.aluno }}</td>
            <td>{{ h.livro }}</td>
            <td>{{ h.autor }}</td>
            <td>{{ h.emprestimo }}</td>
            <td>{{ h.devolucao }}</td>
            <td>{{ h.renovacoes }}</td>
            <td><span class="badge" :class="h.badge">{{ h.status }}</span></td>
          </tr>
        </tbody>
      </table>
    </div>
  </Sidebar>
</template>
