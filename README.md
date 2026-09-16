# Classic User Editor — OJS and OMP plugin

[![OJS](https://img.shields.io/badge/OJS-3.5-brightgreen)](https://pkp.sfu.ca/ojs/)
[![OMP](https://img.shields.io/badge/OMP-3.5-brightgreen)](https://pkp.sfu.ca/omp/)
[![Version](https://img.shields.io/badge/version-1.0.2.0-blue)](version.xml)
[![License](https://img.shields.io/badge/license-GPL--3.0-lightgrey)](LICENSE)

**⬇️ Install package:** [OJS / OMP 3.5](https://github.com/OJSBR/classicUserEditor/releases/download/1.0.2.0/classicUserEditor-1.0.2.0.tar.gz) — or browse all [Releases](../../releases).

A generic plugin for **Open Journal Systems (OJS)** and **Open Monograph Press (OMP)** that
gives managers and administrators **direct editing of users** again — given name, family name,
email and roles — as in earlier versions, **without patching the core**. The 3.5 invitation
manager keeps working alongside it.

> **Developed and maintained by [OJSBR](https://ojsbr.com).** See the
> [Credits & authorship](#credits--authorship) section below.

## Compatibility & branches

| Application | Branch | Plugin release |
|-------------|--------|----------------|
| OJS 3.5.x and OMP 3.5.x | [`stable-3_5_0`](../../tree/stable-3_5_0) *(default)* | 1.0.2.0 |

> Since 1.0.2.0 the same package serves OJS and OMP. The former `classicUserEditorOmp`
> repository is archived; its releases stay available there.

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

### Roles column on databases upgraded from OJS 3.3

Core fills the *Roles* column of this grid through
`UserUserGroup::scopeWithActiveAndActiveInFuture()`, which opens with
`whereNotNull('date_start')`. The migration that created that column
(`I9462_UserUserGroupsStartEndDate`) only adds it and never fills it in for the assignments that
already existed, so on a database upgraded from OJS 3.3 practically every row has an empty
`date_start` and the column comes out **empty for every user**.

The plugin therefore serves the grid through its own `ClassicUserGridHandler`, which replaces that
single column with a query that reads an empty `date_start` as active — the same reading core's own
`scopeWithActive()` applies to sign-in, permissions and the Editorial Team page. Nothing else in the
grid changes, and no core file is touched.

On a fresh OJS 3.5 install the question does not arise: assignments created by 3.5 already carry a
start date.

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
  `staticPages` plugin uses for Website settings — and loads the grid with
  `{load_url_in_div … inVueEl=true}`.
- The grid is served by the plugin's own `ClassicUserGridHandler`, registered through the
  `LoadComponentHandler` hook and subclassing core's `UserGridHandler`. Since
  `GridHandler::addColumn()` indexes the columns by id, only the *Roles* column is replaced.
- The roles table and the autofill blocking live in `js/userForm.js`, published for the backend
  context from a `TemplateManager::display` hook on `management/access.tpl`. The list of roles
  that may appear on the Editorial Team page is computed server-side with the same query the
  public page uses (`UserGroup::masthead(true)->excludeRoles([REVIEWER])`).
- No core file is patched and nothing is stored by the plugin.

## A documented exception to the OJSBR plugin standard

Our own standard asks plugins to leave the core interface alone. This plugin's
`js/userForm.js` does rearrange the core user form: it moves the two role checkbox lists into a
single table (the checkboxes themselves are moved, never rebuilt, so the form submits exactly
what OJS expects) and it turns off browser autofill on the fields, because the form edits
someone else's account and Chrome fills it with the logged-in person's data — a value that is
not a URL blocks saving. OJS 3.5 offers no hook inside that form.

The exception is deliberate and bounded: the script only touches `#userDetailsForm`, it creates
no field, and any error leaves the core form untouched and usable. **Because of it, this plugin
is not submitted to the PKP plugin gallery**; it is distributed from this repository.

## Tests

- **PHPUnit** (`tests/*Test.php`, on `PKP\tests\PKPTestCase`): the class against the installed
  PKP, the plugin found by PKP's plugin registry, the grid being the core one with the plugin's
  Roles column, only the plugin's component answered by the `LoadComponentHandler` hook, the
  roles offered for the Editorial Team page (reviewers left out), what the form script may do
  (no field created, the core form left usable on error), the tab markup, and the 38
  translations. From the OJS root:

  ```bash
  lib/pkp/lib/vendor/bin/phpunit --configuration lib/pkp/tests/phpunit.xml --no-coverage "$PWD/plugins/generic/classicUserEditor/tests"
  ```

- **Cypress** (`cypress/tests/functional/ClassicUserEditor.cy.js`, run by
  [pkp-github-actions](https://github.com/pkp/pkp-github-actions) on every push): enables the
  plugin and lists the users of the journal in the plugin's tab. Given an ordinary account of
  the journal (`editableUserId`, `editableUserName`), it also checks that the Roles column shows
  an assignment with no start date — the state of every assignment in a database upgraded from
  OJS 3.3 — and that the classic form opens with the roles in a single table, with the Editorial
  Team checkbox disabled for a role that is not assigned, and with autofill blocked. Nothing is
  saved: the form is opened and closed. Each check fails with the part it covers removed.
- Verified on OJS 3.5.0.3 and OMP 3.5.0.3, each with the whole suite.

Tests are kept in the repository and are not part of the release package.

## Credits & authorship

- **Developed and maintained by** [OJSBR](https://ojsbr.com) — original plugin.
- Distributed under the **GNU GPL v3**.

## AI use

Generative AI (Claude, by Anthropic) was used to write and run tests, improve the code and bring
it in line with PKP standards. Every change is reviewed and tested by OJSBR, which is responsible
for the published releases.

## Contributing

Issues and pull requests are welcome. Please target the branch matching the OJS version you
are working against. See [`CONTRIBUTING.md`](CONTRIBUTING.md).

## License

Distributed under the **GNU GPL v3**. See [`LICENSE`](LICENSE) and `docs/COPYING`.

---

## 🇧🇷 Português

Plugin genérico para o **Open Journal Systems (OJS)** e o **Open Monograph Press (OMP)** que
devolve ao gerente e ao administrador a **edição direta de usuários** — nome, sobrenome, e-mail e
papéis — como nas versões anteriores, **sem alterar o núcleo**. O gerenciador de convites do 3.5
continua funcionando em paralelo.

> **Desenvolvido e mantido pela [OJSBR](https://ojsbr.com).** Veja a seção
> [Créditos e autoria](#créditos-e-autoria) abaixo.

### Compatibilidade e branches

| Aplicação | Branch | Release do plugin |
|-----------|--------|-------------------|
| OJS 3.5.x e OMP 3.5.x | `stable-3_5_0` *(padrão)* | 1.0.2.0 |

> A partir da 1.0.2.0 o mesmo pacote serve OJS e OMP. O repositório `classicUserEditorOmp`
> está arquivado; as releases dele continuam disponíveis lá.

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

### Coluna Papéis em bases migradas do OJS 3.3

O núcleo preenche a coluna *Papéis* desta grade com
`UserUserGroup::scopeWithActiveAndActiveInFuture()`, que começa por
`whereNotNull('date_start')`. A migração que criou essa coluna
(`I9462_UserUserGroupsStartEndDate`) apenas a acrescenta e nunca a preenche para as designações que
já existiam — então, numa base migrada do OJS 3.3, praticamente toda linha fica com `date_start`
vazio e a coluna sai **vazia para todos os usuários**.

Por isso o plugin serve a grade pelo seu próprio `ClassicUserGridHandler`, que troca só essa coluna
por uma consulta que lê `date_start` vazio como ativo — a mesma leitura que o `scopeWithActive()` do
núcleo aplica ao login, às permissões e à página Equipe Editorial. O resto da grade não muda, e
nenhum arquivo do núcleo é alterado.

Em instalação nova do OJS 3.5 o problema não existe: as designações criadas pelo 3.5 já nascem com
data de início.

### Instalação

Instale em **Configurações → Website → Plugins → Enviar um novo plugin**, ou extraia a pasta em
`plugins/generic/` (ficando `plugins/generic/classicUserEditor/`). Depois ative a **Edição
Clássica de Usuários** na lista de plugins *Genéricos*. A aba aparece em **Configurações →
Usuários e Papéis**. Não há nada para configurar.

### Permissões

A aba só existe na página Usuários e Papéis, acessível a gerentes da revista e administradores.
Cada ação continua validada pelo próprio núcleo (`Validation::getAdministrationLevel()`).

### Idiomas

Nome, descrição e textos do plugin nos **38 idiomas** do conjunto padrão da PKP (revisados em
inglês, português, espanhol, catalão, galego, francês, italiano, alemão e holandês; os demais ficam
marcados para revisão).

### Uma exceção documentada ao padrão de plugins da OJSBR

Nosso padrão pede que o plugin não mexa na interface do núcleo. O `js/userForm.js` deste plugin
mexe: junta as duas listas de checkboxes de papéis numa tabela só (os checkboxes são movidos, nunca
recriados, então o formulário envia exatamente o que o OJS espera) e desliga o autopreenchimento do
navegador nos campos, porque o formulário edita a conta de outra pessoa e o Chrome a preenche com os
dados de quem está logado — e um valor que não é URL impede salvar. O OJS 3.5 não oferece hook
dentro desse formulário.

A exceção é deliberada e limitada: o script só toca no `#userDetailsForm`, não cria campo nenhum, e
qualquer erro deixa o formulário do núcleo intacto e utilizável. **Por causa dela, este plugin não é
submetido à galeria de plugins da PKP**; ele é distribuído por este repositório.

### Testes

PHPUnit em `tests/` (sobre `PKP\tests\PKPTestCase`) e Cypress em `cypress/tests/functional/`
(rodado pelo [pkp-github-actions](https://github.com/pkp/pkp-github-actions) a cada push), com o
comando da seção em inglês. A suíte cobre a classe contra o PKP instalado, o plugin encontrado pelo
registro de plugins, a grade sendo a do núcleo com a coluna Papéis do plugin, só o componente do
plugin respondido no hook `LoadComponentHandler`, os papéis oferecidos para a página Equipe
Editorial (sem os de avaliador), o que o script do formulário pode fazer (não cria campo e deixa o
formulário do núcleo utilizável em caso de erro), a marcação da aba e as 38 traduções. O Cypress
liga o plugin e lista os usuários na aba do plugin; com uma conta comum da revista
(`editableUserId`, `editableUserName`), confere ainda que a coluna Papéis mostra designação sem data
de início — como ficam todas numa base migrada do OJS 3.3 — e que o formulário clássico abre com os
papéis numa tabela só, com o checkbox da Equipe Editorial desabilitado para papel não atribuído e com
o autopreenchimento bloqueado; nada é salvo. Verificado no OJS 3.5.0.3 e no OMP 3.5.0.3, com a suíte inteira em cada um.

Os testes ficam no repositório e não fazem parte do pacote da release.

### Créditos e autoria

- **Desenvolvido e mantido pela** [OJSBR](https://ojsbr.com) — plugin autoral.
- Distribuído sob a **GNU GPL v3**.

### Uso de IA

Foi usada IA generativa (Claude, da Anthropic) para escrever e rodar testes, melhorar o código e
alinhá-lo aos padrões da PKP. Toda mudança é revisada e testada pela OJSBR, que responde pelas
releases publicadas.

### Licença

Distribuído sob a **GNU GPL v3**. Veja [`LICENSE`](LICENSE) e `docs/COPYING`.
