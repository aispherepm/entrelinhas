# Entrelinhas

Diário pessoal em português, feito para o iPhone. Funciona como app da Tela de Início (PWA) e abre sem internet depois da primeira visita.

## Arquivos

| Arquivo | Para que serve |
|---|---|
| `index.html` | Estrutura das telas: Escrever, Registros, detalhe e Seus dados |
| `styles.css` | Visual de papel pautado em tons de terracota, sempre claro |
| `app.js` | Toda a lógica: guardar, listar, abrir, copiar, apagar, exportar e importar |
| `sw.js` | Service worker que guarda os arquivos do app para abrir sem conexão |
| `manifest.json` | Nome, cores e ícones para a instalação na Tela de Início |
| `icons/` | Logo e ícones do app (180, 192 e 512 px) |
| `fonts/` | Fontes Instrument Serif, Newsreader e Figtree, guardadas no próprio app para funcionar sem internet |

Os registros ficam somente no armazenamento local do navegador (chave `entrelinhas.registros.v1`). Nada é enviado para nenhum servidor. Não há analytics, anúncios nem rastreadores.

## Abrir no computador

Para só experimentar, dê dois cliques em `index.html`. Escrever e guardar funcionam; o modo sem internet não, porque ele exige um endereço https.

## Colocar no iPhone

O iPhone só instala um PWA a partir de um endereço **https** na internet. Sem GitHub, o caminho mais simples é o Netlify:

1. Crie uma conta gratuita em netlify.com.
2. No painel, escolha **Add new site** e depois a opção de **arrastar e soltar uma pasta** (deploy manually).
3. Arraste a pasta `entrelinhas` inteira (descompactada) para a área indicada.
4. Aguarde a mensagem de publicação. O Netlify mostra um endereço parecido com `https://nome-aleatorio.netlify.app`. Se quiser, troque o nome em **Site configuration → Change site name**.
5. No iPhone, abra esse endereço no **Safari**.
6. Toque em **Compartilhar** (quadrado com seta) → **Adicionar à Tela de Início** → **Adicionar**.
7. A partir daí, use sempre o ícone da Tela de Início. O app instalado guarda os registros separado do Safari.

Observação de privacidade: o endereço fica público, mas ele só entrega o app vazio. Os registros nunca saem do seu iPhone.

## Cuidados com os dados

- Remover o ícone da Tela de Início ou apagar os dados de sites no iPhone pode apagar os registros.
- Use **Seus dados → Exportar registros** de vez em quando e guarde o arquivo em local seguro. Ele não é criptografado.
- Para levar os registros a outro aparelho, exporte em um e importe no outro. Registros repetidos não são duplicados.

## Atualizar o app no futuro

Altere os arquivos, troque `entrelinhas-v1` por `entrelinhas-v2` dentro de `sw.js` e publique de novo arrastando a pasta no Netlify (aba **Deploys**). Os registros já guardados continuam no iPhone.
