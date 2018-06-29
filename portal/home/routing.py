from django.conf.urls import url

from .consumers import HomeIndexConsumer


websocket_urlpatterns = [
    url(r'^ws/$', HomeIndexConsumer),
]