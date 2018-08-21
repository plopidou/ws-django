import json
import uuid
from timeit import default_timer as timer

from channels.generic.websocket import WebsocketConsumer, AsyncWebsocketConsumer
from asgiref.sync import async_to_sync

from django.template.loader import render_to_string
from django.urls import reverse_lazy
from django.conf import settings

from portal.home.consumers import IndexConsumer as HomeIndexConsumer
from portal.page1.consumers import IndexConsumer as Page1IndexConsumer
from portal.page2.consumers import IndexConsumer as Page2IndexConsumer

MESSAGE_TYPE_CLIENT_REQUEST = 0
MESSAGE_TYPE_SERVER_RESPONSE = 1
MESSAGE_TYPE_SERVER_PUSH = 2
MESSAGE_TYPES = {
    MESSAGE_TYPE_CLIENT_REQUEST: 'Coming from client as a request',
    MESSAGE_TYPE_SERVER_RESPONSE: 'Sent to client as a response',
    MESSAGE_TYPE_SERVER_PUSH: 'Sent to client as push',
}


"""
map of url -> {
    consumer: method to return the markup for that "websocket view"
}
"""
ROUTES = {
    # home
    reverse_lazy('home_index'): {
       'consumer': HomeIndexConsumer
    },
    # page 1
    reverse_lazy('page1_index'): {
       'consumer': Page1IndexConsumer
    },
    # page 2
    reverse_lazy('page2_index'): {
       'consumer': Page2IndexConsumer
    }
}
# print(ROUTES)


class IndexConsumer(AsyncWebsocketConsumer):

    # def connect(self):
    async def connect(self):
        """
        self.channel_name: unique to the connection/consumer/client
        self.channel_layer: global instance of RedisChannelLayer
        see: https://channels.readthedocs.io/en/latest/tutorial/part_2.html#enable-a-channel-layer
        """
        # print(self.channel_layer)
        # print(self.channel_name)

        # group name is based on user connecting
        user = self.scope['user']
        if user.is_authenticated:
            self.group_name = str(user.uuid)
        else:
            self.group_name = str(uuid.uuid4())

        # print(self.group_name)

        # join a group unique to that consumer
        # reason is we want to be able to push to the client only
        # as it is difficult to iterate over a group's members in channels

        # async way
        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name
        )
        await self.accept()

    async def disconnect(self, close_code):
        # leave self.group_name
        await self.channel_layer.group_discard(
            self.group_name,
            self.channel_name
        )

    async def receive(self, text_data):
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

        type = message.pop(0)
        id = message.pop(0)
        path = message.pop(0)
        mode = message.pop(0)
        target = message.pop(0)

        # some controls here...

        # probably need to use resolve here, for dynamic url with placeholder such as <slug>, <uuid>, etc
        # if it works, get name of url and use it at the key for the ROUTES lookup
        if path in ROUTES.keys():
            template_name, context = await ROUTES[path]['consumer'](id=id)
            s = timer()
            markup = render_to_string(template_name, context)
            e = timer()
            # how long?
            # print('%s ms' % ((e-s)*1000))
        else:
            markup = '<p>error</p>'

        # time.sleep(.5)

        await self.send(text_data=json.dumps([
            MESSAGE_TYPE_SERVER_RESPONSE,
            id,
            path,
            mode,
            target,
            markup
        ]))

        # Send message to own group
        # async:
        await self.channel_layer.group_send(
            self.group_name,
            {
                'type': 'group_message',
                'message': {'foo': 'bar'}
            }
        )

    # Receive message from group
    # since group is unique to this consumer, only it will get the message
    async def group_message(self, event):
        message = event['message']

        # print(message)

        mode = '-'
        target = '#messages'
        markup = '<li>you just navigated to a different page.</li>'

        # Send message to WebSocket

        await self.send(text_data=json.dumps([
            MESSAGE_TYPE_SERVER_PUSH,
            mode,
            target,
            markup,
        ]))

