import uuid

from django.db import models
from django.utils.translation import ugettext_lazy as _


class Block(models.Model):
    uuid = models.UUIDField(_('UUID'), default=uuid.uuid4, db_index=True)
    label = models.CharField(_('Label'), max_length=150, blank=False, null=False, default='')

