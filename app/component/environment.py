import os


def env(key: str, default: str = "") -> str:
    return os.getenv(key, default)


def env_not_empty(key: str) -> str:
    value = env(key).strip()
    if not value:
        raise ValueError(f"Environment variable '{key}' is required")
    return value


def env_bool(key: str, default: bool = False) -> bool:
    value = env(key, "true" if default else "false").strip().lower()
    return value in {"1", "true", "yes", "on"}
