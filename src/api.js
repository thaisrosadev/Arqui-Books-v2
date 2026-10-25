// api.js — é por aqui que o Vue conversa com o PHP. Todas as telas usam estas funções.
// Depois do login, cada pedido leva a "pulseira" (token) no cabeçalho X-Token.

export const getToken = () => { try { return localStorage.getItem('arquibooks_token') || '' } catch (e) { return '' } }
export const salvarSessao = (token, usuario) => {
  try { localStorage.setItem('arquibooks_token', token); localStorage.setItem('arquibooks_usuario', JSON.stringify(usuario)) } catch (e) { /* sem armazenamento */ }
}
export const limparSessao = () => {
  try { localStorage.removeItem('arquibooks_token'); localStorage.removeItem('arquibooks_usuario') } catch (e) { /* sem armazenamento */ }
}
export const usuarioLogado = () => {
  try { return JSON.parse(localStorage.getItem('arquibooks_usuario') || 'null') } catch (e) { return null }
}

async function chamar(url, opcoes = {}) {
  const cabecalhos = { ...(opcoes.headers || {}) }
  const token = getToken()
  if (token) cabecalhos['X-Token'] = token                         // mostra a pulseira em todo pedido

  let resposta
  try {
    resposta = await fetch(url, { ...opcoes, headers: cabecalhos })
  } catch (e) {
    throw new Error('Não foi possível falar com o servidor. O Apache e o MySQL do XAMPP estão ligados?')
  }

  let dados = null
  try { dados = await resposta.json() } catch (e) { dados = null }

  if (resposta.status === 401 && token && !url.includes('auth.php')) { // pulseira vencida: volta para o login
    limparSessao()
    window.location.href = '/login'
  }

  if (!resposta.ok) {
    const msg = dados && dados.erro
      ? dados.erro
      : `O servidor respondeu com erro ${resposta.status}. Confira se o Apache e o MySQL estão ligados e se a pasta arquibooks-api está em htdocs.`
    throw new Error(msg)
  }
  return dados
}

export const apiGet = (url) => chamar(url)
export const apiPost = (url, corpo) => chamar(url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(corpo),
})
export const apiDelete = (url) => chamar(url, { method: 'DELETE' })
