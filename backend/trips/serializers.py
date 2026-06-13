from rest_framework import serializers


class TripInputSerializer(serializers.Serializer):
    current_location = serializers.CharField(max_length=255)
    pickup_location = serializers.CharField(max_length=255)
    dropoff_location = serializers.CharField(max_length=255)
    current_cycle_used = serializers.FloatField(min_value=0, max_value=70)
    start_date = serializers.DateField(required=False)

    def validate_current_location(self, v):
        return v.strip()

    def validate_pickup_location(self, v):
        return v.strip()

    def validate_dropoff_location(self, v):
        return v.strip()
