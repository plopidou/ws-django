from channels.db import database_sync_to_async

from block.models import Block


@database_sync_to_async
def get_all_blocks():
    return Block.objects.all()


async def IndexConsumer(id=0):
    template_name = 'page1/index_ws.html'

    context = {
        id: id
    }

    context['items'] = [
        'foo',
        'bar'
    ]

    context['blocks'] = await get_all_blocks()

    return template_name, context