from block.models import Block


def IndexContext(id=0):
    ctx = {
        'id': id,
        'items': [
            'foo',
            'bar'
        ],
        'blocks': Block.objects.all()
    }

    return ctx