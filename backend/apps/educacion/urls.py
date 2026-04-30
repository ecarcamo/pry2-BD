from django.urls import path

from . import views

urlpatterns = [
    path('', views.collection, name='educacion-collection'),
    path('bulk-update/', views.actualizar_bulk, name='educacion-bulk-update'),
    path('<str:educacion_id>/', views.detail, name='educacion-detail'),
]
