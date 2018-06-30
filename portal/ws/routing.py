from django.conf.urls import url

from .consumers import IndexConsumer


websocket_urlpatterns = [
    url(
        r'^wsnav/$',
        IndexConsumer
    ),
]