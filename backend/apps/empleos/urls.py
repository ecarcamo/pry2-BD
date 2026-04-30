from django.urls import path

from . import views

urlpatterns = [
    path('', views.collection, name='empleos-collection'),
    path('bulk-update/', views.actualizar_bulk, name='empleos-bulk-update'),
    path('<str:empleo_id>/', views.detail, name='empleos-detail'),
]
