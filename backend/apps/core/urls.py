from django.urls import path

from .views import (
    cypher_passthrough,
    ping,
    grafo_sample,
    admin_seed,
    load_csv_nodes,
    load_csv_rels,
)

urlpatterns = [
    path('ping/', ping, name='ping'),
    path('cypher/', cypher_passthrough, name='cypher-passthrough'),
    path('grafo/sample/', grafo_sample, name='grafo-sample'),
    path('admin/seed/', admin_seed, name='admin-seed'),
    path('load-csv/nodes/', load_csv_nodes, name='load-csv-nodes'),
    path('load-csv/rels/', load_csv_rels, name='load-csv-rels'),
]
