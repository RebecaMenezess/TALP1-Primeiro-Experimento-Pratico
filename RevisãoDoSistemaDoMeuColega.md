RevisaoDoSistemaDoMeuColega

1. O sistema esta funcionando com as funcionalidades solicitadas?

Parcialmente.

O que esta implementado:
- Backend Node/Express (rotas):
  - `GET /health` retorna `{ "status": "ok" }`
  - `GET /api/questions` retorna uma lista de questoes carregadas em memória (2 questões iniciais)
  - `POST /api/questions` adiciona questões, com validação
- Frontend React (tela de questões):
  - Busca as questões em `http://localhost:3001/api/questions`
  - Renderiza as questões em uma lista
  - Para `tipo: "soma"`, permite marcar alternativas por checkbox e clicar em `Corrigir`
  - Para `tipo: "letras"`, apenas exibe o enunciado

2. Quais os problemas de qualidade do código e dos testes?

Principais pontos observados:
- Persistência inexistente: o backend armazena questoes em um array em memória (`database.ts`). Reiniciar o servidor apaga as alterações.
- Escopo limitado da interface: a tela de correção so funciona para `tipo: "soma"`. Para `tipo: "letras"` não há componente de resposta/correção.
- Testes de aceitação incompletos/não executáveis no estado atual:

3. Como a funcionalidade e a qualidade desse sistema pode ser comparada com as do seu sistema?

Nem todas as funcionalidades do sistema do colega foram implementadas, então não é possível comparar com exatidão. 
