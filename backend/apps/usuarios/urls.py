from django.urls import path

from . import views

urlpatterns = [
    path('', views.collection, name='usuarios-collection'),
    path('admin/', views.crear_admin, name='usuarios-create-admin'),
    path('bulk-update/', views.actualizar_bulk, name='usuarios-bulk-update'),
    path('<str:user_id>/', views.detail, name='usuarios-detail'),
]
