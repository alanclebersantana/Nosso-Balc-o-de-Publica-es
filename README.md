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
4. Ainda no menu, vá em **Compilação → Authentication** → **Vamos começar** → na aba "Sign-in method", habilite o provedor **Anônimo**. (É o que permite que o app grave dados sem exigir login/senha das pessoas que forem lançar as contagens.)
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

Isso permite que qualquer pessoa **autenticada anonimamente pelo app** (ou seja, qualquer pessoa que abra o app) leia e grave dados. Não é preciso senha para simplificar o uso em campo — o "código da congregação" funciona como uma chave compartilhada. Se quiser reforçar a segurança (por exemplo, restringir a um conjunto fixo de códigos), me avise que ajusto as regras.

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

1. Na primeira vez, cada pessoa que for lançar dados abre o link e digita o **mesmo código de congregação** (ex.: `jardim-esperanca`). Quem digitar um código novo é convidado a preencher o nome da congregação, o ciclo (Setembro ou Março) e o ano de serviço, criando o registro compartilhado.
2. Na aba **Lançamento do mês**, escolha o mês em edição (o app já sugere o mês atual), use a busca para achar o item rapidamente, e preencha **Recebido** e **Estoque** — a **Saída** é calculada sozinha, em tempo real, e o mesmo valor aparece instantaneamente em qualquer outro dispositivo usando o mesmo código.
3. A aba **Visão geral** mostra a tabela completa do ciclo (como no formulário em papel), útil para conferência.
4. Os quatro cartões no topo (**Itens lançados**, **Total recebido**, **Total de saída**, **Contagens a revisar**) podem ser tocados — cada um abre a lista detalhada por publicação daquele número.
5. O botão **Exportar PDF** gera o formulário S-28-T preenchido com os dados atuais (incluindo publicações extras), pronto para imprimir ou enviar.
6. Quando o ciclo de 6 meses terminar (troca de Setembro↔Março), abra **Configurações → trocar o seletor "Ciclo"** no topo — o app arquiva os dados do ciclo encerrado e já inicia o novo ciclo com o estoque final de cada item como "estoque anterior", exatamente como ao pegar uma folha nova em papel.

### Aparência

No ícone de engrenagem (Configurações) dá para escolher entre **10 cores** para o app, ligar o **modo escuro**, e aumentar/diminuir o **tamanho da fonte** — tudo isso fica salvo só neste aparelho, então cada pessoa pode preferir uma combinação diferente sem afetar as demais. O botão de lua/sol no topo também alterna o modo escuro rapidamente.

### Publicações extras

Além do catálogo oficial do S-28-T, dá para adicionar publicações que não estão na lista padrão — toque em **Adicionar publicação** no fim de qualquer categoria. Essas publicações extras entram nos cálculos, na visão geral e na exportação em PDF normalmente, e sincronizam para todo mundo que usa o mesmo código de congregação. Em **Configurações → Atualizar / importar lista de publicações** dá para exportar essa lista extra em CSV (para editar numa planilha e importar de volta), importar uma lista pronta, ou remover todas as publicações extras de uma vez — o catálogo oficial nunca é afetado por essas ações, já que ele vem embutido no código do app.

> O app não lê um PDF do S-28-T diretamente — a Sociedade não publica esse arquivo num formato que permita importação automática. Quando houver uma revisão oficial do formulário com itens novos, é só enviar o PDF novo para quem mantém o app (ou pedir para o Claude gerar uma nova versão do catálogo, se foi assim que o app foi criado).

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
- As regras de segurança sugeridas usam login anônimo + o próprio "código da congregação" como chave de acesso — simples e suficiente para uso interno, mas não impede que alguém com o código altere os dados. Se isso for uma preocupação, posso implementar um controle de acesso mais restrito.
- O histórico de ciclos encerrados fica salvo (no Firestore, em `congregacoes/{codigo}/historico`), mas por enquanto só pode ser consultado diretamente no console do Firebase — uma tela dentro do app para navegar por ciclos antigos é uma boa evolução futura.
- A fonte de destaque do título ("Nosso Balcão Publicações") vem do Google Fonts e precisa de internet no primeiro acesso; depois disso o navegador guarda ela em cache. Sem internet nunca, o título aparece numa fonte cursiva parecida do próprio sistema.
- O catálogo oficial do S-28-T está embutido no código (`js/data.js`) — atualizações da Sociedade exigem editar esse arquivo (ou pedir para o Claude regenerá-lo a partir do PDF novo), já que não há como importar o PDF automaticamente pelo app.
