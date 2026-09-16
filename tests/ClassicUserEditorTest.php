<?php

/**
 * @file plugins/generic/classicUserEditor/tests/ClassicUserEditorTest.php
 *
 * Copyright (c) 2026 OJSBR (https://ojsbr.com)
 * Distributed under the GNU GPL v3. For full terms see the file docs/COPYING.
 *
 * @class ClassicUserEditorTest
 *
 * @brief The grid the plugin serves, the roles offered for the Editorial Team
 *        page, and what the script of the user form may do.
 */

namespace APP\plugins\generic\classicUserEditor\tests;

use APP\plugins\generic\classicUserEditor\ClassicUserEditorPlugin;
use APP\plugins\generic\classicUserEditor\controllers\grid\ClassicUserGridHandler;
use PHPUnit\Framework\Attributes\CoversClass;
use PKP\controllers\grid\settings\user\UserGridHandler;
use PKP\plugins\Hook;
use PKP\security\Role;
use PKP\tests\PKPTestCase;
use PKP\userGroup\UserGroup;

#[CoversClass(ClassicUserEditorPlugin::class)]
#[CoversClass(ClassicUserGridHandler::class)]
class ClassicUserEditorTest extends PKPTestCase
{
    public function testTheGridIsTheCoreOneWithOurRolesColumn(): void
    {
        $this->assertTrue(is_subclass_of(ClassicUserGridHandler::class, UserGridHandler::class));
        $this->assertSame(
            'plugins.generic.classicUserEditor.controllers.grid.ClassicUserGridHandler',
            ClassicUserEditorPlugin::USER_GRID_COMPONENT
        );
    }

    public function testOnlyTheComponentOfThePluginIsAnswered(): void
    {
        $plugin = new ClassicUserEditorPlugin();

        $component = ClassicUserEditorPlugin::USER_GRID_COMPONENT;
        $op = 'fetchGrid';
        $instance = null;
        $this->assertSame(Hook::ABORT, $plugin->setupGridHandler('LoadComponentHandler', [&$component, &$op, &$instance]));
        $this->assertInstanceOf(ClassicUserGridHandler::class, $instance);

        $other = 'grid.settings.user.UserGridHandler';
        $instance = null;
        $this->assertSame(Hook::CONTINUE, $plugin->setupGridHandler('LoadComponentHandler', [&$other, &$op, &$instance]));
        $this->assertNull($instance);
    }

    public function testOnlyMastheadRolesAreOfferedForTheEditorialTeamPage(): void
    {
        $contextId = (int) UserGroup::query()->whereNotNull('context_id')->value('context_id');
        if (!$contextId) {
            $this->markTestSkipped('The installation has no journal with user groups.');
        }

        $offered = (new ClassicUserEditorPlugin())->getMastheadUserGroupIds($contextId);
        $this->assertSame($offered, array_values(array_unique($offered)));

        $expected = UserGroup::withContextIds([$contextId])->masthead(true)->excludeRoles([Role::ROLE_ID_REVIEWER])->get()
            ->map(fn (UserGroup $userGroup) => (int) $userGroup->id)->values()->all();
        $this->assertSame($expected, $offered);

        // Reviewers are listed by their completed reviews, never by role.
        $reviewerIds = UserGroup::withContextIds([$contextId])->withRoleIds([Role::ROLE_ID_REVIEWER])->get()
            ->map(fn (UserGroup $userGroup) => (int) $userGroup->id)->all();
        $this->assertSame([], array_intersect($offered, $reviewerIds));
    }

    public function testTheScriptOnlyRearrangesTheCoreFormAndCreatesNoField(): void
    {
        $script = (string) preg_replace('#/\*.*?\*/#s', '', (string) file_get_contents(dirname(__DIR__) . '/js/userForm.js'));

        // It works on the core form only.
        $this->assertStringContainsString("querySelectorAll('#userDetailsForm')", $script);
        // The checkboxes of the core form are moved, never rebuilt: what is submitted stays the same.
        $this->assertStringContainsString("form.querySelectorAll('input[name=\"userGroupIds[]\"]')", $script);
        $this->assertStringContainsString("form.querySelectorAll('input[name=\"mastheadUserGroupIds[]\"]')", $script);
        $this->assertStringNotContainsString("createElement('input')", $script);
        // A failure leaves the core form usable.
        $this->assertStringContainsString('catch (e)', $script);
    }

    public function testTheTabOfThePluginIsAddedToTheUsersAndRolesPage(): void
    {
        $this->assertSame('management/access.tpl', ClassicUserEditorPlugin::ACCESS_PAGE_TEMPLATE);
        $template = (string) file_get_contents(dirname(__DIR__) . '/templates/accessTab.tpl');
        // The hook is called inside <tabs>, so the output has to be a complete <tab>.
        $this->assertStringStartsWith('{**', $template);
        $this->assertStringContainsString('<tab id="classicUserEditor"', $template);
        $this->assertStringContainsString('{load_url_in_div', $template);
        $this->assertStringContainsString('inVueEl=true', $template);
    }
}
