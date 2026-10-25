<script setup>
import Sidebar from '../components/Sidebar.vue'

const envios = [
  { data: '09/06/2026 08:00', aluno: 'João Silva', livro: 'Dom Casmurro', tipo: 'Aviso de atraso', status: 'Emprestado', badge: 'badge-emprestado' },
  { data: '08/06/2026 08:00', aluno: 'Beatriz Almeida', livro: '1984', tipo: 'Vencendo (1 dia)', status: 'Disponível', badge: 'badge-disponivel' },
  { data: '06/06/2026 08:00', aluno: 'Rafael Martins', livro: 'A Hora da Estrela', tipo: 'Lembrete 3 dias', status: 'Emprestado', badge: 'badge-emprestado' },
  { data: '02/06/2026 08:00', aluno: 'Thiago Pereira', livro: 'Iracema', tipo: 'Aviso de atraso', status: 'Disponível', badge: 'badge-disponivel' },
  { data: '28/05/2026 08:00', aluno: 'Camila Maia', livro: 'O Alquimista', tipo: 'Lembrete 3 dias', status: 'Emprestado', badge: 'badge-emprestado' },
]
</script>

<template>
  <Sidebar page-title="E-mail" active="email">
    <div class="page-header">
      <h1></h1>
      <button class="btn-primary-action">Enviar Agora</button>
    </div>

    <div class="table-card">
      <div class="table-card-header">
        <h3>Histórico de Envios</h3>
        <div class="table-tools">
          <input type="text" placeholder="Filtrar..." />
          <button class="btn-outline">Ver todos</button>
        </div>
      </div>
      <table class="data-table">
        <thead>
          <tr>
            <th>Data/Hora</th>
            <th>Aluno</th>
            <th>Livro</th>
            <th>Tipo</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(e, i) in envios" :key="i">
            <td>{{ e.data }}</td>
            <td>{{ e.aluno }}</td>
            <td>{{ e.livro }}</td>
            <td><span class="badge badge-ativos">{{ e.tipo }}</span></td>
            <td><span class="badge" :class="e.badge">{{ e.status }}</span></td>
          </tr>
        </tbody>
      </table>
    </div>
  </Sidebar>
</template>
