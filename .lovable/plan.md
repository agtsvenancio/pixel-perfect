# Trocar o logotipo de JSON para PNG

## Objetivo
O logotipo da Scase hoje está salvo como um arquivo de ponteiro `.asset.json` (imagem hospedada fora do projeto). O usuário quer a imagem como arquivo normal (PNG ou JPG) dentro do projeto.

## Passos
1. Baixar a imagem atual do logotipo (URL no `.asset.json`) e convertê-la de WebP para **PNG** (mantém a transparência do logotipo branco).
2. Salvar como `src/assets/logo-scase.png` e remover o arquivo `logo-scase.webp.asset.json`.
3. Atualizar `src/routes/index.tsx`:
   - `import logo from "@/assets/logo-scase.png"`
   - `<img src={logo} ...>` (import direto passa a ser a URL da imagem)
4. Verificar a página no navegador para confirmar que o logotipo aparece corretamente no cabeçalho.

## Detalhes técnicos
- O logotipo é usado apenas em `src/routes/index.tsx` (cabeçalho). Nenhum outro arquivo referencia o `.asset.json`.
- PNG escolhido em vez de JPG porque o logotipo tem fundo transparente; JPG ficaria com fundo branco/opaco.
- Nenhuma outra parte do site (formulário, agenda, banco de dados) é alterada.
