import json

from channels.generic.websocket import WebsocketConsumer

from django.template.loader import render_to_string
from django.urls import reverse_lazy

from portal.home.consumers import HomeIndex

"""
map of url -> {
    def: method to return the markup for that "websocket view"
}
"""
ROUTES = {}

# home
ROUTES[reverse_lazy('home_index')] = {
   'def': HomeIndex
}

# print(ROUTES)


class IndexConsumer(WebsocketConsumer):
    template_name = 'home/index_ws.html'

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
        print(message)

        id = message[0]
        href = message[1]
        mode = message[2]
        target = message[3]

        if href in ROUTES.keys():
            print('OK')
            template_name, ctx = ROUTES[href]['def'](id=id)
            markup = render_to_string(self.template_name, ctx)
        else:
            print('KO')
            markup = '<p>error</p>'

        # simple: when requested, simply render the template and send the output
        # ctx = {}
        # markup = render_to_string(self.template_name, ctx)

        self.send(text_data=json.dumps([
            id,
            href,
            target,
            mode,
            markup
        ]))
