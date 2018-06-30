def HomeIndex(id=0):
    ctx = {
        'id': id,
        'items': [
            'foo',
            'bar'
        ]
    }
    template_name = 'home/index_ws.html'

    return template_name, ctx