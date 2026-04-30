from django.urls import path

from . import views

urlpatterns = [
    path('usuarios-top-conexiones/', views.usuarios_top_conexiones, name='consultas-q1'),
    path('empresas-seguidas/', views.empresas_seguidas, name='consultas-q2'),
    path('empleos-activos/', views.empleos_activos, name='consultas-q3'),
    path('publicaciones-stats/', views.publicaciones_stats, name='consultas-q4'),
    path('postulaciones-por-estado/', views.postulaciones_por_estado, name='consultas-q5'),
    path('autoria-publicaciones/', views.autoria_publicaciones, name='consultas-q6'),
    path('conteo-por-label/', views.conteo_por_label, name='consultas-conteo'),
    path('agregacion/', views.agregacion, name='consultas-agregacion'),
]
