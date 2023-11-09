from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Optional, Tuple

from snuba_sdk import Column, Condition, Entity, Op, Query, Request

from sentry.eventstore.models import Event
from sentry.snuba.dataset import Dataset, EntityKey
from sentry.utils.avatar import get_gravatar_url
from sentry.utils.snuba import raw_snql_query

logger = logging.getLogger(__name__)

REFERRER = "sentry.utils.eventuser"


@dataclass
class EventUser:
    email: str
    username: str
    name: str
    ip_address: str
    id: Optional[int] = None
    project_id: Optional[int] = None

    @staticmethod
    def from_event(event: Event):
        return EventUser(
            id=None,
            project_id=event.project_id if event else None,
            email=event.data.get("user", {}).get("email") if event else None,
            username=event.data.get("user", {}).get("username") if event else None,
            name=event.data.get("user", {}).get("name") if event else None,
            ip_address=event.data.get("user", {}).get("ip_address") if event else None,
        )

    def get_display_name(self):
        return self.name or self.email or self.username

    def serialize(self):
        return {
            "id": str(self.id),
            "username": self.username,
            "email": self.email,
            "name": self.get_display_name(),
            "ipAddress": self.ip_address,
            "avatarUrl": get_gravatar_url(self.email, size=32),
        }


def find_eventuser_with_snuba(event: Event):
    """
    Query Snuba to get the EventUser information for an Event.
    """
    start_date, end_date = _start_and_end_dates(event.datetime)

    query = _generate_entity_dataset_query(
        event.project_id, event.group_id, event.event_id, start_date, end_date
    )
    request = Request(
        dataset=Dataset.Events.value,
        app_id=REFERRER,
        query=query,
        tenant_ids={"referrer": REFERRER, "organization_id": event.project.organization.id},
    )
    data_results = raw_snql_query(request, referrer=REFERRER)["data"]

    if len(data_results) == 0:
        logger.info(
            "Errors dataset query to find EventUser did not return any results.",
            extra={
                "event_id": event.event_id,
                "project_id": event.project_id,
                "group_id": event.group_id,
            },
        )
        return {}

    return data_results[0]


def _generate_entity_dataset_query(
    project_id: Optional[int],
    group_id: Optional[int],
    event_id: str,
    start_date: datetime,
    end_date: datetime,
) -> Query:
    """This simply generates a query based on the passed parameters"""
    where_conditions = [
        Condition(Column("event_id"), Op.EQ, event_id),
        Condition(Column("timestamp"), Op.GTE, start_date),
        Condition(Column("timestamp"), Op.LT, end_date),
    ]
    if project_id:
        where_conditions.append(Condition(Column("project_id"), Op.EQ, project_id))

    if group_id:
        where_conditions.append(Condition(Column("group_id"), Op.EQ, group_id))

    return Query(
        match=Entity(EntityKey.Events.value),
        select=[
            Column("project_id"),
            Column("group_id"),
            Column("ip_address_v6"),
            Column("ip_address_v4"),
            Column("event_id"),
            Column("user_id"),
            Column("user"),
            Column("user_name"),
            Column("user_email"),
        ],
        where=where_conditions,
    )


def _start_and_end_dates(time: datetime) -> Tuple[datetime, datetime]:
    """Return the 10 min range start and end time range ."""
    return time - timedelta(minutes=5), time + timedelta(minutes=5)
