from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from sqlalchemy.exc import IntegrityError


class NotFoundError(ValueError):
    pass


class BusinessRuleError(ValueError):
    pass


def register_exception_handlers(app: FastAPI):

    @app.exception_handler(BusinessRuleError)
    async def business_rule_handler(
        request: Request,
        exc: BusinessRuleError,
    ):
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            content={
                "detail": str(exc),
            },
        )

    @app.exception_handler(NotFoundError)
    async def not_found_handler(
        request: Request,
        exc: NotFoundError,
    ):
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={
                "detail": str(exc),
            },
        )

    @app.exception_handler(IntegrityError)
    async def integrity_error_handler(
        request: Request,
        exc: IntegrityError,
    ):
        error = str(exc.orig)

        if "brands_name_key" in error:
            return JSONResponse(
                status_code=status.HTTP_409_CONFLICT,
                content={
                    "detail": "Já existe uma marca com esse nome."
                },
            )

        return JSONResponse(
            status_code=status.HTTP_409_CONFLICT,
            content={
                "detail": "Não foi possível concluir a operação por conflito de dados."
            },
        )