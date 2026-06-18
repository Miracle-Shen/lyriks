import logging

from app.api import api
from app.router import register_routers

logger = logging.getLogger("lyriks.main")

register_routers(api)
app = api
