PRANDO - AVALIAÇÃO PRÁTICA DE DIREÇÃO
=======================================

ATUALIZAÇÕES DESTA VERSÃO
- salvamento automático do rascunho
- recuperação do formulário ao fechar e abrir o app
- proteção dupla:
  1) localStorage para metadados rápidos
  2) IndexedDB para rascunho completo, fotos e assinaturas
- novo formulário apenas ao clicar em "Novo formulário"
- histórico local de cópias salvas
- geração de PDF otimizada para A4, com margens de 10 mm
- rodapé: Prando - Operação Florestal Suzano
- campos ajustados: KM Início, KM Final, Empresa

COMO USAR
1. Extraia a pasta do ZIP.
2. Abra o arquivo index.html.
3. Para melhor funcionamento offline/PWA, sirva a pasta com um servidor local.

SERVIDOR LOCAL RÁPIDO
No Windows com Python instalado:
python -m http.server 8000

Depois abra:
http://localhost:8000

COMO GERAR PDF A4 SEM CORTES
1. Clique em "Gerar PDF".
2. Na janela de impressão do navegador:
   - Destino: Salvar como PDF
   - Papel: A4
   - Escala: padrão / 100%
   - Margens: padrão
   - Cabeçalhos e rodapés do navegador: desativados, se disponível
3. Salve o PDF.

OBSERVAÇÕES
- O rascunho fica salvo no dispositivo.
- Se o navegador for limpo manualmente, os dados locais podem ser apagados.
- Para preservar avaliações concluídas, use o botão "Salvar", que cria uma cópia no histórico local.

