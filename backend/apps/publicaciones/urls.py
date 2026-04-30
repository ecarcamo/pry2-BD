from django.urls import path

from . import views

urlpatterns = [
    path('', views.collection, name='publicaciones-collection'),
    path('bulk-update/', views.actualizar_bulk, name='publicaciones-bulk-update'),
    path('<str:post_id>/', views.detail, name='publicaciones-detail'),
]
