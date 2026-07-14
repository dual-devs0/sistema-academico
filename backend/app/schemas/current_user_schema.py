from pydantic import BaseModel


class CurrentUser(BaseModel):
    """Payload decodificado del access token JWT.

    Reemplaza el dict crudo que devolvía get_current_user — un typo en el
    nombre de la key (ej. "rol" en vez de "role") ahora falla en el momento
    de construir el objeto, no en el primer router que lo consuma en runtime.
    """

    username: str
    role: str
    user_id: int
