from decimal import Decimal
from django.core.management.base import BaseCommand
from shop.models import Category,Product
class Command(BaseCommand):
    help='Create a demo product catalog'
    def handle(self,*args,**kwargs):
        data=[('Electronics',[('Wireless Headphones','249.00',16,'Bluetooth headphones for everyday use.'),('Mechanical Keyboard','319.00',12,'Keyboard for work and gaming.'),('Ergonomic Mouse','129.00',24,'Comfortable computer mouse.')]),('Accessories',[('Urban Backpack','199.00',9,'Backpack for school and work.'),('Insulated Water Bottle','79.00',30,'Stainless steel insulated water bottle.'),('Desk Lamp','139.00',13,'Modern LED desk lamp.')])]
        for category_name,items in data:
            category,_=Category.objects.get_or_create(name=category_name)
            for name,price,stock,description in items:
                Product.objects.update_or_create(name=name,defaults={'category':category,'price':Decimal(price),'stock':stock,'description':description,'active':True})
        self.stdout.write(self.style.SUCCESS('Demo products created.'))
