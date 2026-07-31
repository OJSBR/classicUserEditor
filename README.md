# Classic User Editor — OJS plugin

[![OJS](https://img.shields.io/badge/OJS-3.5-brightgreen)](https://pkp.sfu.ca/ojs/)
[![Version](https://img.shields.io/badge/version-1.0.0.0-blue)](version.xml)
[![License](https://img.shields.io/badge/license-GPL--3.0-lightgrey)](LICENSE)

**⬇️ Install package:** [OJS 3.5](https://github.com/OJSBR/classicUserEditor/releases/download/1.0.0.1/classicUserEditor-1.0.0.1.tar.gz) — or browse all [Releases](../../releases).

A generic plugin for **Open Journal Systems (OJS)** that gives journal managers and
administrators **direct editing of users** again — given name, family name, email and roles —
as in earlier OJS versions, **without patching OJS core**. The OJS 3.5 invitation manager keeps
working alongside it.

> **Developed and maintained by [OJSBR](https://ojsbr.com).** See the
> [Credits & authorship](#credits--authorship) section below.

## Compatibility & branches

| OJS version | Branch | Plugin release |
|-------------|--------|----------------|
| OJS 3.5.x   | [`stable-3_5_0`](../../tree/stable-3_5_0) *(default)* | 1.0.0.0 |

## The problem

In OJS 3.5 the *Users* tab of **Settings → Users & Roles** became the Vue components
`<user-access-manager>` and `<user-invitation-manager>`: maintaining an existing account now
depends on **invitations** (the person has to accept), and direct editing of name, email and
roles is no longer offered in the interface.

The classic user grid (`grid.settings.user.UserGridHandler`) **still ships with pkp-lib 3.5** —
it is simply not displayed any more. This plugin brings it back.

## What it does

Adds an **"Edit users (classic)"** tab to Settings → Users & Roles with the full classic grid:

- **Edit user** — given name, family name, public name, email, password, country, affiliation,
  biography, languages, **roles** and which roles appear on the Editorial Team page;
- Send email, Disable, Remove, Log in as, Merge user, Add user.

The **3.5 invitation manager is untouched** in the *Users* tab — both paths work in parallel:
invite when you want the person to confirm, edit directly when the team has to fix a record.

### Roles and Editorial Team in a single table

The *Show on the masthead* block that 3.5 bolted onto the classic form lists **every** role of
the journal, all checked (the flag is stored by negation), in a second list detached from the
roles list — including roles that never appear on the masthead, such as Author or Reader.

The plugin merges both lists into **one table**: the role on the left and, on the right, *Show on
the Editorial Team page* for that role. The right-hand column:

- only offers a checkbox for roles that can actually appear there (those flagged for the masthead
  under **Roles**, reviewers excluded — core lists reviewers by their completed reviews, not by
  role). The others show a dash with an explanation;
- stays disabled until the role itself is selected;
- **defaults to unchecked**: granting a role no longer publishes the person on the public page
  unless you say so. Core's default was the opposite.

Core's checkboxes are **moved** into the table rather than recreated, so the submitted form is
byte-for-byte what OJS expects — and if the script does not run, the original form is still
there, working.

### Browser autofill disabled

The form edits *someone else's* data, but Chrome matches fields by name and offers the logged-in
person's own values — filling URL, phone or email with data that does not belong to that account.
In the URL field this blocks saving, because the suggested value fails validation.

The plugin switches autofill off in layers: an unrecognised `autocomplete` token per field,
`new-password` on password fields (so the browser cannot inject the logged-in person's password
into the account being edited), the ignore attributes LastPass, 1Password and Dashlane honour,
and `readonly` until the first click or Tab — which is what actually stops autofill when the
modal opens. Fields stay fully editable.

## Installation

1. Download the release (or clone the branch).
2. Install via **Settings → Website → Plugins → Upload A New Plugin**, or extract the folder
   into `plugins/generic/` so you get `plugins/generic/classicUserEditor/`.
3. Enable **Classic User Editor** under the *Generic* plugins list. The tab shows up in
   **Settings → Users & Roles**.

There is nothing to configure.

## Permissions

The tab only exists on the Users & Roles page, which is reachable by journal managers and
administrators. Every action is still authorised by core itself
(`Validation::getAdministrationLevel()`), which prevents, for example, a manager of one journal
from editing an account they have no authority over.

## How it works (technical)

- The tab is added through the `Template::Settings::access` hook — the same mechanism the
  `staticPages` plugin uses for Website settings — and loads the core grid with
  `{load_url_in_div … inVueEl=true}`.
- The roles table and the autofill blocking live in `js/userForm.js`, published for the backend
  context from a `TemplateManager::display` hook on `management/access.tpl`. The list of roles
  that may appear on the Editorial Team page is computed server-side with the same query the
  public page uses (`UserGroup::masthead(true)->excludeRoles([REVIEWER])`).
- No core file is patched and nothing is stored by the plugin.

## Credits & authorship

- **Developed and maintained by** [OJSBR](https://ojsbr.com) — original plugin.
- Distributed under the **GNU GPL v3**.

## Contributing

Issues and pull requests are welcome. Please target the branch matching the OJS version you
are working against. See [`CONTRIBUTING.md`](CONTRIBUTING.md).

## License

Distributed under the **GNU GPL v3**. See [`LICENSE`](LICENSE) and `docs/COPYING`.

---

## 🇧🇷 Português

Plugin genérico para o **Open Journal Systems (OJS)** que devolve ao gerente e ao administrador a
**edição direta de usuários** — nome, sobrenome, e-mail e papéis — como nas versões anteriores do
OJS, **sem alterar o núcleo**. O gerenciador de convites do 3.5 continua funcionando em paralelo.

> **Desenvolvido e mantido pela [OJSBR](https://ojsbr.com).** Veja a seção
> [Créditos e autoria](#créditos-e-autoria) abaixo.

### Compatibilidade e branches

| Versão do OJS | Branch | Release do plugin |
|---------------|--------|-------------------|
| OJS 3.5.x     | `stable-3_5_0` *(padrão)* | 1.0.0.0 |

### O problema

No OJS 3.5 a aba *Usuários* de **Configurações → Usuários e Papéis** passou a ser o componente
Vue `<user-access-manager>` junto do `<user-invitation-manager>`: a manutenção de contas
existentes passou a depender de **convites** (a pessoa precisa aceitar), e a edição direta de
nome, e-mail e papéis deixou de ser oferecida na interface.

A grade clássica de usuários (`grid.settings.user.UserGridHandler`) **continua no pkp-lib 3.5** —
apenas deixou de ser exibida. Este plugin volta a exibi-la.

### O que faz

Acrescenta uma aba **"Editar usuários (clássico)"** em Configurações → Usuários e Papéis, com a
grade clássica completa:

- **Editar usuário** — nome próprio, sobrenome, nome público, e-mail, senha, país, afiliação,
  biografia, idiomas, **papéis** e quais papéis aparecem na Equipe Editorial;
- Enviar e-mail, Desabilitar, Remover, Acessar Como, Mesclar usuário, Incluir usuário.

O **gerenciador de convites do 3.5 continua intacto** na aba *Usuários* — os dois caminhos
funcionam em paralelo: convite quando você quer a confirmação da pessoa, edição direta quando a
equipe precisa corrigir um cadastro.

#### Papéis e Equipe Editorial em uma tabela só

O bloco *Aparecer no expediente* que o 3.5 acrescentou ao formulário clássico lista **todos** os
papéis da revista, todos marcados (a marcação é por negação), em uma segunda lista separada da
lista de papéis — inclusive papéis que nunca aparecem no expediente, como Autor ou Leitor.

O plugin reorganiza as duas listas em **uma tabela só**: o papel à esquerda e, à direita, a opção
*Exibir na Equipe Editorial* naquele papel. A coluna da direita:

- só oferece a caixa nos papéis que podem mesmo aparecer na página Equipe Editorial (os marcados
  como expediente em **Papéis**, sem os de avaliador — o núcleo lista avaliadores pelos pareceres
  concluídos, não pelo papel). Nos demais aparece um travessão com a explicação;
- fica desabilitada enquanto o papel não estiver marcado;
- **nasce desmarcada**: ao conceder um papel, a pessoa não vai para a página pública a menos que
  se marque explicitamente. O padrão do núcleo era o contrário.

As caixas do núcleo são **movidas** para a tabela, não recriadas — o que o formulário envia
continua exatamente o que o OJS espera, e se o script não rodar o formulário original continua
ali, funcionando.

#### Preenchimento automático do navegador desligado

O formulário edita os dados de **outra pessoa**, mas o Chrome casa os campos pelo nome e sugere os
dados de quem está logado — enchendo URL, telefone ou e-mail com valores que não pertencem àquela
conta. No campo URL isso trava a gravação, porque o valor sugerido não passa na validação.

O plugin desliga a sugestão em camadas: `autocomplete` com um valor que o navegador não reconhece
em cada campo, `new-password` nos campos de senha (para o navegador não injetar a senha de quem
está logado na conta editada), os atributos que LastPass, 1Password e Dashlane respeitam, e
`readonly` até o primeiro clique ou Tab — que é o que de fato impede o preenchimento na abertura
do modal. Os campos seguem editáveis normalmente.

### Instalação

Instale em **Configurações → Website → Plugins → Enviar um novo plugin**, ou extraia a pasta em
`plugins/generic/` (ficando `plugins/generic/classicUserEditor/`). Depois ative a **Edição
Clássica de Usuários** na lista de plugins *Genéricos*. A aba aparece em **Configurações →
Usuários e Papéis**. Não há nada para configurar.

### Permissões

A aba só existe na página Usuários e Papéis, acessível a gerentes da revista e administradores.
Cada ação continua validada pelo próprio núcleo (`Validation::getAdministrationLevel()`).

### Idiomas

Interface do plugin traduzida em **português (Brasil), inglês, espanhol, francês, italiano e
alemão**.

### Créditos e autoria

- **Desenvolvido e mantido pela** [OJSBR](https://ojsbr.com) — plugin autoral.
- Distribuído sob a **GNU GPL v3**.

### Licença

Distribuído sob a **GNU GPL v3**. Veja [`LICENSE`](LICENSE) e `docs/COPYING`.
