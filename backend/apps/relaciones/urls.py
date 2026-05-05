from django.urls import path

from . import views

urlpatterns = [
    path('conexiones/', views.conexiones, name='rel-conexiones'),
    path('likes/', views.likes, name='rel-likes'),
    path('comentarios/', views.comentarios, name='rel-comentarios'),
    path('compartidos/', views.compartidos, name='rel-compartidos'),
    path('postulaciones/', views.postulaciones, name='rel-postulaciones'),
    path('seguimientos/', views.seguimientos, name='rel-seguimientos'),
    path('trabajo-en/', views.trabajo_en, name='rel-trabajo-en'),
    path('experiencia-en/', views.experiencia_en, name='rel-experiencia-en'),
    path('estudios/', views.estudios, name='rel-estudios'),
    path('menciones/', views.menciones, name='rel-menciones'),
    path('generica/', views.relacion_generica, name='rel-generica'),
    path('patch/', views.patch_relacion, name='rel-patch'),
    path('bulk-patch/', views.patch_relacion_bulk, name='rel-bulk-patch'),
    path('delete/', views.delete_relacion, name='rel-delete'),
    path('bulk-delete/', views.delete_relacion_bulk, name='rel-bulk-delete'),
    path('bulk-delete-nodos/', views.delete_nodos_bulk, name='rel-bulk-delete-nodos'),
    path('mias/', views.mis_relaciones, name='rel-mias'),
]
