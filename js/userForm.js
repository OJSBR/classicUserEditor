/**
 * plugins/generic/classicUserEditor/js/userForm.js
 *
 * Copyright (c) 2026 OJSBR (https://ojsbr.com)
 * Distributed under the GNU GPL v3. For full terms see the file docs/COPYING.
 *
 * Two adjustments to the classic user form:
 *
 * 1. Merges the two role lists ("Roles" and "Show on the masthead") into a
 *    single table: the role on the left and, on the right, whether the person
 *    is shown on the Editorial Team page in that role — unchecked by default.
 *    Core's checkboxes are NOT recreated: they are moved into the table, so
 *    what the form submits stays exactly what OJS expects.
 *
 * 2. Turns off browser autofill on the fields. The form edits SOMEONE ELSE'S
 *    data, so Chrome's suggestion (which matches by field name) fills URL,
 *    phone and email with the logged-in person's values — and a value that is
 *    not a URL blocks saving.
 *
 * If this script does not run, core's form is still there, untouched.
 */
(function () {
	'use strict';

	var DONE_ATTRIBUTE = 'data-classic-user-editor';

	function config() {
		return window.classicUserEditorConfig || null;
	}

	/** Role label, read from the <label> wrapping the checkbox in core's template. */
	function roleLabel(input) {
		var item = input.closest('li');
		return item ? item.textContent.replace(/\s+/g, ' ').trim() : input.value;
	}

	function buildTable(form, settings) {
		var roleInputs = form.querySelectorAll('input[name="userGroupIds[]"]');
		var mastheadInputs = form.querySelectorAll('input[name="mastheadUserGroupIds[]"]');
		if (!roleInputs.length || !mastheadInputs.length) {
			return;
		}

		// Original sections, captured before moving any checkbox.
		var sections = [];
		[roleInputs[0], mastheadInputs[0]].forEach(function (input) {
			var section = input.closest('.section');
			var wrapper = section ? section.parentNode.closest('.section') : null;
			if (wrapper) {
				sections.push(wrapper);
			} else if (section) {
				sections.push(section);
			}
		});
		if (!sections.length) {
			return;
		}

		var mastheadById = {};
		Array.prototype.forEach.call(mastheadInputs, function (input) {
			mastheadById[input.value] = input;
		});

		var table = document.createElement('table');
		table.className = 'classicUserEditorRoles';

		var caption = document.createElement('caption');
		caption.textContent = settings.hint;
		table.appendChild(caption);

		var head = document.createElement('thead');
		var headRow = document.createElement('tr');
		[settings.roleColumn, settings.mastheadColumn].forEach(function (text) {
			var cell = document.createElement('th');
			cell.setAttribute('scope', 'col');
			cell.textContent = text;
			headRow.appendChild(cell);
		});
		head.appendChild(headRow);
		table.appendChild(head);

		var body = document.createElement('tbody');

		Array.prototype.forEach.call(roleInputs, function (roleInput) {
			var userGroupId = parseInt(roleInput.value, 10);
			var label = roleLabel(roleInput);
			var mastheadInput = mastheadById[roleInput.value];
			var eligible = settings.mastheadUserGroupIds.indexOf(userGroupId) !== -1;

			var row = document.createElement('tr');

			var roleCell = document.createElement('td');
			var roleLabelEl = document.createElement('label');
			roleLabelEl.appendChild(roleInput);
			roleLabelEl.appendChild(document.createTextNode(' ' + label));
			roleCell.appendChild(roleLabelEl);
			row.appendChild(roleCell);

			var mastheadCell = document.createElement('td');
			mastheadCell.className = 'classicUserEditorRoles__masthead';

			if (mastheadInput && eligible) {
				// A role that is not assigned yet starts off the Editorial Team page.
				if (!roleInput.checked) {
					mastheadInput.checked = false;
					mastheadInput.disabled = true;
				}
				mastheadInput.removeAttribute('disabled');
				mastheadInput.disabled = !roleInput.checked;

				var mastheadLabel = document.createElement('label');
				mastheadLabel.appendChild(mastheadInput);
				mastheadLabel.appendChild(document.createElement('span'));
				mastheadLabel.lastChild.className = 'pkp_screen_reader';
				mastheadLabel.lastChild.textContent = settings.mastheadColumn + ': ' + label;
				mastheadCell.appendChild(mastheadLabel);

				roleInput.addEventListener('change', function () {
					mastheadInput.disabled = !roleInput.checked;
					if (!roleInput.checked) {
						mastheadInput.checked = false;
					}
				});
			} else {
				// Role that never shows on the Editorial Team page (or a reviewer role).
				if (mastheadInput) {
					mastheadInput.checked = false;
					mastheadInput.disabled = true;
				}
				mastheadCell.textContent = settings.notEligible;
				mastheadCell.title = settings.notEligibleTitle;
			}

			row.appendChild(mastheadCell);
			body.appendChild(row);
		});

		table.appendChild(body);

		sections[0].parentNode.insertBefore(table, sections[0]);
		sections.forEach(function (section) {
			section.style.display = 'none';
		});
	}

	/**
	 * Turns off autofill, both from the browser and from password managers.
	 * Three layers are needed because Chrome ignores `autocomplete="off"` when
	 * it believes it recognises the field by its name:
	 *
	 * - an `autocomplete` value it does not know, per field;
	 * - `new-password` on password fields, so the logged-in person's password
	 *   is never injected into the account being edited;
	 * - `readonly` until the first focus, which is what actually prevents the
	 *   suggestion when the modal opens (the field becomes editable again on
	 *   click or Tab).
	 */
	function blockAutofill(form) {
		form.setAttribute('autocomplete', 'off');

		var fields = form.querySelectorAll('input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]):not([type="submit"]), textarea');
		Array.prototype.forEach.call(fields, function (field, index) {
			var isPassword = field.type === 'password';

			field.setAttribute('autocomplete', isPassword ? 'new-password' : 'classic-user-editor-' + index);
			field.setAttribute('data-lpignore', 'true');
			field.setAttribute('data-1p-ignore', 'true');
			field.setAttribute('data-form-type', 'other');

			if (field.readOnly || field.disabled) {
				return;
			}
			field.readOnly = true;
			var release = function () {
				field.readOnly = false;
				field.removeEventListener('focus', release);
				field.removeEventListener('mousedown', release);
			};
			field.addEventListener('focus', release);
			field.addEventListener('mousedown', release);
		});
	}

	function enhance(root) {
		var settings = config();
		if (!settings) {
			return;
		}
		var forms = root.querySelectorAll ? root.querySelectorAll('#userDetailsForm') : [];
		Array.prototype.forEach.call(forms, function (form) {
			if (!form.hasAttribute(DONE_ATTRIBUTE)) {
				form.setAttribute(DONE_ATTRIBUTE, 'done');
				try {
					blockAutofill(form);
					buildTable(form, settings);
				} catch (e) {
					// On error, core's form stays usable.
					form.setAttribute(DONE_ATTRIBUTE, 'failed');
				}
			}
		});
	}

	function watch() {
		enhance(document);
		var observer = new MutationObserver(function (mutations) {
			mutations.forEach(function (mutation) {
				Array.prototype.forEach.call(mutation.addedNodes, function (node) {
					if (node.nodeType === 1) {
						if (node.id === 'userDetailsForm') {
							enhance(node.parentNode || document);
						} else {
							enhance(node);
						}
					}
				});
			});
		});
		observer.observe(document.body, {childList: true, subtree: true});
	}

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', watch);
	} else {
		watch();
	}
})();
