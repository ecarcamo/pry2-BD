"""
Django settings — NeoLab backend con Neo4j Aura via neomodel.
"""
import os
from pathlib import Path
from urllib.parse import quote_plus

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / '.env')

SECRET_KEY = os.getenv('DJANGO_SECRET_KEY', 'dev-insecure-key')
DEBUG = os.getenv('DJANGO_DEBUG', 'true').lower() == 'true'
ALLOWED_HOSTS = ['*']

INSTALLED_APPS = [
    'django.contrib.contenttypes',
    'django.contrib.auth',
    'django.contrib.staticfiles',
    'rest_framework',
    'corsheaders',
    'django_neomodel',
    'apps.core',
    'apps.usuarios',
    'apps.empresas',
    'apps.publicaciones',
    'apps.empleos',
    'apps.educacion',
    'apps.relaciones',
    'apps.consultas',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
]

ROOT_URLCONF = 'neolab.urls'
WSGI_APPLICATION = 'neolab.wsgi.application'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {'context_processors': []},
    },
]

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}

LANGUAGE_CODE = 'es'
TIME_ZONE = 'America/Guatemala'
USE_I18N = True
USE_TZ = True
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'
STATIC_URL = '/static/'

# ---------- Neo4j / neomodel ----------
NEO4J_URI = os.getenv('NEO4J_URI', '')
NEO4J_USERNAME = os.getenv('NEO4J_USERNAME', '')
NEO4J_PASSWORD = os.getenv('NEO4J_PASSWORD', '')
NEO4J_DATABASE = os.getenv('NEO4J_DATABASE', 'neo4j')
AURA_INSTANCEID = os.getenv('AURA_INSTANCEID', '')
AURA_INSTANCENAME = os.getenv('AURA_INSTANCENAME', '')


def _build_bolt_url():
    if not NEO4J_URI:
        return ''
    # neomodel exige el formato bolt+s://user:pass@host
    scheme_split = NEO4J_URI.split('://', 1)
    if len(scheme_split) != 2:
        return NEO4J_URI
    scheme, rest = scheme_split
    return f"{scheme}://{quote_plus(NEO4J_USERNAME)}:{quote_plus(NEO4J_PASSWORD)}@{rest}"


NEOMODEL_NEO4J_BOLT_URL = _build_bolt_url()
NEOMODEL_DATABASE_NAME = NEO4J_DATABASE

# ---------- DRF ----------
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [],
    'DEFAULT_PERMISSION_CLASSES': ['rest_framework.permissions.AllowAny'],
    'DEFAULT_RENDERER_CLASSES': ['rest_framework.renderers.JSONRenderer'],
    'DEFAULT_PARSER_CLASSES': ['rest_framework.parsers.JSONParser'],
}

# ---------- CORS ----------
CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOW_HEADERS = ['*']
CORS_ALLOW_METHODS = ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS']
