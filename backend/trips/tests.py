from datetime import date

from django.test import TestCase

from .hos import (
    simulate, DRIVING,
    MAX_DRIVE_PER_WINDOW, MAX_WINDOW,
)
from .logsheet import build_log_sheets


def _drive_leg(miles):
    return [{"type": "drive", "miles": miles, "label": "Drive"}]


class HOSEngineTests(TestCase):
    def test_short_trip_single_day_no_reset(self):
        # ~3 hours of driving: well within limits, no rests needed.
        result = simulate(_drive_leg(165), current_cycle_used=0)
        self.assertAlmostEqual(result.total_drive_hours, 3.0, places=2)
        self.assertEqual(
            sum(1 for s in result.segments if s.label == "10-hour rest (reset)"), 0
        )

    def test_never_exceeds_11_hours_driving_per_window(self):
        result = simulate(_drive_leg(2000), current_cycle_used=0)
        window_drive = 0.0
        for seg in result.segments:
            if seg.status == DRIVING:
                window_drive += seg.duration
            elif seg.label in ("10-hour rest (reset)", "34-hour restart"):
                self.assertLessEqual(round(window_drive, 3), MAX_DRIVE_PER_WINDOW)
                window_drive = 0.0
        self.assertLessEqual(round(window_drive, 3), MAX_DRIVE_PER_WINDOW)

    def test_30_minute_break_inserted_after_8h_driving(self):
        result = simulate(_drive_leg(500), current_cycle_used=0)
        breaks = [s for s in result.segments if s.label == "30-minute break"]
        self.assertGreaterEqual(len(breaks), 1)
        run = 0.0
        for seg in result.segments:
            if seg.status == DRIVING:
                run += seg.duration
            else:
                self.assertLessEqual(round(run, 3), 8.0)
                run = 0.0

    def test_fuel_stop_every_1000_miles(self):
        result = simulate(_drive_leg(2500), current_cycle_used=0)
        fuels = [s for s in result.segments if s.label == "Fuel stop"]
        self.assertEqual(len(fuels), 2)  # boundaries at 1000 and 2000

    def test_cycle_limit_triggers_34h_restart(self):
        result = simulate(_drive_leg(1500), current_cycle_used=65)
        restarts = [s for s in result.segments if s.label == "34-hour restart"]
        self.assertGreaterEqual(len(restarts), 1)

    def test_window_never_exceeds_14_hours_of_driving_span(self):
        result = simulate(_drive_leg(1500), current_cycle_used=0)
        window_start = None
        last_drive_end = None
        for seg in result.segments:
            if seg.status == DRIVING:
                if window_start is None:
                    window_start = seg.start
                last_drive_end = seg.end
            elif seg.label in ("10-hour rest (reset)", "34-hour restart"):
                if window_start is not None and last_drive_end is not None:
                    self.assertLessEqual(
                        round(last_drive_end - window_start, 3), MAX_WINDOW
                    )
                window_start = None
                last_drive_end = None

    def test_segments_are_contiguous(self):
        result = simulate(_drive_leg(1200), current_cycle_used=0)
        for a, b in zip(result.segments, result.segments[1:]):
            self.assertAlmostEqual(a.end, b.start, places=6)


class LogSheetTests(TestCase):
    def test_each_day_totals_24_hours(self):
        result = simulate(
            legs=[
                {"type": "drive", "miles": 600, "label": "Drive to pickup"},
                {"type": "onduty", "hours": 1.0, "label": "Pickup"},
                {"type": "drive", "miles": 600, "label": "Drive to dropoff"},
                {"type": "onduty", "hours": 1.0, "label": "Dropoff"},
            ],
            current_cycle_used=0,
        )
        days = build_log_sheets(result.segments, date(2024, 1, 1))
        self.assertGreater(len(days), 1)
        for day in days:
            self.assertAlmostEqual(day["totals"]["total"], 24.0, places=1)

    def test_total_miles_match_distance(self):
        miles = 700
        result = simulate(_drive_leg(miles), current_cycle_used=0)
        days = build_log_sheets(result.segments, date(2024, 1, 1))
        total_logged = sum(d["totals"]["miles"] for d in days)
        self.assertAlmostEqual(total_logged, miles, delta=1.0)
