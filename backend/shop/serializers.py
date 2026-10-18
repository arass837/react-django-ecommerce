
import re

from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password

from rest_framework import serializers

from .models import (
    Category,
    Product,
    Order,
    OrderItem,
    ShippingMethod,
    ShippingAddress,
)


# ============================================================
# KATEGORIE
# ============================================================

class CategorySerializer(serializers.ModelSerializer):

    class Meta:
        model = Category
        fields = ["id", "name"]


# ============================================================
# PRODUKTY
# ============================================================


class ProductSerializer(serializers.ModelSerializer):

    category_name = serializers.CharField(
        source="category.name",
        read_only=True
    )

    image_url = serializers.SerializerMethodField()

    class Meta:
        model = Product

        fields = [
            "id",
            "name",
            "description",
            "category",
            "category_name",
            "price",
            "stock",
            "image_url",
        ]

    def get_image_url(self, obj):

        # Image przesłane przez Django Admin
        if obj.image:
            request = self.context.get("request")

            if request:
                return request.build_absolute_uri(obj.image.url)

            return obj.image.url

        # Dotychczasowy adres URL zdjęcia
        return obj.image_url or None

# ============================================================
# REJESTRACJA UŻYTKOWNIKA
# ============================================================

class RegisterSerializer(serializers.ModelSerializer):

    password = serializers.CharField(
        write_only=True,
        validators=[validate_password]
    )

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "password",
        ]

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)


# ============================================================
# POZYCJE ZAMÓWIENIA
# ============================================================

class OrderItemSerializer(serializers.ModelSerializer):

    product_name = serializers.CharField(
        source="product.name",
        read_only=True
    )

    class Meta:
        model = OrderItem

        fields = [
            "product",
            "product_name",
            "quantity",
            "unit_price",
        ]


# ============================================================
# HISTORIA ZAMÓWIEŃ
# ============================================================

class OrderSerializer(serializers.ModelSerializer):

    items = OrderItemSerializer(
        many=True,
        read_only=True
    )

    class Meta:
        model = Order

        fields = [
            "id",
            "created_at",
            "shipping_address",
            "total",
            "status",
            "items",
            "shipping_method",
            "shipping_cost",
            "pickup_point",
        ]


# ============================================================
# PRODUKTY PRZEKAZYWANE DO CHECKOUT
# ============================================================

class CheckoutItemSerializer(serializers.Serializer):

    product_id = serializers.IntegerField(
        min_value=1
    )

    quantity = serializers.IntegerField(
        min_value=1,
        max_value=100
    )


# ============================================================
# FINALIZACJA ZAMÓWIENIA
# ============================================================

class CheckoutSerializer(serializers.Serializer):

    # Adres skopiowany do zamówienia
    # Może pochodzić z zapisanej książki adresowej
    shipping_address = serializers.CharField(
        max_length=1000,
        required=False,
        allow_blank=False
    )

    # Identyfikator zapisanego adresu
    shipping_address_id = serializers.IntegerField(
        min_value=1,
        required=False
    )

    # Wybrana metoda dostawy
    shipping_method_id = serializers.IntegerField(
        min_value=1
    )

    # Automat paczkowy lub punkt odbioru
    pickup_point = serializers.CharField(
        max_length=150,
        required=False,
        allow_blank=True,
        default=""
    )

    items = CheckoutItemSerializer(
        many=True,
        allow_empty=False
    )

    def validate_items(self, items):

        ids = [
            item["product_id"]
            for item in items
        ]

        if len(ids) != len(set(ids)):
            raise serializers.ValidationError(
                "Duplicate product in order."
            )

        return items

    def validate(self, attrs):

        if not (
            attrs.get("shipping_address") or
            attrs.get("shipping_address_id")
        ):
            raise serializers.ValidationError({
                "shipping_address":
                    "Wybierz zapisany adres lub podaj nowy."
            })

        return attrs


# ============================================================
# METODY DOSTAWY
# ============================================================

class ShippingMethodSerializer(serializers.ModelSerializer):

    carrier_name = serializers.CharField(
        source="carrier.name",
        read_only=True
    )

    delivery_type_label = serializers.CharField(
        source="get_delivery_type_display",
        read_only=True
    )

    class Meta:
        model = ShippingMethod

        fields = [
            "id",
            "carrier",
            "carrier_name",
            "name",
            "delivery_type",
            "delivery_type_label",
            "price",
        ]


# ============================================================
# ZAPISANE ADRESY DOSTAWY UŻYTKOWNIKA
# ============================================================

class ShippingAddressSerializer(serializers.ModelSerializer):

    class Meta:
        model = ShippingAddress

        fields = [
            "id",
            "name",
            "full_name",
            "street",
            "house_number",
            "apartment_number",
            "postal_code",
            "city",
            "phone",
            "is_default",
        ]

        read_only_fields = ["id"]

    def validate_postal_code(self, value):

        value = value.strip()

        if not re.fullmatch(r"\d{2}-\d{3}", value):
            raise serializers.ValidationError(
                "Postal code must have the format 00-000."
            )

        return value
