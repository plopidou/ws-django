import json

from channels.generic.websocket import WebsocketConsumer


class HomeIndexConsumer(WebsocketConsumer):
    def connect(self):
        print(self.scope)
        print(self.scope['user'].__dict__)
        user = self.scope['user']
        if user.is_authenticated:
            print('auth')
        else:
            print('noauth')
        self.accept()

    def disconnect(self, close_code):
        pass

    def receive(self, text_data):
        text_data_json = json.loads(text_data)
        message = text_data_json['message']

        # print(self.scope)

        self.send(text_data=json.dumps({
            'message': message
        }))