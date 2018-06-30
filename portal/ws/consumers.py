import json

from channels.generic.websocket import WebsocketConsumer

from django.template.loader import render_to_string
from django.urls import reverse_lazy

from portal.home.consumers import Indexconsumer as HomeIndexConsumer
from portal.page1.consumers import Indexconsumer as Page1IndexConsumer
from portal.page2.consumers import Indexconsumer as Page2IndexConsumer

"""
map of url -> {
    def: method to return the markup for that "websocket view"
}
"""
ROUTES = {}

# home
ROUTES[reverse_lazy('home_index')] = {
   'def': HomeIndexConsumer
}
# page 1
ROUTES[reverse_lazy('page1_index')] = {
   'def': Page1IndexConsumer
}
# page 2
ROUTES[reverse_lazy('page2_index')] = {
   'def': Page2IndexConsumer
}

print(ROUTES)


class IndexConsumer(WebsocketConsumer):

    def connect(self):
        # print(self.scope)
        # print(self.scope['user'].__dict__)
        user = self.scope['user']
        # if user.is_authenticated:
        #     print('auth')
        # else:
        #     print('noauth')
        self.accept()

    def disconnect(self, close_code):
        pass

    def receive(self, text_data):
        """
        message is made of:
        id: a unique id
        href: the "link"
        mode:
            +: append after target's innerHTML
            -: prepend before target's innerHTML
            @: replace the whole of target's innerHTML
        target: the DOM expression to target the recipient of the render_to_string result
        """
        message = json.loads(text_data)
        # print(message)

        id = message[0]
        path = message[1]
        mode = message[2]
        target = message[3]

        if path in ROUTES.keys():
            template_name, ctx = ROUTES[path]['def'](id=id)
            markup = render_to_string(template_name, ctx)
        else:
            markup = '<p>error</p>'

        self.send(text_data=json.dumps([
            id,
            path,
            mode,
            target,
            markup
        ]))
