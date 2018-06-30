from django.views.generic import TemplateView


class IndexView(TemplateView):
    http_method_names = ['get']
    template_name = 'home/index_html.html'

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)

        context['items'] = [
            'foo',
            'bar'
        ]

        return context
