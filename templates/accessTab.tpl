{**
 * plugins/generic/classicUserEditor/templates/accessTab.tpl
 *
 * Copyright (c) 2026 OJSBR (https://ojsbr.com)
 * Distributed under the GNU GPL v3. For full terms see the file docs/COPYING.
 *
 * Extra tab in Settings > Users & Roles holding the classic user grid (edit
 * given name, family name, email and roles).
 *
 * @uses $classicUserEditorGridUrl string URL of the classic grid component
 *}
<tab id="classicUserEditor" label="{translate key="plugins.generic.classicUserEditor.tab"|escape}">
	<p class="classicUserEditor__description">
		{translate key="plugins.generic.classicUserEditor.tab.description"}
	</p>
	{load_url_in_div id="classicUserEditorGridContainer" url=$classicUserEditorGridUrl inVueEl=true}
</tab>
