import time
import functools
from typing import Any


def ttl_cache(ttl: int = 300):
    """Decorador que cachea el resultado de una función durante `ttl` segundos."""
    def decorator(func):
        cache: dict[str, tuple[float, Any]] = {}

        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            key = str(args) + str(sorted(kwargs.items()))
            now = time.time()
            if key in cache:
                expires, value = cache[key]
                if now < expires:
                    return value
            result = func(*args, **kwargs)
            cache[key] = (now + ttl, result)
            return result

        wrapper.cache_clear = lambda: cache.clear()
        return wrapper

    return decorator
