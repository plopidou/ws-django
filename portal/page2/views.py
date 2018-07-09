from django.views.generic import TemplateView

from block.models import Block


class IndexView(TemplateView):
    http_method_names = ['get']
    template_name = 'page2/index_html.html'

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)

        context['items'] = [
            'foo',
            'bar'
        ]

        context['blocks'] = Block.objects.all()

        return context
