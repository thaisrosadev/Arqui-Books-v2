// dados.js — "banco de mentira" do sistema. Todas as telas leem e alteram os MESMOS dados daqui.
// Quando o PHP/MySQL entrar, cada lista abaixo vira uma consulta ao banco.
import { ref } from 'vue' // ref = caixinha de dado que avisa a tela quando muda
import { hojeISO, somaDias, chaveMes, somaMeses, PRAZO_DIAS } from './regras.js'

const HOJE = hojeISO()                    // as datas de teste são calculadas a partir de HOJE (sempre parecem atuais)
const dias = (n) => somaDias(HOJE, n)     // dias(-5) = 5 dias atrás
const pad = (n) => String(n).padStart(2, '0')

// LIVROS — usamos o ISBN como "identidade" de cada livro
export const livros = ref([
  { titulo: 'Dom Casmurro', autor: 'Machado de Assis', categoria: 'Romance', isbn: '978-85-260-0611-5', exemplares: 5, disponiveis: 2 },
  { titulo: '1984', autor: 'George Orwell', categoria: 'Ficção Científica', isbn: '978-85-359-0277-2', exemplares: 4, disponiveis: 0 },
  { titulo: 'A Hora da Estrela', autor: 'Clarice Lispector', categoria: 'Romance', isbn: '978-85-260-0587-3', exemplares: 3, disponiveis: 3 },
  { titulo: 'Iracema', autor: 'José de Alencar', categoria: 'Romance', isbn: '978-85-08-04890-1', exemplares: 2, disponiveis: 0 },
  { titulo: 'O Alquimista', autor: 'Paulo Coelho', categoria: 'Ficção', isbn: '978-85-325-1229-0', exemplares: 6, disponiveis: 4 },
])

// ALUNOS — usamos o RM como "identidade" de cada aluno
export const alunos = ref([
  { rm: '10705', nome: 'Lucas Ferreira Costa', curso: '1MI1', periodo: 'Manhã', email: 'lucas@escola.edu', emprestimosAtivos: 2, status: 'Ativo' },
  { rm: '10710', nome: 'Mariana Costa Santos', curso: '2DS3', periodo: 'Tarde', email: 'mariana@escola.edu', emprestimosAtivos: 2, status: 'Ativo' },
  { rm: '10715', nome: 'Beatriz Oliveira Almeida', curso: '3MI2', periodo: 'Noite', email: 'beatriz@escola.edu', emprestimosAtivos: 3, status: 'Bloqueado' },
  { rm: '10720', nome: 'Gabriel Santos Oliveira', curso: '1MI3', periodo: 'Manhã', email: 'gabriel@escola.edu', emprestimosAtivos: 2, status: 'Ativo' },
  { rm: '10725', nome: 'Rafael Almeida Martins', curso: '2ED2', periodo: 'Noite', email: 'rafael@escola.edu', emprestimosAtivos: 1, status: 'Ativo' },
  { rm: '10730', nome: 'Thiago Rodrigues Pereira', curso: '1EF1', periodo: 'Tarde', email: 'thiago@escola.edu', emprestimosAtivos: 1, status: 'Bloqueado' },
])

// monta um registro de empréstimo a partir do RM do aluno, do título do livro e de "há quantos dias" foi retirado
function montar(rm, titulo, diasAtras, devolvidoHaDias = null) {
  const aluno = alunos.value.find(a => a.rm === rm)            // acha o aluno pelo RM
  const livro = livros.value.find(l => l.titulo === titulo)    // acha o livro pelo título
  const emprestimo = dias(-diasAtras)                          // data da retirada
  return {
    rm: aluno.rm, aluno: aluno.nome,                           // quem pegou
    isbn: livro.isbn, livro: livro.titulo,                     // o que pegou
    emprestimo,                                                // quando pegou
    previsao: somaDias(emprestimo, PRAZO_DIAS),                // até quando deve devolver
    devolucao: devolvidoHaDias === null ? null : dias(-devolvidoHaDias), // quando devolveu (null = ainda está com o aluno)
  }
}

// EMPRÉSTIMOS ABERTOS (ainda com o aluno) — os mais recentes primeiro
export const emprestimos = ref([
  montar('10715', 'Dom Casmurro', 2),
  montar('10710', 'O Alquimista', 1),
  montar('10705', '1984', 3),
  montar('10720', 'O Alquimista', 4),
  montar('10715', '1984', 5),
  montar('10725', 'Dom Casmurro', 7),
  montar('10715', 'Iracema', 12),        // vence em 2 dias  -> "Vencendo"
  montar('10730', 'Iracema', 17),        // 3 dias de atraso
  montar('10720', '1984', 19),           // 5 dias de atraso
  montar('10710', '1984', 22),           // 8 dias de atraso
  montar('10705', 'Dom Casmurro', 28),   // 14 dias de atraso
])

// HISTÓRICO — empréstimos já DEVOLVIDOS (alimenta o gráfico e a comparação entre meses)
function gerarHistorico() {
  const lista = []
  const mesAtual = chaveMes(HOJE)
  const porMes = { 5: 14, 4: 17, 3: 8, 2: 13, 1: 11 }          // quantos empréstimos em cada mês passado (5 = há 5 meses)

  Object.entries(porMes).forEach(([k, qtd]) => {
    const chave = somaMeses(mesAtual, -Number(k))              // "aaaa-mm" daquele mês
    for (let i = 0; i < qtd; i++) {
      const aluno = alunos.value[(i + Number(k)) % alunos.value.length]
      const livro = livros.value[(i * 2 + Number(k)) % livros.value.length]
      const emprestimo = `${chave}-${pad(1 + ((i * 5 + Number(k) * 3) % 26))}` // dia entre 1 e 26
      const duracao = 4 + ((i * 3 + Number(k)) % 19)           // ficou de 4 a 22 dias com o livro (alguns passam do prazo)
      let devolucao = somaDias(emprestimo, duracao)
      if (devolucao > HOJE) devolucao = HOJE                   // nunca devolve no futuro
      lista.push({ rm: aluno.rm, aluno: aluno.nome, isbn: livro.isbn, livro: livro.titulo, emprestimo, previsao: somaDias(emprestimo, PRAZO_DIAS), devolucao })
    }
  })

  for (let i = 0; i < 6; i++) {                                // devoluções recentes (últimos dias)
    const aluno = alunos.value[(i + 2) % alunos.value.length]
    const livro = livros.value[(i + 1) % livros.value.length]
    const emprestimo = dias(-(12 + 2 * i))
    lista.push({ rm: aluno.rm, aluno: aluno.nome, isbn: livro.isbn, livro: livro.titulo, emprestimo, previsao: somaDias(emprestimo, PRAZO_DIAS), devolucao: dias(-(i + 1)) })
  }
  return lista
}

export const historico = ref(gerarHistorico())

// notificações que a bibliotecária já marcou como lidas (compartilhado entre as telas)
export const notificacoesLidas = ref([])
