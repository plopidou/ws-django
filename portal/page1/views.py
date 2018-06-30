from django.views.generic import TemplateView

from .contexts import IndexContext


class IndexView(TemplateView):
    http_method_names = ['get']
    template_name = 'page1/index_html.html'

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)

        merged_contexts = {**context, **IndexContext()}

        return merged_contexts
