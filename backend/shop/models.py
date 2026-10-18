
from decimal import Decimal

from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models



# ============================================================
# KATEGORIE PRODUKTÓW
# ============================================================

class Category(models.Model):

    name = models.CharField(
        max_length=100,
        unique=True
    )

    def __str__(self):
        return self.name


# ============================================================
# PRODUKTY
# ============================================================

class Product(models.Model):

    category = models.ForeignKey(
        Category,
        on_delete=models.PROTECT,
        related_name="products"
    )

    name = models.CharField(
        max_length=180
    )

    description = models.TextField(
        blank=True
    )

    price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[
            MinValueValidator(Decimal("0.01"))
        ]
    )

    stock = models.PositiveIntegerField(
        default=0
    )

    image_url = models.URLField(
        blank=True
    )
    image = models.ImageField(
    upload_to="products/",
    blank=True,
    null=True,
    verbose_name="Product Image"
)
    active = models.BooleanField(
        default=True
    )

    def __str__(self):
        return self.name


# ============================================================
# FIRMY TRANSPORTOWE
# ============================================================

class ShippingCarrier(models.Model):

    name = models.CharField(
        max_length=120,
        unique=True,
        verbose_name="Carrier Name"
    )

    active = models.BooleanField(
        default=True,
        verbose_name="Active"
    )

    class Meta:
        ordering = ["name"]
        verbose_name = "Shipping Carrier"
        verbose_name_plural = "Shipping Carriers"

    def __str__(self):
        return self.name


# ============================================================
# METODY DOSTAWY
# ============================================================

class ShippingMethod(models.Model):

    DELIVERY_TYPES = [
        ("courier", "Kurier"),
        ("locker", "Automat paczkowy"),
        ("pickup", "Punkt odbioru"),
    ]

    carrier = models.ForeignKey(
        ShippingCarrier,
        on_delete=models.PROTECT,
        related_name="methods"
    )

    name = models.CharField(
        max_length=150,
        verbose_name="Service Name"
    )

    delivery_type = models.CharField(
        max_length=20,
        choices=DELIVERY_TYPES,
        verbose_name="Rodzaj dostawy"
    )

    price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[
            MinValueValidator(Decimal("0.00"))
        ],
        verbose_name="Cena dostawy"
    )

    active = models.BooleanField(
        default=True,
        verbose_name="Active"
    )

    class Meta:
        ordering = [
            "carrier__name",
            "price",
        ]

        verbose_name = "Shipping Method"
        verbose_name_plural = "Shipping Methods"

    def __str__(self):
        return f"{self.carrier.name} - {self.name}"


# ============================================================
# ZAMÓWIENIA
# ============================================================

class Order(models.Model):

    STATUS = [
        ("new", "New"),
        ("paid", "Paid"),
        ("sent", "Shipped"),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="orders"
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    shipping_address = models.TextField()

    # Wybrana metoda dostawy
    shipping_method = models.ForeignKey(
        ShippingMethod,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="orders"
    )

    # Koszt dostawy zapisany w momencie zamówienia
    shipping_cost = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal("0.00")
    )

    # Kod automatu paczkowego lub punktu odbioru
    pickup_point = models.CharField(
        max_length=150,
        blank=True
    )

    # Całkowita wartość zamówienia
    total = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0
    )

    status = models.CharField(
        max_length=10,
        choices=STATUS,
        default="new"
    )

    def __str__(self):
        return f"Order {self.pk}"


# ============================================================
# POZYCJE ZAMÓWIENIA
# ============================================================

class OrderItem(models.Model):

    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name="items"
    )

    product = models.ForeignKey(
        Product,
        on_delete=models.PROTECT
    )

    quantity = models.PositiveIntegerField(
        validators=[
            MinValueValidator(1)
        ]
    )

    unit_price = models.DecimalField(
        max_digits=10,
        decimal_places=2
    )

    def __str__(self):
        return (
            f"{self.product.name} "
            f"x {self.quantity}"
        )



class ShippingAddress(models.Model):

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="shipping_addresses"
    )

    name = models.CharField(max_length=100)
    full_name = models.CharField(max_length=150)
    street = models.CharField(max_length=200)
    house_number = models.CharField(max_length=20)
    apartment_number = models.CharField(
        max_length=20,
        blank=True
    )
    postal_code = models.CharField(max_length=6)
    city = models.CharField(max_length=100)
    phone = models.CharField(max_length=20)

    is_default = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.name} - {self.full_name}"
