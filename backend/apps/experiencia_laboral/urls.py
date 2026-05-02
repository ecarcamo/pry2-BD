from django.urls import path

from . import views

urlpatterns = [
    path('', views.collection, name='experiencia-collection'),
    path('bulk-update/', views.actualizar_bulk, name='experiencia-bulk-update'),
    path('<str:exp_id>/', views.detail, name='experiencia-detail'),
]
