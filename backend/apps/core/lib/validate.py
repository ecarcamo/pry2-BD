"""Validaciones simples sobre payloads."""
from rest_framework.exceptions import ValidationError


def require_fields(data, fields):
    missing = [
        f for f in fields
        if data.get(f) is None or data.get(f) == ''
    ]
    if missing:
        raise ValidationError({'detail': f"Campos requeridos faltantes: {', '.join(missing)}"})


def require_min_props(obj, minimum, name='properties'):
    if not isinstance(obj, dict) or len(obj) < minimum:
        raise ValidationError({'detail': f"{name} debe tener al menos {minimum} propiedades"})
