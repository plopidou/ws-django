from .contexts import IndexContext


def Indexconsumer(id=0):
    ctx = IndexContext(id=id)
    template_name = 'home/index_ws.html'

    return template_name, ctx