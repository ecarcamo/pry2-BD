"""URL config raíz — todo bajo /api/."""
from django.urls import include, path

api_patterns = [
    path('', include('apps.core.urls')),
    path('usuarios/', include('apps.usuarios.urls')),
    path('empresas/', include('apps.empresas.urls')),
    path('publicaciones/', include('apps.publicaciones.urls')),
    path('empleos/', include('apps.empleos.urls')),
    path('educacion/', include('apps.educacion.urls')),
    path('experiencia/', include('apps.experiencia_laboral.urls')),
    path('relaciones/', include('apps.relaciones.urls')),
    path('consultas/', include('apps.consultas.urls')),
    path('datascience/', include('apps.datascience.urls')),
]

urlpatterns = [
    path('api/', include(api_patterns)),
]
