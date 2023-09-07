# Please do not use
#     from __future__ import annotations
# in modules such as this one where hybrid cloud data models or service classes are
# defined, because we want to reflect on type annotations and avoid forward references.

from abc import abstractmethod
from datetime import datetime
from typing import Optional, Type, cast

from sentry.services.hybrid_cloud.rpc import RpcService, rpc_method
from sentry.silo import SiloMode


class OrgAuthTokenService(RpcService):
    key = "orgauthtoken"
    local_mode = SiloMode.CONTROL

    @classmethod
    def get_local_implementation(cls) -> RpcService:
        from .impl import DatabaseBackedOrgAuthTokenService

        return DatabaseBackedOrgAuthTokenService()

    @classmethod
    def get_nonlocal_class(cls) -> Type[RpcService]:
        from .impl import OutboxBackedOrgAuthTokenService

        return OutboxBackedOrgAuthTokenService

    @rpc_method
    @abstractmethod
    def update_orgauthtoken(
        self,
        *,
        organization_id: int,
        org_auth_token_id: int,
        date_last_used: Optional[datetime] = None,
        project_last_used_id: Optional[int] = None,
    ) -> None:
        pass


# An asynchronous service which can delegate to an outbox implementation, essentially enqueueing
# updates of tokens for future processing.
orgauthtoken_service: OrgAuthTokenService = cast(
    OrgAuthTokenService, OrgAuthTokenService.create_delegation()
)


orgauthtoken_rpc_service: OrgAuthTokenService = cast(
    OrgAuthTokenService,
    OrgAuthTokenService.create_delegation(force_remote=True),
)
