# 🏓 Ténis de Mesa – Ranking PWA

App de ranking para o grupo de ténis de mesa. Funciona offline e pode ser instalada no telemóvel como PWA.

---

## 🚀 Como colocar online (GitHub Pages)

### Passo 1 — Criar conta no GitHub
Vai a **github.com** e cria uma conta gratuita (se ainda não tens).

### Passo 2 — Criar repositório
1. Clica em **"New repository"** (botão verde)
2. Nome sugerido: `tenis-mesa`
3. Selecciona **Public**
4. Clica **"Create repository"**

### Passo 3 — Fazer upload dos ficheiros
1. Na página do repositório, clica em **"uploading an existing file"**
2. Arrasta todos estes ficheiros de uma vez:
   - `index.html`
   - `app.js`
   - `manifest.json`
   - `sw.js`
   - `icon-192.png`
   - `icon-512.png`
3. Clica **"Commit changes"**

### Passo 4 — Activar GitHub Pages
1. Vai a **Settings** (no repositório)
2. No menu lateral, clica em **Pages**
3. Em "Source", selecciona **"Deploy from a branch"**
4. Branch: **main**, pasta: **/ (root)**
5. Clica **Save**

### Passo 5 — Aguardar (1-2 minutos)
O link aparece na mesma página:
```
https://SEU-UTILIZADOR.github.io/tenis-mesa/
```

---

## 📱 Instalar no iPhone como PWA

1. Abre o link no **Safari** (obrigatório no iPhone)
2. Toca no ícone de **Partilhar** (quadrado com seta para cima)
3. Selecciona **"Adicionar ao Ecrã de Início"**
4. Dá o nome **"TM Ranking"** e confirma
5. A app aparece no ecrã principal como qualquer outra app!

## 📱 Instalar no Android como PWA

1. Abre o link no **Chrome**
2. O Chrome mostra automaticamente um banner **"Instalar app"**
3. Ou toca nos **⋮ três pontos** → **"Adicionar ao ecrã inicial"**

---

## ✨ Funcionalidades

- 🏆 **Ranking** em tempo real com última actualização
- ⚡ **Desafios** — vê quem podes desafiar (até 3 lugares acima)
- 🎮 **Registar resultados** — aplica automaticamente as regras 10 e 11
- 🚫 **Faltas** — processa não comparências com a regra 13
- 📜 **Historial** completo exportável em .txt
- 💾 **Guarda automaticamente** no telemóvel (localStorage)
- 📴 **Funciona offline** após a primeira visita

---

## 🔄 Actualizar a app

Quando houver alterações (novos resultados, nova jornada), basta:
1. Ir ao repositório no GitHub
2. Clicar no ficheiro `app.js`
3. Clicar no lápis ✏️ para editar
4. Fazer as alterações e **"Commit changes"**

A app actualiza automaticamente para todos os utilizadores.
