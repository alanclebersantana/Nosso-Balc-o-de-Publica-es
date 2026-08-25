# Nosso Balcão Publicações

Aplicativo (PWA) para controle de movimento mensal de publicações, com base no formulário **S-28-T**. Calcula estoque, entrada e saída automaticamente, sincroniza em tempo real entre vários dispositivos e exporta o formulário preenchido em PDF.

O projeto já vem **pronto** — o que falta é: (1) criar um projeto Firebase gratuito para ativar a sincronização entre dispositivos, e (2) publicar os arquivos em algum lugar com link próprio. Os dois passos abaixo levam uns 10 minutos.

---

## 1. Testar localmente (antes de publicar)

Você precisa só do Python (já vem em Mac/Linux; no Windows, instale do site oficial).

```
cd publicacoes-pwa
python3 -m http.server 8080
```

Abra `http://localhost:8080` no navegador. Nesse endereço o app já funciona por completo, inclusive o botão **Instalar** — `localhost` conta como ambiente seguro para o navegador. Sem o Firebase configurado (próximo passo), o app funciona sozinho, salvando os dados só neste navegador.

---

## 2. Criar o projeto Firebase (gratuito) — ativa a sincronização entre dispositivos

1. Acesse **https://console.firebase.google.com** e entre com uma conta Google.
2. **Adicionar projeto** → dê um nome (ex.: "publicacoes-congregacao") → pode desativar o Google Analytics (não é necessário) → **Criar projeto**.
3. No menu à esquerda, vá em **Compilação → Firestore Database** → **Criar banco de dados** → escolha uma localização (ex.: `southamerica-east1` — São Paulo) → inicie em **modo de produção**.
4. Ainda no menu, vá em **Compilação → Authentication** → **Vamos começar** → na aba "Sign-in method", habilite o provedor **E-mail/senha**. (É o que o app usa para pedir login de cada pessoa antes de liberar os dados.)
5. Clique no ícone de engrenagem (topo do menu) → **Configurações do projeto** → role até "Seus apps" → clique no ícone `</>` (Web) → dê um apelido (ex.: "app publicações") → **Registrar app**.
6. O Firebase vai mostrar um bloco `firebaseConfig = { apiKey: ..., authDomain: ..., ... }`. Copie esses valores para o arquivo **`js/firebase-config.js`** do projeto, substituindo os valores de exemplo:

```js
const FIREBASE_CONFIG = {
  apiKey: "AIza...",
  authDomain: "seu-projeto.firebaseapp.com",
  projectId: "seu-projeto",
  storageBucket: "seu-projeto.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef",
};
```

7. Ainda no console, vá em **Firestore Database → Regras** e cole:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /congregacoes/{codigo}/{documents=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

Isso permite que qualquer pessoa **com uma conta (e-mail/senha) cadastrada no app** leia e grave dados de qualquer congregação — o "código da congregação" funciona como uma chave compartilhada entre quem já tem conta. Cada pessoa cria a própria conta na primeira vez que abre o app (tela "Não tem conta? Criar uma"), com e-mail e senha à escolha dela. Se quiser controlar quem pode criar conta (por exemplo, só as pessoas responsáveis pelo lançamento), você pode desativar o cadastro público em **Authentication → Settings → User actions → desmarque "Enable create (sign-up)"** e criar as contas manualmente em **Authentication → Users → Add user**. Se quiser reforçar ainda mais a segurança (por exemplo, restringir cada conta a uma única congregação), me avise que ajusto as regras.

Pronto — salve o arquivo `js/firebase-config.js` e siga para a publicação.

---

## 3. Publicar (dar um link próprio ao app)

Qualquer uma destas opções funciona — todas são gratuitas e o app é só HTML/CSS/JS estático (não precisa de servidor especial).

### Opção A — Netlify Drop (mais simples, sem conta de programador)
1. Acesse **https://app.netlify.com/drop**
2. Arraste a pasta `publicacoes-pwa` inteira para a página.
3. Em segundos você recebe um link (ex.: `https://algum-nome.netlify.app`). Pronto, já está no ar.
4. (Opcional) Crie uma conta gratuita para poder atualizar o mesmo link depois e escolher um nome fixo.

### Opção B — GitHub Pages
1. Crie um repositório no GitHub e suba os arquivos da pasta `publicacoes-pwa` (pelo site mesmo, em "Add file → Upload files", ou via `git push`).
2. Vá em **Settings → Pages** do repositório → em "Branch", escolha `main` e pasta `/root` → **Save**.
3. O link fica algo como `https://seu-usuario.github.io/nome-do-repositorio/`.

### Opção C — Vercel
1. Acesse **https://vercel.com**, crie uma conta gratuita.
2. **Add New → Project → Upload** (ou conecte um repositório do GitHub) e aponte para a pasta `publicacoes-pwa`.
3. Deploy — você recebe um link `https://seu-projeto.vercel.app`.

Depois de publicado, abra o link no celular ou computador de quem for usar o app.

---

## 4. Instalar o app (ícone na tela / como aplicativo)

- **Android (Chrome):** abra o link → toque no menu (⋮) → **Instalar aplicativo** (ou toque no botão **Instalar** que aparece no topo do próprio app).
- **iPhone/iPad (Safari):** abra o link → toque no ícone de compartilhar (□↑) → **Adicionar à Tela de Início**.
- **Computador (Chrome/Edge):** abra o link → clique no ícone de instalação na barra de endereço, ou no botão **Instalar** dentro do app.

---

## 5. Como usar

0. Se o Firebase foi configurado (passo 2), a primeira tela pede **e-mail e senha**. Quem ainda não tem conta toca em "Não tem conta? Criar uma" e cadastra na hora (não precisa aprovação — a menos que você tenha restringido o cadastro, veja o passo 2). Depois de logado uma vez, o navegador/app lembra o login nas próximas aberturas. Sem o Firebase configurado, essa tela nem aparece — o app roda em modo local direto.
1. Na primeira vez, cada pessoa que for lançar dados abre o link e digita o **mesmo código de congregação** (ex.: `jardim-esperanca`). Quem digitar um código novo é convidado a preencher o nome da congregação, o ciclo (Setembro ou Março) e o ano de serviço, criando o registro compartilhado.
2. Na aba **Lançamento do mês**, escolha o mês em edição (o app já sugere o mês atual), use a busca para achar o item rapidamente, e preencha **Recebido** e **Estoque** — a **Saída** é calculada sozinha, em tempo real, e o mesmo valor aparece instantaneamente em qualquer outro dispositivo usando o mesmo código.
3. A aba **Visão geral** mostra a tabela completa do ciclo (como no formulário em papel), útil para conferência.
4. Os quatro cartões no topo (**Itens lançados**, **Total recebido**, **Total de saída**, **Contagens a revisar**) podem ser tocados — cada um abre a lista detalhada por publicação daquele número.
5. O botão **Exportar PDF** gera o formulário S-28-T preenchido com os dados atuais (incluindo publicações extras), pronto para imprimir ou enviar.
6. Quando o ciclo de 6 meses terminar (troca de Setembro↔Março), abra **Configurações → trocar o seletor "Ciclo"** no topo — o app arquiva os dados do ciclo encerrado e já inicia o novo ciclo com o estoque final de cada item como "estoque anterior", exatamente como ao pegar uma folha nova em papel.

### Editar offline

O app funciona normalmente sem internet: dá para abrir, navegar e preencher números com o Wi-Fi/dados desligados. Cada alteração fica guardada no próprio aparelho e é enviada sozinha, automaticamente, assim que a conexão voltar — não precisa reabrir nada nem apertar nenhum botão de "sincronizar". O indicador no topo mostra "sincronizando…" enquanto envia e "sincronizado" quando tudo já chegou ao servidor.

### Aparência

No ícone de engrenagem (Configurações) dá para escolher entre **10 cores** para o app, ligar o **modo escuro**, e aumentar/diminuir o **tamanho da fonte** — tudo isso fica salvo só neste aparelho, então cada pessoa pode preferir uma combinação diferente sem afetar as demais. O botão de lua/sol no topo também alterna o modo escuro rapidamente.

### Publicações extras

Além do catálogo oficial do S-28-T, dá para adicionar publicações que não estão na lista padrão — toque em **Adicionar publicação** no fim de qualquer categoria. Essas publicações extras entram nos cálculos, na visão geral e na exportação em PDF normalmente, e sincronizam para todo mundo que usa o mesmo código de congregação. Em **Configurações → Atualizar / importar lista de publicações** dá para exportar essa lista extra em CSV (para editar numa planilha e importar de volta), importar uma lista pronta, ou remover todas as publicações extras de uma vez — o catálogo oficial nunca é afetado por essas ações, já que ele vem embutido no código do app.

> O app não lê um PDF do S-28-T diretamente — a Sociedade não publica esse arquivo num formato que permita importação automática. Quando houver uma revisão oficial do formulário com itens novos, é só enviar o PDF novo para quem mantém o app (ou pedir para o Claude gerar uma nova versão do catálogo, se foi assim que o app foi criado).

### Atualizar catálogo oficial (revisão nova do S-28-T)

Quando a Sociedade lança uma revisão do formulário com mudanças no catálogo (itens novos, itens que saem de linha), dá para atualizar o catálogo oficial do app sem precisar editar código nem publicar uma versão nova:

1. Envie o PDF do formulário novo para quem mantém o app (ou para o Claude) e peça a lista em CSV, no mesmo formato usado para publicações extras: `categoria,titulo,sigla,codigo,kit`.
2. Em **Configurações → Atualizar / importar lista de publicações**, na seção **Atualizar catálogo oficial**, escolha esse arquivo CSV e toque em **Atualizar catálogo oficial**.
3. Antes de aplicar, o app mostra quantos itens continuam os mesmos, quantos são novos e quantos saem da lista ativa, para conferir antes de confirmar.
4. Os itens que continuam com a mesma **sigla** mantêm automaticamente todo o histórico já lançado (recebido, estoque, saída de meses anteriores) — nada precisa ser digitado de novo. Itens novos começam sem histórico. Itens que saem da lista ativa deixam de aparecer, mas os dados já lançados não são apagados.
5. Essa lista importada vale para todo mundo que usa o mesmo código de congregação (sincroniza como o resto dos dados). Para voltar ao catálogo padrão do app, use o botão **Restaurar catálogo oficial padrão** que aparece na mesma tela enquanto houver uma lista importada ativa.

---

## Estrutura do projeto

```
publicacoes-pwa/
├─ index.html              → estrutura da página
├─ manifest.json           → metadados do PWA (nome, ícone, cores)
├─ service-worker.js       → cache para funcionar offline
├─ css/style.css           → visual do app (paletas de cor, modo escuro, escala de fonte)
├─ js/
│  ├─ data.js              → catálogo de publicações (extraído do S-28-T) + cálculo
│  ├─ temas.js             → as 10 paletas de cor, modo escuro e tamanho de fonte
│  ├─ firebase-config.js   → suas chaves do Firebase (preencher no passo 2)
│  ├─ sync.js              → sincronização em tempo real / modo local
│  ├─ export.js            → geração do PDF preenchido
│  ├─ app.js               → interface e regras do app
│  └─ lib/                 → bibliotecas (Firebase, jsPDF) já incluídas, funcionam offline
└─ icons/                  → ícone do app em vários tamanhos
```

## Limitações conhecidas / possíveis melhorias futuras

- Sem o Firebase configurado, o app funciona normalmente, mas cada dispositivo guarda seus próprios dados (sem sincronizar com os demais).
- As regras de segurança sugeridas dão acesso a qualquer conta logada + o próprio "código da congregação" como chave — simples e suficiente para uso interno, mas qualquer pessoa com conta e o código pode alterar os dados (não há vínculo entre uma conta e uma congregação específica). Se isso for uma preocupação, posso implementar um controle de acesso mais restrito.
- O histórico de ciclos encerrados fica salvo (no Firestore, em `congregacoes/{codigo}/historico`), mas por enquanto só pode ser consultado diretamente no console do Firebase — uma tela dentro do app para navegar por ciclos antigos é uma boa evolução futura.
- A fonte de destaque do título ("Nosso Balcão Publicações") vem do Google Fonts e precisa de internet no primeiro acesso; depois disso o navegador guarda ela em cache. Sem internet nunca, o título aparece numa fonte cursiva parecida do próprio sistema.
- O app não lê um PDF do S-28-T diretamente. Mas dá para atualizar o catálogo oficial sem editar código nem publicar nada: gere um CSV a partir do PDF novo (peça para o Claude, por exemplo) e importe pela tela **Configurações → Atualizar / importar lista de publicações → Atualizar catálogo oficial** (veja a seção "Atualizar catálogo oficial" acima). O catálogo embutido em `js/data.js` continua sendo o padrão de fábrica — editá-lo só é necessário se você quiser mudar o que vem pronto de fábrica para todo mundo que instalar o app do zero.
