# Generated by Django 2.2.28 on 2023-01-31 20:37

from django.db import migrations, transaction

from sentry.new_migrations.migrations import CheckedMigration
from sentry.utils.query import RangeQuerySetWrapperWithProgressBar


def backfill_actors(apps, schema_editor):
    User = apps.get_model("sentry", "User")
    Team = apps.get_model("sentry", "Team")
    Actor = apps.get_model("sentry", "Actor")

    def get_actor_id_for_user(user):
        if user.actor_id:
            return user.actor_id
        with transaction.atomic():
            actors_for_user = Actor.objects.filter(type=1, user_id=user.id).all()
            if len(actors_for_user) > 0:
                actor = actors_for_user[0]
            else:
                actor = Actor.objects.create(type=1, user_id=user.id)
            Actor.objects.filter(type=1, user_id=user.id).exclude(id=actor.id).update(user_id=None)
            User.objects.filter(id=user.id).update(actor_id=actor.id)
        return actor.id

    for user in RangeQuerySetWrapperWithProgressBar(User.objects.all()):
        actor_id = get_actor_id_for_user(user)
        Actor.objects.filter(id=actor_id).update(user_id=user.id)
    for team in RangeQuerySetWrapperWithProgressBar(Team.objects.all()):
        Actor.objects.filter(id=team.actor_id).update(team_id=team.id)


class Migration(CheckedMigration):
    # This flag is used to mark that a migration shouldn't be automatically run in production. For
    # the most part, this should only be used for operations where it's safe to run the migration
    # after your code has deployed. So this should not be used for most operations that alter the
    # schema of a table.
    # Here are some things that make sense to mark as dangerous:
    # - Large data migrations. Typically we want these to be run manually by ops so that they can
    #   be monitored and not block the deploy for a long period of time while they run.
    # - Adding indexes to large tables. Since this can take a long time, we'd generally prefer to
    #   have ops run this and not block the deploy. Note that while adding an index is a schema
    #   change, it's completely safe to run the operation after the code has deployed.
    is_dangerous = True

    dependencies = [
        ("sentry", "0402_add_organizationmembermapping_table"),
    ]

    operations = [
        migrations.RunPython(
            backfill_actors,
            reverse_code=migrations.RunPython.noop,
            hints={"tables": ["auth_user", "sentry_team", "sentry_actor"]},
        ),
    ]
