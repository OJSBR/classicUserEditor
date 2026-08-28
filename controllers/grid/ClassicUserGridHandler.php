<?php

/**
 * @file plugins/generic/classicUserEditor/controllers/grid/ClassicUserGridHandler.php
 *
 * Copyright (c) 2026 OJSBR (https://ojsbr.com)
 * Distributed under the GNU GPL v3. For full terms see the file docs/COPYING.
 *
 * @class ClassicUserGridHandler
 *
 * @brief The classic user grid, with a Roles column that also lists role
 *        assignments inherited from OJS 3.3.
 *
 *        The core column (UserGridHandler) filters the assignments with
 *        UserUserGroup::scopeWithActiveAndActiveInFuture(), which opens with
 *        whereNotNull('date_start'). The migration that created that column
 *        (I9462_UserUserGroupsStartEndDate) only adds it, and never fills it
 *        in for the assignments that already existed, so on every database
 *        upgraded from OJS 3.3 the column comes out empty for every user.
 *
 *        Core's own scopeWithActive() — the one behind sign-in, permissions
 *        and the Editorial Team page — reads an empty date_start as active.
 *        This column does the same, so the grid agrees with the rest of OJS.
 */

namespace APP\plugins\generic\classicUserEditor\controllers\grid;

use APP\core\Application;
use PKP\controllers\grid\ColumnBasedGridCellProvider;
use PKP\controllers\grid\GridColumn;
use PKP\controllers\grid\settings\user\UserGridHandler;
use PKP\core\Core;
use PKP\user\User;
use PKP\userGroup\UserGroup;

class ClassicUserGridHandler extends UserGridHandler
{
    /**
     * @copydoc UserGridHandler::initialize()
     *
     * @param null|mixed $args
     */
    public function initialize($request, $args = null)
    {
        parent::initialize($request, $args);

        // GridHandler::addColumn() indexes the columns by id, so this one
        // takes the place of the column the parent built. Nothing else in
        // the grid changes.
        $this->addColumn(new class (
            'roles',
            'user.roles',
            null,
            null,
            new ColumnBasedGridCellProvider()
        ) extends GridColumn {
            public function getTemplateVarsFromRow($row): array
            {
                $user = $row->getData();
                assert($user instanceof User);

                $contextId = Application::get()->getRequest()->getContext()->getId();
                $currentDateTime = Core::getCurrentDate();

                // Assignments in this context that have not ended. An empty
                // date_start counts as started, the way scopeWithActive()
                // reads it; an empty date_end still means no end.
                $userGroups = UserGroup::query()
                    ->withContextIds($contextId)
                    ->whereHas('userUserGroups', function ($query) use ($user, $currentDateTime) {
                        $query->withUserId($user->getId())
                            ->where(
                                fn ($query) => $query
                                    ->whereNull('user_user_groups.date_end')
                                    ->orWhere('user_user_groups.date_end', '>=', $currentDateTime)
                            );
                    })
                    ->get();

                $roles = $userGroups
                    ->map(fn (UserGroup $userGroup) => $userGroup->getLocalizedData('name'))
                    ->join(__('common.commaListSeparator'));

                return ['label' => $roles];
            }
        });
    }
}
