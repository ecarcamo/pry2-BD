from django.urls import path

from .views import cypher_passthrough, ping, grafo_sample, admin_seed

urlpatterns = [
    path('ping/', ping, name='ping'),
    path('cypher/', cypher_passthrough, name='cypher-passthrough'),
    path('grafo/sample/', grafo_sample, name='grafo-sample'),
    path('admin/seed/', admin_seed, name='admin-seed'),
]
