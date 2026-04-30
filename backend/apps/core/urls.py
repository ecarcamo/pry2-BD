from django.urls import path

from .views import cypher_passthrough, ping

urlpatterns = [
    path('ping/', ping, name='ping'),
    path('cypher/', cypher_passthrough, name='cypher-passthrough'),
]
