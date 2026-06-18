import logging

from fastapi import FastAPI

from app.controller import health_controller, mascot_controller

logger = logging.getLogger("lyriks.router")


def register_routers(app: FastAPI, prefix: str = "") -> None:
    routers_config = [
        {
            "router": health_controller.router,
            "tags": ["Health"],
            "description": "Health check endpoint for service readiness",
        },
        {
            "router": mascot_controller.router,
            "tags": ["Mascot"],
            "description": "Emotion mascot task, chat, SSE, and memory endpoints",
        },
    ]

    for config in routers_config:
        app.include_router(
            config["router"],
            prefix=prefix,
            tags=config["tags"],
        )
        logger.info(
            "Registered %s router: %s routes - %s",
            config["tags"][0],
            len(config["router"].routes),
            config["description"],
        )
