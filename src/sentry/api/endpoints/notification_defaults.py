from rest_framework.request import Request
from rest_framework.response import Response

from sentry.api.api_owners import ApiOwner
from sentry.api.api_publish_status import ApiPublishStatus
from sentry.api.base import Endpoint, control_silo_endpoint
from sentry.notifications.helpers import PROVIDER_DEFAULTS, TYPE_DEFAULTS


@control_silo_endpoint
class NotificationDefaultsEndpoints(Endpoint):
    publish_status = {
        "GET": ApiPublishStatus.PRIVATE,
    }
    owner = ApiOwner.ISSUES
    permission_classes = ()
    private = True

    def get(self, request: Request) -> Response:
        """
        Return the default config for notification settings.
        This becomes the fallback in the UI.
        """
        return Response(
            {
                "providerDefaults": PROVIDER_DEFAULTS,
                "typeDefaults": TYPE_DEFAULTS,
            }
        )
