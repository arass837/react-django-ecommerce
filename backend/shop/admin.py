from django.utils.html import format_html
from django.contrib import admin

from .models import (
    Category,
    Product,
    Order,
    OrderItem,
    ShippingCarrier,
    ShippingMethod,
)


# ============================================================
# KATEGORIE PRODUKTÓW
# ============================================================

@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):

    list_display = (
        "id",
        "name",
    )

    search_fields = (
        "name",
    )


# ============================================================
# PRODUKTY
# ============================================================


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):

    list_display = (
        "id",
        "thumbnail",
        "name",
        "category",
        "price",
        "stock",
        "active",
    )

    list_filter = (
        "category",
        "active",
    )

    search_fields = (
        "name",
    )

    list_editable = (
        "price",
        "stock",
        "active",
    )

    fields = (
        "category",
        "name",
        "description",
        "price",
        "stock",
        "image",
        "image_url",
        "active",
    )

    readonly_fields = ("thumbnail",)

    @admin.display(description="Image")
    def thumbnail(self, obj):

        if obj.image:
            return format_html(
                '<img src="{}" style="width:65px;height:65px;object-fit:contain;" />',
                obj.image.url
            )

        return "No image"


# ============================================================
# METODY DOSTAWY
# ============================================================

@admin.register(ShippingMethod)
class ShippingMethodAdmin(admin.ModelAdmin):

    list_display = (
        "id",
        "carrier",
        "name",
        "delivery_type",
        "price",
        "active",
    )

    list_filter = (
        "carrier",
        "delivery_type",
        "active",
    )

    search_fields = (
        "carrier__name",
        "name",
    )

    list_editable = (
        "price",
        "active",
    )


# ============================================================
# POZYCJE ZAMÓWIENIA
# ============================================================

class OrderItemInline(admin.TabularInline):

    model = OrderItem

    extra = 0

    readonly_fields = (
        "product",
        "quantity",
        "unit_price",
    )

    can_delete = False

    def has_add_permission(self, request, obj=None):
        return False


# ============================================================
# ZAMÓWIENIA
# ============================================================

@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):

    list_display = (
        "id",
        "user",
        "shipping_method",
        "shipping_cost",
        "total",
        "status",
        "created_at",
    )

    list_filter = (
        "status",
        "shipping_method",
        "created_at",
    )

    search_fields = (
        "user__username",
        "shipping_address",
        "pickup_point",
    )

    readonly_fields = (
        "user",
        "created_at",
        "shipping_address",
        "shipping_method",
        "shipping_cost",
        "pickup_point",
        "total",
    )

    inlines = (
        OrderItemInline,
    )


# ============================================================
# SHIPPING CARRIERS
# ============================================================

@admin.register(ShippingCarrier)
class ShippingCarrierAdmin(admin.ModelAdmin):

    list_display = (
        "id",
        "name",
        "active",
    )

    list_display_links = (
        "id",
        "name",
    )

    list_filter = (
        "active",
    )

    search_fields = (
        "name",
    )

    list_editable = (
        "active",
    )

