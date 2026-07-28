<?php

/**
 * @file plugins/generic/classicUserEditor/ClassicUserEditorPlugin.php
 *
 * Copyright (c) 2026 OJSBR (https://ojsbr.com)
 * Distributed under the GNU GPL v3. For full terms see the file docs/COPYING.
 *
 * @class ClassicUserEditorPlugin
 *
 * @brief Gives managers and administrators direct user editing back (given
 *        name, family name, email and roles) by adding a tab with the classic
 *        user grid to Settings > Users & Roles. The OJS 3.5 invitation manager
 *        keeps working alongside it.
 */

namespace APP\plugins\generic\classicUserEditor;

use APP\core\Application;
use PKP\core\PKPApplication;
use PKP\plugins\GenericPlugin;
use PKP\plugins\Hook;
use PKP\security\Role;
use PKP\userGroup\UserGroup;

class ClassicUserEditorPlugin extends GenericPlugin
{
    /** Classic user grid component, still shipped with pkp-lib 3.5. */
    public const USER_GRID_COMPONENT = 'grid.settings.user.UserGridHandler';

    /** The Settings > Users & Roles page. */
    public const ACCESS_PAGE_TEMPLATE = 'management/access.tpl';

    /**
     * @copydoc Plugin::register()
     *
     * @param null|mixed $mainContextId
     */
    public function register($category, $path, $mainContextId = null): bool
    {
        if (!parent::register($category, $path, $mainContextId)) {
            return false;
        }
        if (Application::isUnderMaintenance() || !$this->getEnabled($mainContextId)) {
            return true;
        }

        // Append the tab at the end of the Users & Roles page.
        Hook::add('Template::Settings::access', $this->addUsersTab(...));

        // Roles and Editorial Team in a single table, in the classic form.
        Hook::add('TemplateManager::display', $this->addAccessPageAssets(...));

        return true;
    }

    /**
     * Hook Template::Settings::access — returns the markup of an extra tab.
     * The hook is called inside the <tabs> component of management/access.tpl,
     * so the output has to be a complete <tab> element.
     *
     * @param array $args [&$params, $smarty, &$output]
     */
    public function addUsersTab(string $hookName, array $args): bool
    {
        $templateMgr = $args[1];
        $output = &$args[2];

        $request = Application::get()->getRequest();
        $context = $request->getContext();
        if (!$context) {
            return Hook::CONTINUE;
        }

        $gridUrl = $request->getDispatcher()->url(
            $request,
            PKPApplication::ROUTE_COMPONENT,
            $context->getPath(),
            self::USER_GRID_COMPONENT,
            'fetchGrid'
        );

        $templateMgr->assign('classicUserEditorGridUrl', $gridUrl);
        $output .= $templateMgr->fetch($this->getTemplateResource('accessTab.tpl'));

        return Hook::CONTINUE;
    }

    /**
     * Hook TemplateManager::display — publishes the CSS and JS that rearrange
     * the roles of the classic form on the Users & Roles page (the form opens
     * in a modal inside it). The list of roles that may appear on the Editorial
     * Team page is computed here, server-side, with the same query that builds
     * the public page.
     *
     * @param array $args [$templateMgr, &$template, &$output]
     */
    public function addAccessPageAssets(string $hookName, array $args): bool
    {
        $templateMgr = $args[0];
        $template = $args[1];

        if ($template !== self::ACCESS_PAGE_TEMPLATE) {
            return Hook::CONTINUE;
        }

        $request = Application::get()->getRequest();
        $context = $request->getContext();
        if (!$context) {
            return Hook::CONTINUE;
        }

        $settings = [
            'mastheadUserGroupIds' => $this->getMastheadUserGroupIds($context->getId()),
            'roleColumn' => __('plugins.generic.classicUserEditor.roles.column.role'),
            'mastheadColumn' => __('plugins.generic.classicUserEditor.roles.column.masthead'),
            'notEligible' => __('plugins.generic.classicUserEditor.roles.notEligible'),
            'notEligibleTitle' => __('plugins.generic.classicUserEditor.roles.notEligible.description'),
            'hint' => __('plugins.generic.classicUserEditor.roles.hint'),
        ];

        $baseUrl = $request->getBaseUrl() . '/' . $this->getPluginPath();

        $templateMgr->addStyleSheet(
            'classicUserEditorUserForm',
            "{$baseUrl}/styles/userForm.css",
            ['contexts' => ['backend']]
        );
        $templateMgr->addJavaScript(
            'classicUserEditorConfig',
            'window.classicUserEditorConfig = ' . json_encode($settings, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . ';',
            ['inline' => true, 'contexts' => ['backend']]
        );
        $templateMgr->addJavaScript(
            'classicUserEditorUserForm',
            "{$baseUrl}/js/userForm.js",
            ['contexts' => ['backend']]
        );

        return Hook::CONTINUE;
    }

    /**
     * Journal roles that may appear on the Editorial Team page: those flagged
     * for the masthead under Roles, reviewers excluded (core lists reviewers by
     * their completed reviews, not by role).
     *
     * @return int[]
     */
    public function getMastheadUserGroupIds(int $contextId): array
    {
        return UserGroup::withContextIds([$contextId])
            ->masthead(true)
            ->excludeRoles([Role::ROLE_ID_REVIEWER])
            ->get()
            ->map(fn (UserGroup $userGroup) => (int) $userGroup->id)
            ->values()
            ->all();
    }

    /**
     * @copydoc Plugin::getContextSpecificPluginSettingsFile()
     */
    public function getContextSpecificPluginSettingsFile(): string
    {
        return $this->getPluginPath() . '/settings.xml';
    }

    /**
     * @copydoc Plugin::getDisplayName()
     */
    public function getDisplayName(): string
    {
        return __('plugins.generic.classicUserEditor.displayName');
    }

    /**
     * @copydoc Plugin::getDescription()
     */
    public function getDescription(): string
    {
        return __('plugins.generic.classicUserEditor.description');
    }
}

if (!PKP_STRICT_MODE) {
    class_alias('\APP\plugins\generic\classicUserEditor\ClassicUserEditorPlugin', '\ClassicUserEditorPlugin');
}
