from channels.db import database_sync_to_async

from block.models import Block


@database_sync_to_async
def get_all_blocks():
    return Block.objects.all()


async def Indexconsumer(id=0):
    template_name = 'page2/index_ws.html'

    context = {
        id: id
    }

    context['items'] = [
        'foo',
        'bar'
    ]

    context['blocks'] = await get_all_blocks()

    return template_name, context