from django.urls import path

from . import views

urlpatterns = [
    path('conexiones/', views.conexiones, name='rel-conexiones'),
    path('likes/', views.likes, name='rel-likes'),
    path('comentarios/', views.comentarios, name='rel-comentarios'),
    path('compartidos/', views.compartidos, name='rel-compartidos'),
    path('postulaciones/', views.postulaciones, name='rel-postulaciones'),
    path('seguimientos/', views.seguimientos, name='rel-seguimientos'),
    path('empleos-historial/', views.empleos_historial, name='rel-empleos-historial'),
    path('estudios/', views.estudios, name='rel-estudios'),
    path('menciones/', views.menciones, name='rel-menciones'),
    path('generica/', views.relacion_generica, name='rel-generica'),
]
