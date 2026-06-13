from django.db import models


class Trip(models.Model):
    """A persisted trip request + the computed plan (handy for history/debugging)."""

    current_location = models.CharField(max_length=255)
    pickup_location = models.CharField(max_length=255)
    dropoff_location = models.CharField(max_length=255)
    current_cycle_used = models.FloatField()
    start_date = models.DateField(null=True, blank=True)

    total_distance_miles = models.FloatField(null=True, blank=True)
    total_drive_hours = models.FloatField(null=True, blank=True)
    num_days = models.IntegerField(null=True, blank=True)
    plan = models.JSONField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.pickup_location} -> {self.dropoff_location} ({self.created_at:%Y-%m-%d})"
