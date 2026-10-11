"""Envoltorio común de toda respuesta JSON de la API: {data, source, warnings, quality}."""


def envelope(data, source, warnings=None, quality="ok"):
    return {"data": data, "source": source, "warnings": warnings or [], "quality": quality}
