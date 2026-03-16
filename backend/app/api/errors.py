"""HTTP error mapping for shared backend exceptions."""

from __future__ import annotations

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from app.api.schemas.common import Result
from app.core import AuthException, BusinessException, CommonErrorCode, log


def _field_from_loc(loc: tuple) -> str:
    """Normalize a FastAPI validation location tuple into a dotted field path.

    Args:
        loc: FastAPI validation location tuple.

    Returns:
        A dotted field path suitable for user-facing error messages.
    """
    if not loc:
        return ""
    prefix = loc[0]
    if prefix in ("body", "query", "path", "header", "cookie"):
        return ".".join(str(item) for item in loc[1:])
    return ".".join(str(item) for item in loc)


def install_exception_handlers(app: FastAPI) -> None:
    """Install the shared exception-to-response handlers on the FastAPI app.

    Args:
        app: FastAPI application receiving the handlers.

    Returns:
        None.
    """

    @app.exception_handler(BusinessException)
    async def handle_business_exception(request: Request, exc: BusinessException):
        """Return the standard business-error payload for business exceptions.

        Args:
            request: Request that triggered the exception.
            exc: Business exception raised by the application layer.

        Returns:
            JSON response using the shared failure envelope.
        """
        log.warning(f"Business exception: {exc.error_code} - {request.url.path}")
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content=Result.fail(code=exc.error_code, message=exc.error_msg).model_dump(
                by_alias=True
            ),
        )

    @app.exception_handler(AuthException)
    async def handle_auth_exception(request: Request, exc: AuthException):
        """Return the standard auth-error payload for auth exceptions.

        Args:
            request: Request that triggered the exception.
            exc: Auth exception raised by authentication code.

        Returns:
            JSON response using the shared failure envelope.
        """
        log.warning(f"Auth exception: {exc.error_code} - {request.url.path}")
        return JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content=Result.fail(code=exc.error_code, message=exc.error_msg).model_dump(
                by_alias=True
            ),
        )

    @app.exception_handler(RequestValidationError)
    async def handle_validation_exception(request: Request, exc: RequestValidationError):
        """Return the shared validation-error payload for malformed requests.

        Args:
            request: Request that failed validation.
            exc: FastAPI validation error describing the invalid payload.

        Returns:
            JSON response using the shared parameter-error envelope.
        """
        errors = exc.errors()
        if errors:
            # Surface the first structured field error so clients get a stable, concise message.
            field = _field_from_loc(errors[0].get("loc", ()))
            message = errors[0].get("msg", CommonErrorCode.PARAM_ERROR.error_msg)
            if field:
                message = f"{field}: {message}"
        else:
            message = CommonErrorCode.PARAM_ERROR.error_msg
        log.warning(f"Validation error: {request.url.path} - {message}")
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content=Result.fail(
                code=CommonErrorCode.PARAM_ERROR.error_code,
                message=message,
            ).model_dump(by_alias=True),
        )

    @app.exception_handler(Exception)
    async def handle_general_exception(request: Request, exc: Exception):
        """Return the shared system-error payload for uncaught exceptions.

        Args:
            request: Request that triggered the exception.
            exc: Unhandled exception bubbling out of request processing.

        Returns:
            JSON response using the shared system-error envelope.
        """
        log.exception(f"Unhandled exception at {request.url.path}: {exc}")
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content=Result.fail(
                code=CommonErrorCode.SYSTEM_ERROR.error_code,
                message=CommonErrorCode.SYSTEM_ERROR.error_msg,
            ).model_dump(by_alias=True),
        )
