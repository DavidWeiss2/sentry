from datetime import timedelta

from django.utils import timezone

from sentry.models import Deploy, GroupRelease, GroupStatus
from sentry.suspect_resolutions.resolved_in_active_release import (
    is_resolved_issue_within_active_release,
)
from sentry.testutils import TestCase


class ResolvedInActiveReleaseTest(TestCase):
    def test_unresolved_issue_in_active_release(self):
        group = self.create_group(project=self.project, status=GroupStatus.UNRESOLVED)
        release = self.create_release(project=self.project)
        GroupRelease.objects.create(
            project_id=self.project.id,
            group_id=group.id,
            release_id=release.id,
        )
        Deploy.objects.create(
            organization_id=self.organization.id,
            environment_id=self.environment.id,
            release_id=release.id,
            date_finished=timezone.now() - timedelta(minutes=20),
        )

        assert not is_resolved_issue_within_active_release(group.id)

    def test_resolved_issue_in_active_release(self):
        group = self.create_group(project=self.project, status=GroupStatus.RESOLVED)
        release = self.create_release(project=self.project)
        GroupRelease.objects.create(
            project_id=self.project.id,
            group_id=group.id,
            release_id=release.id,
        )
        Deploy.objects.create(
            organization_id=self.organization.id,
            environment_id=self.environment.id,
            release_id=release.id,
            date_finished=timezone.now() - timedelta(minutes=20),
        )

        assert is_resolved_issue_within_active_release(group.id)

    def test_resolved_issue_in_old_deploy(self):
        group = self.create_group(project=self.project, status=GroupStatus.RESOLVED)
        release = self.create_release(project=self.project)
        GroupRelease.objects.create(
            project_id=self.project.id,
            group_id=group.id,
            release_id=release.id,
        )
        Deploy.objects.create(
            organization_id=self.organization.id,
            environment_id=self.environment.id,
            release_id=release.id,
            date_finished=timezone.now() - timedelta(days=3),
        )

        assert not is_resolved_issue_within_active_release(group.id)

    def test_resolved_issue_in_active_release_not_deployed(self):
        group = self.create_group(project=self.project, status=GroupStatus.RESOLVED)
        release = self.create_release(project=self.project)
        GroupRelease.objects.create(
            project_id=self.project.id,
            group_id=group.id,
            release_id=release.id,
        )
        assert not is_resolved_issue_within_active_release(group.id)
