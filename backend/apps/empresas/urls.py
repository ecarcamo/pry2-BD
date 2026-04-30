from django.urls import path

from . import views

urlpatterns = [
    path('', views.collection, name='empresas-collection'),
    path('bulk-update/', views.actualizar_bulk, name='empresas-bulk-update'),
    path('<str:empresa_id>/', views.detail, name='empresas-detail'),
]
