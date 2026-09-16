/**
 * @file cypress/tests/functional/ClassicUserEditor.cy.js
 *
 * Copyright (c) 2026 OJSBR (https://ojsbr.com)
 * Distributed under the GNU GPL v3. For full terms see the file docs/COPYING.
 *
 * Functional tests: the classic user grid and form the plugin adds to
 * Settings > Users & Roles.
 *
 * Parameters (--env): contextPath, adminUser, adminPassword (captcha on login
 * must be off for the run). The defaults match the data set of PKP's continuous
 * integration. The first test enables the plugin when it is off. Nothing is
 * saved: the user form is opened and closed. The form test needs an ordinary account of the
 * journal (editableUserId, editableUserName) and is skipped without it.
 */

describe('Classic User Editor plugin', function() {
	const contextPath = Cypress.env('contextPath') || 'publicknowledge';
	const adminUser = Cypress.env('adminUser') || 'admin';
	const adminPassword = Cypress.env('adminPassword') || 'admin';

	const row = 'classicusereditorplugin';
	// An ordinary user of the journal to open in the classic form (an administrator may not be
	// edited by another administrator), and its id in the grid.
	const editableUserId = Cypress.env('editableUserId');
	const editableUserName = Cypress.env('editableUserName');

	// ---- OJSBR spec helpers (padrão v2): work on OJS/OMP 3.3, 3.4 and 3.5 and in PKP's CI ----

	const pageUrl = (path) => '/index.php/' + contextPath + (path ? '/' + path : '');

	// Same as PKP's cy.waitJQuery(), which the support files of OJS 3.3 test sites may lack.
	// The Plugins tab can keep requests open for a while (the plugin gallery), hence the timeout.
	const waitJQuery = () => cy.window().its('jQuery.active', {timeout: 60000}).should('eq', 0);

	// Requests carry the browser's User-Agent: OJS 3.3 drops a session whose agent changes.
	const request = (options) => cy.window({log: false}).then((win) => cy.request(Object.assign(
		typeof options === 'string' ? {url: options} : options,
		{headers: Object.assign({'User-Agent': win.navigator.userAgent}, (typeof options === 'string' ? {} : options.headers) || {})}
	)));

	// Signs in through requests (the login page can re-render while it is typed into), then
	// falls back to the form when the session did not stick (OJS 3.3 cookie handling).
	const login = (username, password) => {
		cy.clearCookies();
		request(pageUrl('login')).then((response) => {
			const token = /name="csrfToken" value="([^"]+)"/.exec(response.body)[1];
			// The form posts to the URL with the language: a redirect would turn the POST into a GET.
			const action = /<form[^>]*id="login"[^>]*action="([^"]+)"/.exec(response.body)[1];
			request({method: 'POST', url: action, form: true, body: {csrfToken: token, username: username, password: password}, log: false});
		});
		cy.visit(pageUrl('submissions') + '?reload=' + Date.now());
		cy.get('body').then(($body) => {
			if ($body.find('form#login').length) {
				cy.get('form#login input[name="username"]').type(username, {delay: 0});
				cy.get('form#login input[name="password"]').type(password, {delay: 0, log: false});
				cy.get('form#login').submit();
				cy.get('form#login', {timeout: 30000}).should('not.exist');
			}
		});
	};

	// REST API calls made from the page itself, so they carry the browser's own session.
	const api = (path, options = {}) => cy.window({log: false}).then((win) => cy.wrap(
		win.fetch(path, Object.assign({credentials: 'same-origin'}, options)).then((response) => {
			if (!response.ok) {
				return response.text().then((text) => {
					throw new Error(path + ' answered ' + response.status + ': ' + text.slice(0, 300));
				});
			}
			return response.json();
		}),
		{log: false, timeout: 30000}
	));

	// The website settings page on its Plugins tab (a new query string forces a load). Load it
	// once per test: loading it again while its plugin gallery request is pending stalls the
	// web server of PKP's CI; API calls and settings modals work on the page already open.
	const openPluginsTab = () => {
		cy.visit(pageUrl('management/settings/website') + '?reload=' + Date.now() + '#plugins');
		cy.get('button[id="plugins-button"]', {timeout: 60000}).click();
		cy.get('button[id="plugins-button"]').should('have.attr', 'aria-selected', 'true');
		waitJQuery();
	};

	// Enables the plugin in the grid when it is off (never turns it off).
	const enablePlugin = (rowName) => {
		cy.get('input[id^="select-cell-' + rowName + '-enabled"]', {timeout: 30000}).then(($checkbox) => {
			if (!$checkbox.is(':checked')) {
				cy.wrap($checkbox).click();
				waitJQuery();
			}
		});
		cy.get('input[id^="select-cell-' + rowName + '-enabled"]').should('be.checked');
	};

	// Opens the settings modal from the grid, without reloading the page: a reload right
	// after saving can stall the web server of PKP's CI. The form is fetched each time.
	const openPluginSettings = (rowName, formSelector) => {
		cy.get('a[id*="-row-' + rowName + '-settings-button-"]', {timeout: 30000}).then(($link) => {
			if (!$link.is(':visible')) {
				cy.get('tr[id$="-row-' + rowName + '"] a.show_extras').first().click();
			}
		});
		// The grid may still be animating the extras row: the link is clicked once it exists.
		cy.get('a[id*="-row-' + rowName + '-settings-button-"]').first().click({force: true});
		waitJQuery();
		cy.window().should((win) => {
			expect(win.jQuery(formSelector).data('pkp.handler')).to.exist;
		});
	};

	// ---- end of helpers ----

	// The Users & Roles page, on the tab of the plugin.
	const openUsersTab = () => {
		cy.visit(pageUrl('management/settings/access') + '?reload=' + Date.now());
		cy.get('button[id="classicUserEditor-button"]', {timeout: 60000}).click();
		cy.get('#classicUserEditorGridContainer', {timeout: 60000}).should('exist');
		waitJQuery();
	};

	it('Enables the plugin', function() {
		login(adminUser, adminPassword);
		openPluginsTab();
		enablePlugin(row);
	});

	it('Lists the users of the journal', function() {
		login(adminUser, adminPassword);
		openUsersTab();
		cy.get('#classicUserEditorGridContainer table tbody tr').should('have.length.at.least', 1);
	});

	// The Roles column of the plugin also lists assignments with no start date, which is how
	// every assignment of a database upgraded from OJS 3.3 looks.
	(editableUserId && editableUserName ? it : it.skip)('Shows the roles of an assignment with no start date', function() {
		login(adminUser, adminPassword);
		api(pageUrl('api/v1/users/' + editableUserId)).then((user) => {
			const groupName = (user.groups || []).map((group) => group.name).find((name) => name);
			expect(groupName, 'a role of the user').to.be.a('string');

			openUsersTab();
			cy.get('#classicUserEditorGridContainer a[id*="search"]').first().click({force: true});
			cy.get('#classicUserEditorGridContainer form.filter input[name="search"]').invoke('val', editableUserName);
			cy.get('#classicUserEditorGridContainer form.filter').submit();
			waitJQuery();
			cy.get('#classicUserEditorGridContainer tr[id$="-row-' + editableUserId + '"]', {timeout: 30000}).should('contain', groupName);
		});
	});

	(editableUserId && editableUserName ? it : it.skip)('Opens the classic form with the roles in one table and autofill blocked', function() {
		login(adminUser, adminPassword);
		openUsersTab();
		// OJS never lets an administrator edit another administrator, so the user to open is
		// given by the caller: an ordinary account of the journal.
		cy.get('#classicUserEditorGridContainer a[id*="search"]').first().click({force: true});
		cy.get('#classicUserEditorGridContainer form.filter input[name="search"]').invoke('val', editableUserName);
		cy.get('#classicUserEditorGridContainer form.filter').submit();
		waitJQuery();

		// The row of that user, and its "edit" link action.
		cy.get('#classicUserEditorGridContainer tr[id$="-row-' + editableUserId + '"]', {timeout: 30000}).find('a.show_extras').click();
		waitJQuery();
		cy.get('#classicUserEditorGridContainer a[id*="-row-' + editableUserId + '-edit-button-"]', {timeout: 30000}).first().click({force: true});

		cy.get('#userDetailsForm', {timeout: 60000}).should('exist');
		waitJQuery();

		// The roles and the Editorial Team choice in a single table, with the core checkboxes.
		cy.get('#userDetailsForm table.classicUserEditorRoles').should('have.length', 1);
		cy.get('#userDetailsForm table.classicUserEditorRoles input[name="userGroupIds[]"]').should('have.length.at.least', 1);
		cy.get('#userDetailsForm table.classicUserEditorRoles thead th').should('have.length', 2);
		// A role that is not assigned cannot be put on the Editorial Team page.
		cy.get('#userDetailsForm table.classicUserEditorRoles tr').each(($tr) => {
			const role = $tr.find('input[name="userGroupIds[]"]');
			const masthead = $tr.find('input[name="mastheadUserGroupIds[]"]');
			if (role.length && masthead.length && !role.is(':checked')) {
				expect(masthead.is(':disabled'), 'masthead checkbox of an unassigned role').to.eq(true);
			}
		});

		// Autofill is blocked, so the logged-in person's data is not written into someone else's profile.
		cy.get('#userDetailsForm input[name="email"]').should('have.attr', 'autocomplete').and('not.eq', 'email');
		cy.get('#userDetailsForm input[name="email"]').should('have.attr', 'readonly');
		cy.get('#userDetailsForm input[name="email"]').focus().should('not.have.attr', 'readonly');

		// Closed without saving.
		cy.get('#userDetailsForm button:contains("Cancel"), #userDetailsForm a:contains("Cancel"), .pkp_modal .close, .pkp_modal button.ui-dialog-titlebar-close').first().click({force: true});
	});
});
