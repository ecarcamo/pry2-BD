from django.urls import path

from . import views

urlpatterns = [
    path('influencers/', views.influencers, name='ds-influencers'),
    path('recomendaciones/<str:user_id>/', views.recomendaciones, name='ds-recomendaciones'),
    path('grados-separacion/', views.grados_separacion, name='ds-grados'),
]
